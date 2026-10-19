import { embaralharComSemente } from "@/lib/aleatorio";
import { votaveis } from "./candidatos";
import type { Candidato, Evento } from "./tipos";

// Ordem dos cartões da votação, usada pela lista, pelo detalhe, pela revisão e pelo mosaico do hero. 19/10/2026: no
// lugar da ordem manual do admin e do embaralhamento fixo por usuário (Etapa 4, D4), o evento escolhe:
//  - ALEATORIA (padrão): embaralhada com a semente da carga da página, sorteada no servidor a cada requisição e mantida
//    no navegador até a próxima carga. Servidor e hidratação dão a mesma ordem; nunca Math.random() no render.
//  - ALFABETICA: A–Z pelo título, sem diferenciar maiúsculas e acentos, com números em ordem natural.

function porTitulo(a: Candidato, b: Candidato): number {
  return a.titulo.localeCompare(b.titulo, "pt-BR", { sensitivity: "base", numeric: true }) || a.id.localeCompare(b.id);
}

/** Votáveis do evento (publicados e não desqualificados) na ordem que ele escolheu. Não muta a lista recebida. */
export function ordenarParaVotacao(
  candidatos: readonly Candidato[],
  evento: Pick<Evento, "id" | "ordemCandidatos">,
  semente: number,
): Candidato[] {
  // `votaveis` devolve uma lista nova, já em ordem fixa (`ordem`, `id`): o embaralhamento parte sempre do mesmo ponto.
  const base = votaveis(candidatos.filter((c) => c.eventoId === evento.id));
  if (evento.ordemCandidatos === "ALFABETICA") return base.sort(porTitulo);
  return embaralharComSemente(base, `${semente}:${evento.id}`);
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
