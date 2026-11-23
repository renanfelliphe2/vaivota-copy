"use client";

import { useEffect, useMemo, useState, type FocusEventHandler, type PointerEventHandler } from "react";
import { aplicarTroca, cartazesIniciais, CASAS_DO_HERO, proximaTroca, type Troca } from "@/dominio/rotacaoCartazes";

/** De quanto em quanto tempo UMA casa troca de filme (com uma variação de ±35% para não parecer relógio). Cada casa troca, em média, a cada 6x isto. */
export const INTERVALO_TROCA_MS = 3500;
/** Duração da corrida da película na troca (globals.css: `--cine-troca`). Tem de ser menor que o intervalo mínimo (~2,3 s). */
export const DURACAO_TROCA_MS = 1000;
const VARIACAO = 0.35;

type Estado = { chave: string; ids: string[]; trocas: number[]; ultima: Troca | null };

function inicial(chave: string, todos: readonly string[]): Estado {
  return { chave, ids: cartazesIniciais(todos), trocas: Array(CASAS_DO_HERO).fill(0), ultima: null };
}

export type RotacaoCartazes = {
  /** Os filmes de cada casa (até seis), na ordem das casas. Sem sorteio até o navegador começar a girar: servidor e navegador batem. */
  ids: readonly string[];
  /** Quantas vezes cada casa já trocou: a fita que corre usa isto para recomeçar a corrida. */
  trocas: readonly number[];
  /** Espalhe no elemento que contém os cartazes: parado sob o mouse e o foco, ninguém perde o cartaz na hora do clique. */
  pausa: {
    onPointerEnter: PointerEventHandler;
    onPointerLeave: PointerEventHandler;
    onFocus: FocusEventHandler;
    onBlur: FocusEventHandler;
  };
};

/**
 * Rotação dos cartazes do hero (23/11/2026): seis casas e, a cada intervalo, uma delas troca por um filme que não está em
 * nenhuma casa (src/dominio/rotacaoCartazes.ts garante que o mesmo filme nunca aparece em duas fitas). Não gira com seis filmes
 * ou menos, com a aba escondida, sob o mouse ou o foco, nem com prefers-reduced-motion (movimento que ninguém pode pausar).
 */
export function useRotacaoCartazes(todos: readonly string[]): RotacaoCartazes {
  const chave = todos.join("|");
  const lista = useMemo(() => (chave ? chave.split("|") : []), [chave]);
  const [estado, setEstado] = useState<Estado>(() => inicial(chave, lista));
  const [pausado, setPausado] = useState(false);
  // A lista de filmes mudou (carregou, ou o admin mexeu): recomeça das primeiras casas, sem passar por um quadro velho.
  const atual = estado.chave === chave ? estado : inicial(chave, lista);

  useEffect(() => {
    if (pausado || lista.length <= CASAS_DO_HERO) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let relogio: ReturnType<typeof setTimeout>;
    const agendar = () => {
      const atraso = INTERVALO_TROCA_MS * (1 - VARIACAO + Math.random() * 2 * VARIACAO);
      relogio = setTimeout(() => {
        if (!document.hidden) {
          // O acaso é sorteado fora do atualizador: ele pode rodar duas vezes (modo estrito) e tem de dar a mesma troca.
          const sorteios = [Math.random(), Math.random()];
          setEstado((anterior) => {
            const base = anterior.chave === chave ? anterior : inicial(chave, lista);
            let k = 0;
            const troca = proximaTroca(base.ids, lista, () => sorteios[k++ % sorteios.length], base.ultima);
            if (!troca) return base;
            return {
              chave,
              ids: aplicarTroca(base.ids, troca),
              trocas: base.trocas.map((n, i) => (i === troca.casa ? n + 1 : n)),
              ultima: { casa: troca.casa, id: base.ids[troca.casa] },
            };
          });
        }
        agendar();
      }, atraso);
    };
    agendar();
    return () => clearTimeout(relogio);
  }, [chave, lista, pausado]);

  const pausa = useMemo(
    () => ({
      onPointerEnter: () => setPausado(true),
      onPointerLeave: () => setPausado(false),
      onFocus: () => setPausado(true),
      onBlur: () => setPausado(false),
    }),
    [],
  );

  return { ids: atual.ids, trocas: atual.trocas, pausa };
}
