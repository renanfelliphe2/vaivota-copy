import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { PRESETS_TEMA } from "@/dominio/presetsTema";
import { db } from "./db";
import { normalizarEmailAdmin } from "./participacao";

// ST0: seed idempotente dos eventos (Maratona Tech Tivit e Festival Ver e Fazer Filmes) e o `promover-admin`. Rodar de novo NUNCA desfaz o que já existe: se o
// evento já foi ativado, a urna já abriu ou o admin já mudou o tema, nada disso volta ao padrão (só cria o que falta).

export type OpcoesSemente = {
  slug?: string;
  nome?: string;
  descricao?: string;
  local?: string;
  /** ISO 8601 com offset. */
  janelaInicio?: string;
  janelaFim?: string;
  /** Só no Festival: link do trailer da cerimônia (YouTube ou Vimeo). Sem ele, o telão usa o trailer gerado. */
  trailerUrl?: string;
};

/** Tudo o que o seed grava de um evento novo. Rodar de novo só cria o que falta e nunca muda o que já existe. */
type DefinicaoEvento = {
  slug: string;
  nome: string;
  descricao: string;
  local: string | null;
  linkSobre: string | null;
  janelaInicio: string;
  janelaFim: string;
  modulos: { juri: boolean; infantil: boolean };
  bloquearVotoProprio: boolean;
  tema: {
    /** Id em `PRESETS_TEMA`. */
    preset: string;
    nomeExibicao: string | null;
    logoUrl: string | null;
    rotuloCandidato: string;
    rotuloCandidatos: string;
    textosEstado: Prisma.InputJsonObject;
  };
  placar: { pesoPopular: number; pesoJuri: number; pesoInfantil: number; regraDesempate: "JURI" | "PUBLICO" };
  /** null: os padrões do banco. */
  apresentacao: { modoAvanco: "AUTOMATICO" | "MANUAL"; trailerUrl: string | null; usarTrailerGerado: boolean } | null;
  campos: { chave: string; rotulo: string }[];
  /** Só na criação do evento: o admin edita estas listas depois, e rodar o seed de novo não pode trazê-las de volta. */
  criterios: string[];
  parceiros: { nome: string; logoUrl: string }[];
};

const MARATONA = {
  slug: "maratona-tech-tivit",
  nome: "Maratona Tech Tivit",
  descricao: "Vote no seu projeto favorito da Maratona Tech Tivit. Um voto por pessoa, e o voto é secreto.",
  // Dia e hora exatos a confirmar (pendência 1 do planner): ajuste pela tela Geral ou por SEED_JANELA_*.
  janelaInicio: "2026-10-19T08:00:00-03:00",
  janelaFim: "2026-10-19T22:00:00-03:00",
};

const TEXTOS_ESTADO_MARATONA = {
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

const FESTIVAL = {
  slug: "ver-e-fazer-filmes",
  nome: "9º Festival Ver e Fazer Filmes",
  descricao:
    "Uma plataforma feita para o público viver o concurso de curtas-metragens de pertinho: assista, vote e acompanhe seus favoritos em tempo real.",
  janelaInicio: "2026-11-25T10:00:00-03:00",
  janelaFim: "2026-11-28T20:00:00-03:00",
};

const TEXTOS_ESTADO_FESTIVAL = {
  NAO_INICIADA: {
    titulo: "A votação abre durante o festival",
    corpo: "Crie sua conta agora. Quando as sessões começarem, é só voltar aqui para escolher seu curta favorito.",
  },
  ENCERRADA: {
    titulo: "Votação encerrada",
    corpo: "Obrigado por participar! O resultado será revelado na cerimônia de encerramento do festival.",
  },
  JA_VOTOU: { titulo: "Seu voto está registrado", corpo: "Obrigado por fazer parte do festival!" },
  SUCESSO: {
    titulo: "Voto confirmado!",
    corpo: "Obrigado por fazer parte do festival. Acompanhe a revelação na cerimônia de encerramento.",
  },
} satisfies Prisma.InputJsonObject;

/** Critérios do júri do Festival (documento de requisitos, §3.3). */
const CRITERIOS_FESTIVAL = ["Direção", "Roteiro", "Fotografia", "Som"];

/** Logos em `public/parceiros`: o seed grava o caminho; o admin troca pelo upload quando quiser. */
const PARCEIROS_FESTIVAL = [
  { nome: "Instituto Cidade de Cataguases", logoUrl: "/parceiros/instituto-cidade-de-cataguases.png" },
  { nome: "Instituto Fábrica do Futuro", logoUrl: "/parceiros/instituto-fabrica-do-futuro.png" },
  { nome: "Animaparque", logoUrl: "/parceiros/animaparque.png" },
  { nome: "Instituto Energisa", logoUrl: "/parceiros/instituto-energisa.png" },
  { nome: "Energisa", logoUrl: "/parceiros/energisa.png" },
  { nome: "Cultura e Turismo de Minas Gerais", logoUrl: "/parceiros/cultura-e-turismo-mg.png" },
];

async function semearEvento(def: DefinicaoEvento): Promise<{ eventoId: string; criado: boolean }> {
  const preset = PRESETS_TEMA.find((p) => p.id === def.tema.preset);
  if (!preset) throw new Error(`Preset de tema "${def.tema.preset}" não encontrado.`);
  const existia = await db().evento.findUnique({ where: { slug: def.slug }, select: { id: true } });

  const evento = await db().evento.upsert({
    where: { slug: def.slug },
    update: {},
    create: {
      slug: def.slug,
      nome: def.nome,
      descricao: def.descricao,
      local: def.local,
      linkSobre: def.linkSobre,
      fusoHorario: "America/Sao_Paulo",
      estado: "RASCUNHO",
      estadoUrna: "NAO_INICIADA",
      janelaInicio: new Date(def.janelaInicio),
      janelaFim: new Date(def.janelaFim),
      // A urna só fecha pelo admin (decisão 5): nada fecha sozinho.
      encerramentoAutomatico: false,
      metodoIdentificacao: "GOOGLE_OU_EMAIL",
      moduloJuri: def.modulos.juri,
      moduloInfantil: def.modulos.infantil,
      bloquearVotoProprio: def.bloquearVotoProprio,
      prazoAnonimizacaoDias: 90,
    },
  });

  await db().tema.upsert({
    where: { eventoId: evento.id },
    update: {},
    create: {
      eventoId: evento.id,
      nomeExibicao: def.tema.nomeExibicao,
      logoUrl: def.tema.logoUrl,
      corPrimaria: preset.paleta.corPrimaria,
      corSecundaria: preset.paleta.corSecundaria,
      corFundo: preset.paleta.corFundo,
      corTexto: preset.paleta.corTexto,
      fonte: preset.fonte,
      rotuloCandidato: def.tema.rotuloCandidato,
      rotuloCandidatos: def.tema.rotuloCandidatos,
      textosEstado: def.tema.textosEstado,
    },
  });
  await db().configPlacar.upsert({
    where: { eventoId: evento.id },
    update: {},
    create: { eventoId: evento.id, ...def.placar },
  });
  await db().configApresentacao.upsert({
    where: { eventoId: evento.id },
    update: {},
    create: { eventoId: evento.id, ...(def.apresentacao ?? {}) },
  });

  for (const [ordem, campo] of def.campos.entries()) {
    await db().campoCandidato.upsert({
      where: { eventoId_chave: { eventoId: evento.id, chave: campo.chave } },
      update: {},
      create: { eventoId: evento.id, chave: campo.chave, rotulo: campo.rotulo, ordem: ordem + 1 },
    });
  }

  if (!existia) {
    if (def.criterios.length)
      await db().criterioJuri.createMany({ data: def.criterios.map((nome, i) => ({ eventoId: evento.id, nome, ordem: i + 1 })) });
    if (def.parceiros.length)
      await db().parceiro.createMany({ data: def.parceiros.map((p, i) => ({ eventoId: evento.id, nome: p.nome, logoUrl: p.logoUrl, ordem: i + 1 })) });
  }
  return { eventoId: evento.id, criado: !existia };
}

export async function semearMaratonaTechTivit(opcoes: OpcoesSemente = {}): Promise<{ eventoId: string; criado: boolean }> {
  const nome = opcoes.nome ?? MARATONA.nome;
  return semearEvento({
    slug: opcoes.slug ?? MARATONA.slug,
    nome,
    descricao: opcoes.descricao ?? MARATONA.descricao,
    local: opcoes.local ?? null,
    linkSobre: null,
    janelaInicio: opcoes.janelaInicio ?? MARATONA.janelaInicio,
    janelaFim: opcoes.janelaFim ?? MARATONA.janelaFim,
    modulos: { juri: false, infantil: false },
    // Pode votar em si mesmo: não é preciso vincular usuários a projetos (decisão 3).
    bloquearVotoProprio: false,
    tema: {
      preset: "maratona-tivit",
      nomeExibicao: nome,
      logoUrl: null,
      rotuloCandidato: "Projeto",
      rotuloCandidatos: "Projetos",
      textosEstado: TEXTOS_ESTADO_MARATONA,
    },
    // Só o público conta: 100/0/0. Sem júri, o desempate efetivo já é pelo público; sem regra extra, empate = posição compartilhada.
    placar: { pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" },
    apresentacao: null,
    campos: [
      { chave: "descricao", rotulo: "Descrição" },
      { chave: "equipe", rotulo: "Equipe" },
      { chave: "tecnologias", rotulo: "Tecnologias" },
    ],
    criterios: [],
    parceiros: [],
  });
}

/**
 * 9º Festival Ver e Fazer Filmes (25 a 28/11/2026): júri e voto infantil ligados, tema do festival, os quatro critérios do júri e os
 * parceiros. Nasce em RASCUNHO. Os pesos (50 público, 30 júri, 20 infantil) são provisórios: a decisão está em aberto
 * (docs/DECISOES-PENDENTES.md), e o admin ajusta em Configuração > Placar. A forma de votação do júri nasce em voto único; o admin
 * escolhe em Configuração > Júri. Sem `trailerUrl` o telão usa o trailer gerado (não há tela para configurar o link).
 */
export async function semearFestivalVerEFazerFilmes(opcoes: OpcoesSemente = {}): Promise<{ eventoId: string; criado: boolean }> {
  return semearEvento({
    slug: opcoes.slug ?? FESTIVAL.slug,
    nome: opcoes.nome ?? FESTIVAL.nome,
    descricao: opcoes.descricao ?? FESTIVAL.descricao,
    local: opcoes.local ?? "Cataguases · MG",
    linkSobre: "https://festivalverefazerfilmes.org.br/",
    janelaInicio: opcoes.janelaInicio ?? FESTIVAL.janelaInicio,
    janelaFim: opcoes.janelaFim ?? FESTIVAL.janelaFim,
    modulos: { juri: true, infantil: true },
    bloquearVotoProprio: true,
    tema: {
      preset: "festival",
      nomeExibicao: null,
      logoUrl: "/festival-ver-e-fazer-filmes-logo.webp",
      rotuloCandidato: "Curta",
      rotuloCandidatos: "Curtas",
      textosEstado: TEXTOS_ESTADO_FESTIVAL,
    },
    placar: { pesoPopular: 50, pesoJuri: 30, pesoInfantil: 20, regraDesempate: "JURI" },
    apresentacao: { modoAvanco: "MANUAL", trailerUrl: opcoes.trailerUrl?.trim() || null, usarTrailerGerado: !opcoes.trailerUrl?.trim() },
    campos: [
      { chave: "descricao", rotulo: "Descrição" },
      { chave: "direcao", rotulo: "Direção" },
      { chave: "duracao", rotulo: "Duração" },
    ],
    criterios: CRITERIOS_FESTIVAL,
    parceiros: PARCEIROS_FESTIVAL,
  });
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
