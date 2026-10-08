import { embaralharComSemente, hashDeTexto } from "@/lib/aleatorio";
import { votaveis } from "./candidatos";
import type { Candidato } from "./tipos";

// Etapa 4 (D4): ordem dos cartões de /votar, determinística por usuário e evento. Usada pela lista,
// pelo detalhe e pela revisão (Etapa 5). Nunca Math.random() no render.

/** Semente da ordem: `${usuarioId}:${eventoId}`. */
export function sementeDaOrdem(usuarioId: string, eventoId: string): number {
  return hashDeTexto(`${usuarioId}:${eventoId}`);
}

/**
 * Votáveis do evento (publicados e não desqualificados), ordenados por `ordem` (desempate por `id`)
 * e embaralhados com a semente do usuário. Não muta a lista recebida.
 */
export function ordenarParaVotacao(candidatos: readonly Candidato[], usuarioId: string, eventoId: string): Candidato[] {
  const base = votaveis(candidatos.filter((c) => c.eventoId === eventoId));
  return embaralharComSemente(base, sementeDaOrdem(usuarioId, eventoId));
}

type ItemComId = { id: string } | { candidato: { id: string } };

function idDoItem(item: ItemComId): string {
  return "candidato" in item ? item.candidato.id : item.id;
}

export type PosicaoNaOrdem<T> = {
  indice: number;
  item: T;
  anterior: T | null;
  seguinte: T | null;
  total: number;
};

/**
 * Posição do candidato na ordem do usuário (lista de `Candidato` ou de itens com `candidato`).
 * `null` se o id não estiver na lista: inexistente, de outro evento, rascunho ou desqualificado.
 */
export function localizarNaOrdem<T extends ItemComId>(itens: readonly T[], candidatoId: string | null): PosicaoNaOrdem<T> | null {
  if (!candidatoId) return null;
  const indice = itens.findIndex((item) => idDoItem(item) === candidatoId);
  if (indice < 0) return null;
  return {
    indice,
    item: itens[indice],
    anterior: indice > 0 ? itens[indice - 1] : null,
    seguinte: indice < itens.length - 1 ? itens[indice + 1] : null,
    total: itens.length,
  };
}
