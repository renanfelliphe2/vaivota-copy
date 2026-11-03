import type { AvaliacaoJurado } from "@/dominio/avaliacaoJuri";
import type { ModoVotoJuri, ResultadoEnvioVoto } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";
import { marcarVotou } from "./votacao";

// Júri por critério. Salvar é idempotente (substitui as notas ou escolhas do candidato): depois de erro de rede, tentar de
// novo é seguro e devolve SEM_ALTERACAO se já tinha gravado. Toda regra mora no servidor (src/server/juri.ts).

export type EntradaNotasJuri = { eventoId: string; candidatoId: string; notas: Record<string, number> };

/** Notas de 0 a 10 do jurado da sessão a um candidato, em todos os critérios do evento. */
export async function avaliarCandidatoJuri(entrada: EntradaNotasJuri): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const r = await chamar<{ resultado: ResultadoEnvioVoto }>("avaliarCandidatoJuri", entrada, { tempoMs: 15_000 });
  if (r.ok) marcarVotou(entrada.eventoId);
  return r;
}

export type EntradaEscolhasJuri = { eventoId: string; candidatoId: string; criterioIds: string[] };

/**
 * Critérios em que o candidato é o melhor para o jurado da sessão. Marcar substitui quem era o melhor no critério;
 * desmarcar um critério em que ele era o melhor deixa o critério sem escolha.
 */
export async function escolherMelhoresJuri(entrada: EntradaEscolhasJuri): Promise<Resultado<{ resultado: ResultadoEnvioVoto }>> {
  const r = await chamar<{ resultado: ResultadoEnvioVoto }>("escolherMelhoresJuri", entrada, { tempoMs: 15_000 });
  // Desmarcar tudo pode deixar o jurado sem nenhum registro (votou volta a ser falso): só o servidor sabe, então relê.
  if (r.ok) await recarregarEstado();
  return r;
}

export type AvaliacaoJuriVisao = { modo: ModoVotoJuri; avaliacao: AvaliacaoJurado };

/** Notas e escolhas do jurado da sessão (para a lista e a tela de avaliação). Fora do papel JURADO, a avaliação vem vazia. */
export function consultarAvaliacaoJuri(e: { eventoId: string }): Promise<Resultado<AvaliacaoJuriVisao>> {
  return chamar<AvaliacaoJuriVisao>("consultarAvaliacaoJuri", e, { tempoMs: 10_000 });
}
