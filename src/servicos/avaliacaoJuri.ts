import {
  aplicarEscolhasJuri,
  aplicarNotasJuri,
  avaliacaoDoJurado,
  criteriosDoEvento,
  modoVotoJuriDoEvento,
  notaValida,
  type AvaliacaoJurado,
} from "@/dominio/avaliacaoJuri";
import type { EstadoApp, ModoVotoJuri, ResultadoEnvioVoto } from "@/dominio/tipos";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, acharEvento, instanteDoEvento, lerAmbiente } from "./apoio";
import { atraso, falha, registrarLog, simularFalha, sucesso, type Resultado } from "./resultado";
import { encerrarPorFalhaSimulada, inicioDoEnvio, validarCandidato, validarIdentidade, validarUrna, type Contexto } from "./votacao";

// Júri por critério (08/10/2026). Mesma ordem de validação do votarJuri (Etapa 5, seção 5.2) e mesmas falhas
// simuladas. Salvar é idempotente (substitui as notas ou escolhas do candidato): depois de erro de rede, tentar
// de novo é seguro e devolve SEM_ALTERACAO se já tinha gravado.

type Preparo = { ctx: Contexto; modoFalha: Awaited<ReturnType<typeof inicioDoEnvio>>["modo"] };

async function preparar(eventoId: string, candidatoId: string, modoEsperado: ModoVotoJuri): Promise<Resultado<Preparo>> {
  const { erro, modo } = await inicioDoEnvio();
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const id = validarIdentidade(estado, eventoId, "JURI");
  if (!id.ok) return id;
  const ctx = id.dados;
  if (modo === "URNA_ENCERRA" && ctx.evento.estadoUrna === "ABERTA") return encerrarPorFalhaSimulada(ctx.evento.id);
  const urna = validarUrna(ctx.evento);
  if (urna) return urna;
  if (modo === "JA_VOTOU_OUTRA_SESSAO") registrarLog("JA_VOTOU_OUTRA_SESSAO sem efeito na avaliação do júri (o jurado sempre pode substituir)");
  const modoJuri = modoVotoJuriDoEvento(estado.banco, ctx.evento.id);
  if (modoJuri !== modoEsperado) return falha("MODO_JURI_DIFERENTE", { detalhe: `esperado ${modoEsperado}, evento em ${modoJuri}` });
  const candidato = validarCandidato(ctx, candidatoId);
  if (!candidato.ok) return candidato;
  return sucesso({ ctx, modoFalha: modo });
}

function auditar(estado: EstadoApp, ctx: Contexto, agoraMs: number, alterado: boolean, detalhes: Record<string, unknown>, entidade: string) {
  return registrarAuditoria(estado, {
    eventoId: ctx.evento.id,
    usuarioId: ctx.usuario.id,
    acao: alterado ? "VOTO_JURI_ALTERADO" : "VOTO_JURI_REGISTRADO",
    entidade,
    entidadeId: String(detalhes.candidatoId),
    detalhes,
    ipHash: IP_HASH,
    criadoEm: instanteDoEvento(estado, ctx.evento.id, agoraMs),
  });
}

export type EntradaNotasJuri = { eventoId: string; candidatoId: string; notas: Record<string, number> };

/** Notas de 0 a 10 do jurado da sessão a um candidato, em todos os critérios do evento. */
export async function avaliarCandidatoJuri(entrada: EntradaNotasJuri): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const preparo = await preparar(entrada.eventoId, entrada.candidatoId, "NOTAS_POR_CRITERIO");
  if (!preparo.ok) return preparo;
  const { ctx, modoFalha } = preparo.dados;
  const { estado, agoraMs, store } = lerAmbiente();

  const criterios = criteriosDoEvento(estado.banco, ctx.evento.id);
  const campos: Record<string, string> = {};
  for (const c of criterios) if (!notaValida(entrada.notas[c.id])) campos[c.id] = "Escolha uma nota de 0 a 10.";
  const sobrando = Object.keys(entrada.notas).filter((id) => !criterios.some((c) => c.id === id));
  if (criterios.length === 0 || Object.keys(campos).length > 0 || sobrando.length > 0)
    return falha("VALIDACAO", { campos, detalhe: `notas inválidas ou critérios desconhecidos (${sobrando.join(", ")})` });

  const atuais = avaliacaoDoJurado(estado.banco, ctx.participacao.id, ctx.evento.id).notas[entrada.candidatoId];
  const notas = Object.fromEntries(criterios.map((c) => [c.id, entrada.notas[c.id]]));
  if (atuais && criterios.every((c) => atuais[c.id] === notas[c.id])) return sucesso({ resultado: "SEM_ALTERACAO" });

  const alterado = Boolean(atuais && Object.keys(atuais).length > 0);
  store.atualizar((e) =>
    auditar(
      aplicarNotasJuri(e, { eventoId: ctx.evento.id, participacaoId: ctx.participacao.id, candidatoId: entrada.candidatoId, notas, agoraMs }),
      ctx,
      agoraMs,
      alterado,
      { modo: "NOTAS_POR_CRITERIO", candidatoId: entrada.candidatoId, de: atuais ?? null, para: notas },
      "nota_juri",
    ),
  );
  if (modoFalha === "REDE_GRAVOU") return falha("REDE", { detalhe: "falha pontual REDE_GRAVOU: gravou e a resposta se perdeu" });
  return sucesso({ resultado: alterado ? "ATUALIZADO" : "REGISTRADO" });
}

export type EntradaEscolhasJuri = { eventoId: string; candidatoId: string; criterioIds: string[] };

/**
 * Critérios em que o candidato é o melhor para o jurado da sessão. Marca substitui quem era o melhor no critério;
 * desmarcar um critério em que ele era o melhor deixa o critério sem escolha.
 */
export async function escolherMelhoresJuri(entrada: EntradaEscolhasJuri): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const preparo = await preparar(entrada.eventoId, entrada.candidatoId, "MELHOR_POR_CRITERIO");
  if (!preparo.ok) return preparo;
  const { ctx, modoFalha } = preparo.dados;
  const { estado, agoraMs, store } = lerAmbiente();

  const criterios = criteriosDoEvento(estado.banco, ctx.evento.id);
  const pedidos = [...new Set(entrada.criterioIds)];
  if (criterios.length === 0 || pedidos.some((id) => !criterios.some((c) => c.id === id)))
    return falha("VALIDACAO", { detalhe: `critérios desconhecidos: ${pedidos.join(", ")}` });

  const { escolhas } = avaliacaoDoJurado(estado.banco, ctx.participacao.id, ctx.evento.id);
  const antes = criterios.filter((c) => escolhas[c.id] === entrada.candidatoId).map((c) => c.id);
  const depois = criterios.filter((c) => pedidos.includes(c.id)).map((c) => c.id);
  if (antes.length === depois.length && antes.every((id) => depois.includes(id))) return sucesso({ resultado: "SEM_ALTERACAO" });

  const alterado = antes.length > 0;
  const substituidos = Object.fromEntries(depois.filter((id) => escolhas[id] && escolhas[id] !== entrada.candidatoId).map((id) => [id, escolhas[id]]));
  store.atualizar((e) =>
    auditar(
      aplicarEscolhasJuri(e, {
        eventoId: ctx.evento.id,
        participacaoId: ctx.participacao.id,
        candidatoId: entrada.candidatoId,
        criterioIds: depois,
        agoraMs,
      }),
      ctx,
      agoraMs,
      alterado,
      { modo: "MELHOR_POR_CRITERIO", candidatoId: entrada.candidatoId, de: antes, para: depois, substituidos },
      "escolha_juri",
    ),
  );
  if (modoFalha === "REDE_GRAVOU") return falha("REDE", { detalhe: "falha pontual REDE_GRAVOU: gravou e a resposta se perdeu" });
  return sucesso({ resultado: alterado ? "ATUALIZADO" : "REGISTRADO" });
}

export type AvaliacaoJuriVisao = { modo: ModoVotoJuri; avaliacao: AvaliacaoJurado };

/**
 * Notas e escolhas do jurado da sessão (para a lista e a tela de avaliação). Leitura: só obedece `simularErroRede`.
 * Fora do papel JURADO, devolve a avaliação vazia.
 */
export async function consultarAvaliacaoJuri(e: { eventoId: string }): Promise<Resultado<AvaliacaoJuriVisao>> {
  await atraso();
  const erro = simularFalha({ consumirPontual: false });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão" });
  if (!acharEvento(estado, e.eventoId)) return falha("NAO_ENCONTRADO", { detalhe: `evento ${e.eventoId} não existe` });
  const modo = modoVotoJuriDoEvento(estado.banco, e.eventoId);
  const participacao = estado.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === e.eventoId);
  if (!participacao || participacao.papel !== "JURADO") return sucesso({ modo, avaliacao: { notas: {}, escolhas: {} } });
  return sucesso({ modo, avaliacao: avaliacaoDoJurado(estado.banco, participacao.id, e.eventoId) });
}
