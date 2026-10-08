"use client";

import { ClipboardCheck, Trophy } from "lucide-react";
import { candidatoAvaliado, type AvaliacaoJurado } from "@/dominio/avaliacaoJuri";
import type { CriterioJuri, ModoVotoJuri } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import type { ItemLista } from "@/store/seletores/candidatos";

export type FiltroAvaliacao = "TODOS" | "PENDENTES" | "AVALIADOS";

const FILTROS: [FiltroAvaliacao, string][] = [
  ["TODOS", "Todos"],
  ["PENDENTES", "A avaliar"],
  ["AVALIADOS", "Avaliados"],
];

/** Filtro da lista no modo de notas: avaliado = nota em todos os critérios. A própria candidatura só aparece em "Todos". */
export function filtrarPorAvaliacao(
  itens: readonly ItemLista[],
  filtro: FiltroAvaliacao,
  avaliacao: AvaliacaoJurado,
  criterios: readonly CriterioJuri[],
): ItemLista[] {
  if (filtro === "TODOS") return [...itens];
  return itens.filter((i) => !i.bloqueadoVotoProprio && candidatoAvaliado(avaliacao.notas[i.candidato.id], criterios) === (filtro === "AVALIADOS"));
}

export type PainelAvaliacaoJuriProps = {
  modo: Exclude<ModoVotoJuri, "VOTO_UNICO">;
  criterios: readonly CriterioJuri[];
  /** Candidatos avaliáveis (sem o voto próprio bloqueado). */
  itens: readonly ItemLista[];
  avaliacao: AvaliacaoJurado;
  carregando: boolean;
  filtro: FiltroAvaliacao;
  aoFiltrar: (filtro: FiltroAvaliacao) => void;
};

/**
 * Progresso do jurado na entrada do evento (08/10/2026). Notas: quantos já avaliou e o filtro da lista.
 * Melhor por critério: o escolhido de cada critério. Nunca mostra contagens de outros jurados.
 */
export function PainelAvaliacaoJuri({ modo, criterios, itens, avaliacao, carregando, filtro, aoFiltrar }: PainelAvaliacaoJuriProps) {
  if (modo === "NOTAS_POR_CRITERIO") {
    const avaliados = itens.filter((i) => candidatoAvaliado(avaliacao.notas[i.candidato.id], criterios)).length;
    const total = itens.length;
    const pct = total > 0 ? Math.round((avaliados / total) * 100) : 0;
    return (
      <section aria-labelledby="titulo-avaliacao" aria-busy={carregando || undefined} className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-fundo p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="titulo-avaliacao" className="flex items-center gap-2 text-lg font-bold">
            <ClipboardCheck aria-hidden className="size-5 text-tema-primaria-texto" />
            Sua avaliação
          </h3>
          <p className="text-sm font-semibold tabular-nums">
            {carregando ? "Carregando…" : `${avaliados} de ${total} avaliados`}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Candidatos avaliados"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={avaliados}
          className="h-2 overflow-hidden rounded-full bg-tema-superficie"
        >
          <div className="h-full rounded-full bg-tema-primaria transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-tema-texto-suave">
          Critérios: {criterios.map((c) => c.nome).join(", ")}. Notas de 0 a 10; você pode rever até o encerramento.
        </p>
        <div role="group" aria-label="Mostrar" className="flex flex-wrap gap-2">
          {FILTROS.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={filtro === valor}
              onClick={() => aoFiltrar(valor)}
              className={cx(
                "min-h-11 rounded-full px-4 text-sm font-semibold",
                filtro === valor ? "bg-tema-primaria text-tema-sobre-primaria" : "border border-tema-texto-suave hover:bg-tema-superficie",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </section>
    );
  }

  const titulo = (id: string) => itens.find((i) => i.candidato.id === id)?.candidato.titulo ?? null;
  const escolhidos = criterios.filter((c) => avaliacao.escolhas[c.id] && titulo(avaliacao.escolhas[c.id])).length;
  return (
    <section aria-labelledby="titulo-avaliacao" aria-busy={carregando || undefined} className="flex flex-col gap-4 rounded-2xl border border-tema-borda bg-tema-fundo p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="titulo-avaliacao" className="flex items-center gap-2 text-lg font-bold">
          <Trophy aria-hidden className="size-5 text-tema-primaria-texto" />
          Suas escolhas por critério
        </h3>
        <p className="text-sm font-semibold tabular-nums">
          {carregando ? "Carregando…" : `${escolhidos} de ${criterios.length} critérios`}
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {criterios.map((c) => {
          const nome = avaliacao.escolhas[c.id] ? titulo(avaliacao.escolhas[c.id]) : null;
          return (
            <li key={c.id} className="flex flex-col rounded-xl border border-tema-borda bg-tema-superficie px-3 py-2">
              <span className="text-sm text-tema-texto-suave">Melhor {c.nome.toLocaleLowerCase("pt-BR")}</span>
              <span className={cx("font-semibold", !nome && "text-tema-texto-suave")}>{nome ?? "Ainda sem escolha"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
