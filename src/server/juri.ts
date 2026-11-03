import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import {
  NOTA_MAXIMA,
  NOTA_MINIMA,
  ehModoPorCriterio,
  MODOS_VOTO_JURI,
  notaValida,
  type AvaliacaoJurado,
  type DadosAvaliacaoJuri,
} from "@/dominio/avaliacaoJuri";
import { redistribuirPesos } from "@/dominio/placar";
import type { ModoVotoJuri, ResultadoEnvioVoto } from "@/dominio/tipos";
import { exigirAcao } from "@/dominio/travas";
import { validarCriteriosJuri } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "./auditoria";
import { db, type Transacao } from "./db";
import { comEventoTravado } from "./eventoTravado";
import { invalidarEstadoPublico } from "./estadoPublico";
import { hashDoIp } from "./ip";
import { consumirEmMemoria } from "./limites";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Festival: voto do júri. Identificado (ligado à participação do jurado) e alterável enquanto a urna estiver aberta, em três
// modos escolhidos pelo admin: voto único, notas por critério (0 a 10) e melhor candidato por critério. Todo envio roda numa
// transação com a linha do evento travada em modo compartilhado (o encerramento espera os envios em andamento e nenhum entra
// depois dele) e com a participação do jurado travada para escrita (os envios simultâneos do mesmo jurado se enfileiram).
// Salvar é idempotente: repetir o mesmo envio devolve SEM_ALTERACAO, então tentar de novo depois de erro de rede é seguro.

const ENVIOS_POR_JURADO_POR_MINUTO = 120;
const ENVIOS_POR_IP_POR_MINUTO = 6000;

type CriterioLinha = { id: string; nome: string; ordem: number };

type ContextoJurado = {
  eventoId: string;
  usuarioId: string;
  participacaoId: string;
  modo: ModoVotoJuri;
  criterios: CriterioLinha[];
  ipHash: string;
};

type LinhaEvento = { id: string; estado: string; estado_urna: string; modulo_juri: boolean; bloquear_voto_proprio: boolean };

/**
 * Valida tudo na ordem do voto popular (sessão, evento, e-mail, participação e papel, urna, modo, candidato) DENTRO da
 * transação, já com as travas, e só então chama `aplicar`. Qualquer recusa devolve o `Resultado` sem ter escrito nada.
 */
async function comoJurado<T>(
  usuario: UsuarioSessao | null,
  ctx: { ip: string },
  entrada: { eventoId: string; candidatoId: string },
  modoEsperado: ModoVotoJuri,
  nome: string,
  aplicar: (tx: Transacao, c: ContextoJurado, candidatoId: string) => Promise<Resultado<T>>,
): Promise<Resultado<T>> {
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: `${nome} sem sessão` });
  if (
    !consumirEmMemoria(`juri:${usuario.id}`, ENVIOS_POR_JURADO_POR_MINUTO, 60_000) ||
    !consumirEmMemoria(`juri-ip:${ctx.ip}`, ENVIOS_POR_IP_POR_MINUTO, 60_000)
  )
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  if (!usuario.emailVerificado) return falha("EMAIL_NAO_VERIFICADO");

  try {
    return await db().$transaction(async (tx) => {
      const linhas = await tx.$queryRaw<LinhaEvento[]>`
        SELECT id, estado::text AS estado, estado_urna::text AS estado_urna, modulo_juri, bloquear_voto_proprio
        FROM evento WHERE id = ${entrada.eventoId} FOR SHARE`;
      const evento = linhas[0];
      if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
      if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
      if (evento.estado === "RASCUNHO") return falha("EVENTO_INDISPONIVEL");

      const participacoes = await tx.$queryRaw<{ id: string; papel: string }[]>`
        SELECT id, papel::text AS papel FROM participacao WHERE usuario_id = ${usuario.id} AND evento_id = ${evento.id} FOR UPDATE`;
      const participacao = participacoes[0];
      // O envio nunca cria participação (C2): sem ela, o acesso não foi concluído.
      if (!participacao) return falha("NAO_AUTORIZADO", { detalhe: `${nome} sem participação de ${usuario.id} em ${evento.id}` });
      if (participacao.papel !== "JURADO" || !evento.modulo_juri)
        return falha("PAPEL_INVALIDO", { detalhe: `${nome} com papel ${participacao.papel}, módulo júri ${evento.modulo_juri}` });

      if (evento.estado_urna === "NAO_INICIADA") return falha("URNA_NAO_ABERTA");
      if (evento.estado_urna === "ENCERRADA") return falha("URNA_ENCERRADA");

      const placar = await tx.configPlacar.findUnique({ where: { eventoId: evento.id }, select: { modoVotoJuri: true } });
      if (!placar) return falha("NAO_ENCONTRADO", { detalhe: `evento ${evento.id} sem ConfigPlacar` });
      if (placar.modoVotoJuri !== modoEsperado)
        return falha("MODO_JURI_DIFERENTE", { detalhe: `${nome} esperava ${modoEsperado}, evento em ${placar.modoVotoJuri}` });

      const candidato = await tx.candidato.findFirst({
        where: { id: entrada.candidatoId, eventoId: evento.id, publicado: true, desqualificado: false },
        select: { id: true, usuarioVinculadoId: true },
      });
      if (!candidato) return falha("CANDIDATO_INDISPONIVEL", { detalhe: `candidato ${entrada.candidatoId} não votável em ${evento.id}` });
      if (evento.bloquear_voto_proprio && candidato.usuarioVinculadoId === usuario.id) return falha("VOTO_PROPRIO");

      const criterios = ehModoPorCriterio(modoEsperado)
        ? await tx.criterioJuri.findMany({ where: { eventoId: evento.id }, orderBy: [{ ordem: "asc" }, { id: "asc" }], select: { id: true, nome: true, ordem: true } })
        : [];
      return aplicar(
        tx,
        { eventoId: evento.id, usuarioId: usuario.id, participacaoId: participacao.id, modo: modoEsperado, criterios, ipHash: hashDoIp(ctx.ip) },
        candidato.id,
      );
    });
  } catch (e) {
    return falhaInterna(e, nome);
  }
}

async function auditarEnvio(
  tx: Transacao,
  c: ContextoJurado,
  alterado: boolean,
  entidade: "voto_juri" | "nota_juri" | "escolha_juri",
  entidadeId: string,
  detalhes: Record<string, unknown>,
): Promise<void> {
  await registrarAuditoria(tx, {
    eventoId: c.eventoId,
    usuarioId: c.usuarioId,
    acao: alterado ? "VOTO_JURI_ALTERADO" : "VOTO_JURI_REGISTRADO",
    entidade,
    entidadeId,
    detalhes,
    ipHash: c.ipHash,
  });
}

// ─────────────────────────────────────────────
// Voto único
// ─────────────────────────────────────────────

export async function votarJuri(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string; candidatoId: string },
  ctx: { ip: string },
): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  return comoJurado<{ resultado: ResultadoEnvioVoto }>(usuario, ctx, entrada, "VOTO_UNICO", "votarJuri", async (tx, c, candidatoId) => {
    const existente = await tx.votoJuri.findUnique({ where: { participacaoId_eventoId: { participacaoId: c.participacaoId, eventoId: c.eventoId } } });
    if (existente?.candidatoId === candidatoId) return sucesso({ resultado: "SEM_ALTERACAO" as const });

    const voto = existente
      ? await tx.votoJuri.update({ where: { id: existente.id }, data: { candidatoId } })
      : await tx.votoJuri.create({ data: { eventoId: c.eventoId, participacaoId: c.participacaoId, candidatoId } });
    const historico = await tx.historicoVotoJuri.create({
      data: { votoJuriId: voto.id, candidatoAnteriorId: existente?.candidatoId ?? null, candidatoNovoId: candidatoId },
    });
    await tx.participacao.update({ where: { id: c.participacaoId }, data: { votou: true } });
    await auditarEnvio(tx, c, Boolean(existente), "voto_juri", voto.id, { historicoId: historico.id });
    return sucesso({ resultado: existente ? ("ATUALIZADO" as const) : ("REGISTRADO" as const) });
  });
}

// ─────────────────────────────────────────────
// Notas por critério
// ─────────────────────────────────────────────

export type EntradaNotasJuri = { eventoId: string; candidatoId: string; notas: Record<string, number> };

/** Notas de 0 a 10 do jurado da sessão a um candidato, em TODOS os critérios do evento (parcial é recusado). */
export async function avaliarCandidatoJuri(
  usuario: UsuarioSessao | null,
  entrada: EntradaNotasJuri,
  ctx: { ip: string },
): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  return comoJurado<{ resultado: ResultadoEnvioVoto }>(usuario, ctx, entrada, "NOTAS_POR_CRITERIO", "avaliarCandidatoJuri", async (tx, c, candidatoId) => {
    const campos: Record<string, string> = {};
    for (const criterio of c.criterios) if (!notaValida(entrada.notas[criterio.id])) campos[criterio.id] = `Escolha uma nota de ${NOTA_MINIMA} a ${NOTA_MAXIMA}.`;
    const sobrando = Object.keys(entrada.notas).filter((id) => !c.criterios.some((criterio) => criterio.id === id));
    if (c.criterios.length === 0 || Object.keys(campos).length > 0 || sobrando.length > 0)
      return falha("VALIDACAO", { campos, detalhe: `notas inválidas ou critérios desconhecidos (${sobrando.join(", ")})` });

    const linhas = await tx.notaJuri.findMany({ where: { participacaoId: c.participacaoId, candidatoId } });
    const atuais = new Map(linhas.map((l) => [l.criterioId, l]));
    const notas = Object.fromEntries(c.criterios.map((criterio) => [criterio.id, entrada.notas[criterio.id]]));
    const alterado = c.criterios.some((criterio) => atuais.has(criterio.id));
    if (c.criterios.every((criterio) => atuais.get(criterio.id)?.nota === notas[criterio.id])) return sucesso({ resultado: "SEM_ALTERACAO" as const });

    const novas: Prisma.NotaJuriCreateManyInput[] = [];
    for (const criterio of c.criterios) {
      const atual = atuais.get(criterio.id);
      if (!atual) novas.push({ eventoId: c.eventoId, participacaoId: c.participacaoId, candidatoId, criterioId: criterio.id, nota: notas[criterio.id] });
      else if (atual.nota !== notas[criterio.id]) await tx.notaJuri.update({ where: { id: atual.id }, data: { nota: notas[criterio.id] } });
    }
    if (novas.length) await tx.notaJuri.createMany({ data: novas });
    await tx.participacao.update({ where: { id: c.participacaoId }, data: { votou: true } });
    const de = alterado ? Object.fromEntries(c.criterios.filter((criterio) => atuais.has(criterio.id)).map((criterio) => [criterio.id, atuais.get(criterio.id)!.nota])) : null;
    await auditarEnvio(tx, c, alterado, "nota_juri", candidatoId, { modo: "NOTAS_POR_CRITERIO", candidatoId, de, para: notas });
    return sucesso({ resultado: alterado ? ("ATUALIZADO" as const) : ("REGISTRADO" as const) });
  });
}

// ─────────────────────────────────────────────
// Melhor candidato por critério
// ─────────────────────────────────────────────

export type EntradaEscolhasJuri = { eventoId: string; candidatoId: string; criterioIds: string[] };

/**
 * Critérios em que o candidato é o melhor para o jurado da sessão. Marcar um critério substitui quem era o melhor nele;
 * desmarcar um critério em que ele era o melhor deixa o critério sem escolha.
 */
export async function escolherMelhoresJuri(
  usuario: UsuarioSessao | null,
  entrada: EntradaEscolhasJuri,
  ctx: { ip: string },
): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  return comoJurado<{ resultado: ResultadoEnvioVoto }>(usuario, ctx, entrada, "MELHOR_POR_CRITERIO", "escolherMelhoresJuri", async (tx, c, candidatoId) => {
    const pedidos = [...new Set(entrada.criterioIds)];
    if (c.criterios.length === 0 || pedidos.some((id) => !c.criterios.some((criterio) => criterio.id === id)))
      return falha("VALIDACAO", { detalhe: `critérios desconhecidos: ${pedidos.join(", ")}` });

    const linhas = await tx.escolhaCriterioJuri.findMany({ where: { participacaoId: c.participacaoId } });
    const escolhas = new Map(linhas.map((l) => [l.criterioId, l]));
    const antes = c.criterios.filter((criterio) => escolhas.get(criterio.id)?.candidatoId === candidatoId).map((criterio) => criterio.id);
    const depois = c.criterios.filter((criterio) => pedidos.includes(criterio.id)).map((criterio) => criterio.id);
    if (antes.length === depois.length && antes.every((id) => depois.includes(id))) return sucesso({ resultado: "SEM_ALTERACAO" as const });

    const substituidos: Record<string, string> = {};
    for (const criterioId of depois) {
      const atual = escolhas.get(criterioId);
      if (atual?.candidatoId === candidatoId) continue;
      if (atual) {
        substituidos[criterioId] = atual.candidatoId;
        await tx.escolhaCriterioJuri.update({ where: { id: atual.id }, data: { candidatoId } });
      } else {
        await tx.escolhaCriterioJuri.create({ data: { eventoId: c.eventoId, participacaoId: c.participacaoId, criterioId, candidatoId } });
      }
    }
    // Critério em que ele era o melhor e foi desmarcado: fica sem escolha.
    const desmarcados = antes.filter((id) => !depois.includes(id));
    if (desmarcados.length) await tx.escolhaCriterioJuri.deleteMany({ where: { participacaoId: c.participacaoId, criterioId: { in: desmarcados } } });

    // Invariante 4: o jurado "votou" se tem voto único, nota ou escolha (qualquer modo).
    const [unico, notas, restantes] = await Promise.all([
      tx.votoJuri.count({ where: { participacaoId: c.participacaoId } }),
      tx.notaJuri.count({ where: { participacaoId: c.participacaoId } }),
      tx.escolhaCriterioJuri.count({ where: { participacaoId: c.participacaoId } }),
    ]);
    await tx.participacao.update({ where: { id: c.participacaoId }, data: { votou: unico + notas + restantes > 0 } });

    const alterado = antes.length > 0;
    await auditarEnvio(tx, c, alterado, "escolha_juri", candidatoId, { modo: "MELHOR_POR_CRITERIO", candidatoId, de: antes, para: depois, substituidos });
    return sucesso({ resultado: alterado ? ("ATUALIZADO" as const) : ("REGISTRADO" as const) });
  });
}

// ─────────────────────────────────────────────
// Leitura da própria avaliação
// ─────────────────────────────────────────────

export type AvaliacaoJuriVisao = { modo: ModoVotoJuri; avaliacao: AvaliacaoJurado };

/** Notas e escolhas do jurado da sessão (para a lista e a tela de avaliação). Fora do papel JURADO, a avaliação vem vazia. */
export async function consultarAvaliacaoJuri(usuario: UsuarioSessao | null, entrada: { eventoId: string }): Promise<Resultado<AvaliacaoJuriVisao>> {
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: "consulta da avaliação sem sessão" });
  if (!consumirEmMemoria(`juri-consulta:${usuario.id}`, 240, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const evento = await db().evento.findUnique({ where: { id: entrada.eventoId }, select: { id: true, configPlacar: { select: { modoVotoJuri: true } } } });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    const modo = evento.configPlacar?.modoVotoJuri ?? "VOTO_UNICO";
    const vazia: AvaliacaoJurado = { notas: {}, escolhas: {} };
    const participacao = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      select: { id: true, papel: true },
    });
    if (!participacao || participacao.papel !== "JURADO") return sucesso({ modo, avaliacao: vazia });

    const [notas, escolhas] = await Promise.all([
      db().notaJuri.findMany({ where: { participacaoId: participacao.id }, select: { candidatoId: true, criterioId: true, nota: true } }),
      db().escolhaCriterioJuri.findMany({ where: { participacaoId: participacao.id }, select: { criterioId: true, candidatoId: true } }),
    ]);
    const avaliacao: AvaliacaoJurado = { notas: {}, escolhas: {} };
    for (const n of notas) avaliacao.notas[n.candidatoId] = { ...avaliacao.notas[n.candidatoId], [n.criterioId]: n.nota };
    for (const e of escolhas) avaliacao.escolhas[e.criterioId] = e.candidatoId;
    return sucesso({ modo, avaliacao });
  } catch (e) {
    return falhaInterna(e, "consultarAvaliacaoJuri");
  }
}

// ─────────────────────────────────────────────
// Configuração (admin)
// ─────────────────────────────────────────────

/**
 * Modo de votação do júri e critérios de avaliação. Trava com a urna aberta, como o placar. Critério que já recebeu nota ou
 * escolha não é removido (votos nunca se apagam): o admin renomeia em vez de remover.
 */
export async function salvarAvaliacaoJuri(
  usuario: UsuarioSessao | null,
  eventoId: string,
  dados: DadosAvaliacaoJuri,
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "JURI_AVALIACAO");
  if (!trava.ok) return trava;
  if (!MODOS_VOTO_JURI.includes(dados.modoVotoJuri)) return falha("VALIDACAO", { campos: { modo: "Escolha a forma de votação." } });
  const campos = validarCriteriosJuri(
    dados.criterios.map((c) => c.nome),
    ehModoPorCriterio(dados.modoVotoJuri),
  );
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  const r = await comEventoTravado(eventoId, "JURI_AVALIACAO", async (tx) => {
    const placar = await tx.configPlacar.findUnique({ where: { eventoId } });
    if (!placar) return falha("NAO_ENCONTRADO");
    const atuais = await tx.criterioJuri.findMany({ where: { eventoId }, orderBy: [{ ordem: "asc" }, { id: "asc" }] });
    const doEvento = new Set(atuais.map((c) => c.id));
    const mantidos = new Set(dados.criterios.flatMap((c) => (c.id && doEvento.has(c.id) ? [c.id] : [])));
    const removidos = atuais.filter((c) => !mantidos.has(c.id));
    if (removidos.length) {
      const [notas, escolhas] = await Promise.all([
        tx.notaJuri.count({ where: { criterioId: { in: removidos.map((c) => c.id) } } }),
        tx.escolhaCriterioJuri.count({ where: { criterioId: { in: removidos.map((c) => c.id) } } }),
      ]);
      if (notas + escolhas > 0)
        return falha("CONFLITO", {
          mensagem: "Há jurados que já avaliaram por este critério. Renomeie o critério em vez de removê-lo.",
          detalhe: `critérios com avaliações: ${removidos.map((c) => c.id).join(", ")}`,
        });
      await tx.criterioJuri.deleteMany({ where: { id: { in: removidos.map((c) => c.id) } } });
    }
    for (const [i, c] of dados.criterios.entries()) {
      const nome = c.nome.trim();
      if (c.id && mantidos.has(c.id)) await tx.criterioJuri.update({ where: { id: c.id }, data: { nome, ordem: i + 1 } });
      else await tx.criterioJuri.create({ data: { eventoId, nome, ordem: i + 1 } });
    }
    await tx.configPlacar.update({ where: { eventoId }, data: { modoVotoJuri: dados.modoVotoJuri } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "config_juri",
      entidadeId: eventoId,
      detalhes: {
        de: { modoVotoJuri: placar.modoVotoJuri, criterios: atuais.map((c) => c.nome) },
        para: { modoVotoJuri: dados.modoVotoJuri, criterios: dados.criterios.map((c) => c.nome.trim()) },
      },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/**
 * Liga ou desliga o módulo júri. Muda o placar, então trava com a urna aberta, como os pesos. Ao ligar, o peso do júri fica em 0 e o
 * admin ajusta no Placar (o checklist cobra). Ao desligar, o peso do júri volta a 0 e o resto se redistribui (soma 100). Desligar só
 * vale sem convite resgatado (MODULO_JURI_DESLIGAR) e sem nenhum voto, nota ou escolha do júri: votos nunca se apagam, e deixá-los
 * fora do placar mudaria o resultado.
 */
export async function alternarModuloJuri(usuario: UsuarioSessao | null, eventoId: string, ligado: boolean, ctx: { ip: string }): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "PLACAR");
  if (!trava.ok) return trava;
  const { usuarioId } = admin.dados;

  const r = await comEventoTravado(eventoId, "PLACAR", async (tx, atual) => {
    if (atual.moduloJuri === ligado) return sucesso(null);
    const placar = await tx.configPlacar.findUnique({ where: { eventoId } });
    if (!placar) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} sem ConfigPlacar` });
    if (!ligado) {
      const conviteUsado = (await tx.conviteJurado.count({ where: { eventoId, estado: "USADO" } })) > 0;
      const permitido = exigirAcao(atual, "MODULO_JURI_DESLIGAR", { conviteUsado });
      if (!permitido.ok) return permitido;
      const [votos, notas, escolhas] = await Promise.all([
        tx.votoJuri.count({ where: { eventoId } }),
        tx.notaJuri.count({ where: { eventoId } }),
        tx.escolhaCriterioJuri.count({ where: { eventoId } }),
      ]);
      if (votos + notas + escolhas > 0)
        return falha("CONFLITO", { mensagem: "O júri já registrou votos. Desligue o módulo só se não houver nenhum." });
    }

    const de = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
    const para = redistribuirPesos(de, { POPULAR: true, JURI: ligado, INFANTIL: atual.moduloInfantil });
    await tx.evento.update({ where: { id: eventoId }, data: { moduloJuri: ligado } });
    await tx.configPlacar.update({ where: { eventoId }, data: { pesoPopular: para.POPULAR, pesoJuri: para.JURI, pesoInfantil: para.INFANTIL } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { campos: ["moduloJuri"], de: { moduloJuri: !ligado, pesos: de }, para: { moduloJuri: ligado, pesos: para } },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
