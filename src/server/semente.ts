import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { PRESETS_TEMA } from "@/dominio/presetsTema";
import { db } from "./db";
import { normalizarEmailAdmin } from "./participacao";

// ST0: seed idempotente do evento da Maratona Tech Tivit e o `promover-admin`. Rodar de novo NUNCA desfaz o que já existe: se o
// evento já foi ativado, a urna já abriu ou o admin já mudou o tema, nada disso volta ao padrão (só cria o que falta).

export type OpcoesSemente = {
  slug?: string;
  nome?: string;
  descricao?: string;
  local?: string;
  /** ISO 8601 com offset. */
  janelaInicio?: string;
  janelaFim?: string;
};

const PADRAO = {
  slug: "maratona-tech-tivit",
  nome: "Maratona Tech Tivit",
  descricao: "Vote no seu projeto favorito da Maratona Tech Tivit. Um voto por pessoa, e o voto é secreto.",
  // Dia e hora exatos a confirmar (pendência 1 do planner): ajuste pela tela Geral ou por SEED_JANELA_*.
  janelaInicio: "2026-10-19T08:00:00-03:00",
  janelaFim: "2026-10-19T22:00:00-03:00",
};

const TEXTOS_ESTADO = {
  NAO_INICIADA: {
    titulo: "A votação abre durante a Maratona Tech Tivit",
    corpo: "Crie sua conta agora. Quando a urna abrir, é só voltar aqui e escolher seu {rotulo} favorito.",
  },
  ENCERRADA: {
    titulo: "Votação encerrada",
    corpo: "Obrigado por votar! O resultado será divulgado pela organização da Maratona Tech Tivit.",
  },
  JA_VOTOU: { titulo: "Seu voto está registrado", corpo: "Obrigado por fazer parte da Maratona Tech Tivit!" },
  SUCESSO: {
    titulo: "Voto confirmado!",
    corpo: "Obrigado por votar. Acompanhe o anúncio do resultado com a organização da Maratona Tech Tivit.",
  },
} satisfies Prisma.InputJsonObject;

export async function semearMaratonaTechTivit(opcoes: OpcoesSemente = {}): Promise<{ eventoId: string; criado: boolean }> {
  const slug = opcoes.slug ?? PADRAO.slug;
  const escuro = PRESETS_TEMA.find((p) => p.id === "escuro")!;
  const existia = await db().evento.findUnique({ where: { slug }, select: { id: true } });

  const evento = await db().evento.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      nome: opcoes.nome ?? PADRAO.nome,
      descricao: opcoes.descricao ?? PADRAO.descricao,
      local: opcoes.local ?? null,
      fusoHorario: "America/Sao_Paulo",
      estado: "RASCUNHO",
      estadoUrna: "NAO_INICIADA",
      janelaInicio: new Date(opcoes.janelaInicio ?? PADRAO.janelaInicio),
      janelaFim: new Date(opcoes.janelaFim ?? PADRAO.janelaFim),
      // A urna só fecha pelo admin (decisão 5): nada fecha sozinho.
      encerramentoAutomatico: false,
      metodoIdentificacao: "GOOGLE_OU_EMAIL",
      moduloJuri: false,
      moduloInfantil: false,
      // Pode votar em si mesmo: não é preciso vincular usuários a projetos (decisão 3).
      bloquearVotoProprio: false,
      prazoAnonimizacaoDias: 90,
    },
  });

  await db().tema.upsert({
    where: { eventoId: evento.id },
    update: {},
    create: {
      eventoId: evento.id,
      nomeExibicao: opcoes.nome ?? PADRAO.nome,
      corPrimaria: escuro.paleta.corPrimaria,
      corSecundaria: escuro.paleta.corSecundaria,
      corFundo: escuro.paleta.corFundo,
      corTexto: escuro.paleta.corTexto,
      fonte: escuro.fonte,
      rotuloCandidato: "Projeto",
      rotuloCandidatos: "Projetos",
      textosEstado: TEXTOS_ESTADO,
    },
  });
  await db().configPlacar.upsert({
    where: { eventoId: evento.id },
    update: {},
    // Só o público conta: 100/0/0. Sem júri, o desempate efetivo já é pelo público; sem regra extra, empate = posição compartilhada.
    create: { eventoId: evento.id, pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" },
  });
  await db().configApresentacao.upsert({ where: { eventoId: evento.id }, update: {}, create: { eventoId: evento.id } });

  for (const [ordem, campo] of [
    { chave: "descricao", rotulo: "Descrição" },
    { chave: "equipe", rotulo: "Equipe" },
    { chave: "tecnologias", rotulo: "Tecnologias" },
  ].entries()) {
    await db().campoCandidato.upsert({
      where: { eventoId_chave: { eventoId: evento.id, chave: campo.chave } },
      update: {},
      create: { eventoId: evento.id, chave: campo.chave, rotulo: campo.rotulo, ordem: ordem + 1 },
    });
  }
  return { eventoId: evento.id, criado: !existia };
}

export type ResultadoPromocao = { acao: "promovido" | "ja_era_admin" | "convite_criado" | "convite_ja_existia"; email: string };

/**
 * Cria ou promove a participação ADMIN. Quem já tem conta vira admin na hora; quem ainda não tem recebe um convite de
 * admin, que vale quando a pessoa entrar com esse e-mail já verificado (src/server/participacao.ts).
 */
export async function promoverAdmin(slug: string, emailBruto: string): Promise<ResultadoPromocao> {
  const email = normalizarEmailAdmin(emailBruto);
  const evento = await db().evento.findUnique({ where: { slug }, select: { id: true } });
  if (!evento) throw new Error(`Evento "${slug}" não existe. Rode o seed antes.`);

  let usuario = await db().usuario.findUnique({ where: { email }, select: { id: true, emailVerificado: true } });
  if (usuario && !usuario.emailVerificado) {
    // Conta que NUNCA provou o e-mail: a senha dela pode ser de outra pessoa (cadastro feito com o e-mail alheio). Não se
    // dá poder de admin a ela: apaga a conta e vale o convite (o dono do e-mail cria a conta e prova o e-mail).
    const comParticipacao = await db().participacao.count({ where: { usuarioId: usuario.id } });
    if (comParticipacao > 0) throw new Error(`${email} tem uma conta com e-mail não confirmado e já com participação. Resolva à mão.`);
    await db().usuario.delete({ where: { id: usuario.id } });
    usuario = null;
  }
  if (usuario) {
    const atual = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      select: { papel: true, votou: true },
    });
    if (atual?.papel === "ADMIN") return { acao: "ja_era_admin", email };
    // Quem já votou como público não vira admin (o voto continuaria contado, mas a conta passaria a "não votar"): é preciso outra conta.
    if (atual?.votou) throw new Error(`${email} já votou como público neste evento. Use outra conta para administrar.`);
    await db().participacao.upsert({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      update: { papel: "ADMIN" },
      create: { usuarioId: usuario.id, eventoId: evento.id, papel: "ADMIN" },
    });
    return { acao: "promovido", email };
  }

  const convite = await db().conviteAdmin.findUnique({ where: { eventoId_email: { eventoId: evento.id, email } } });
  if (convite?.estado === "PENDENTE") return { acao: "convite_ja_existia", email };
  await db().conviteAdmin.upsert({
    where: { eventoId_email: { eventoId: evento.id, email } },
    update: { estado: "PENDENTE", resgatadoPorId: null, resgatadoEm: null },
    create: { eventoId: evento.id, email },
  });
  return { acao: "convite_criado", email };
}
