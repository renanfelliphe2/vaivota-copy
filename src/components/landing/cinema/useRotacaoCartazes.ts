"use client";

import { useEffect, useMemo, useState, type FocusEventHandler, type PointerEventHandler } from "react";
import { aplicarTroca, cartazesIniciais, CASAS_DO_HERO, filmesDaFita, FITAS_DO_HERO, proximaTroca, type UltimaTroca } from "@/dominio/rotacaoCartazes";

/** De quanto em quanto tempo UMA fita corre (com uma variação de ±35% para não parecer relógio). Cada fita corre, em média, a cada 3x isto. */
export const INTERVALO_TROCA_MS = 3500;
/** Duração da corrida da fita de pé, que anda dois quadros (globals.css: `--cine-fita`). Também menor que o intervalo mínimo. */
export const DURACAO_FITA_MS = 1400;
const VARIACAO = 0.35;

type Estado = { chave: string; ids: string[]; trocas: number[]; ultima: UltimaTroca | null };

function inicial(chave: string, todos: readonly string[]): Estado {
  return { chave, ids: cartazesIniciais(todos), trocas: Array(FITAS_DO_HERO).fill(0), ultima: null };
}

export type RotacaoCartazes = {
  /** Os filmes de cada casa (até seis), na ordem das casas. Sem sorteio até o navegador começar a girar: servidor e navegador batem. */
  ids: readonly string[];
  /** Quantas vezes cada fita já correu: os furos usam isto para recomeçar a corrida. */
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
 * Rotação dos cartazes do hero (23/11/2026): seis casas em três fitas e, a cada intervalo, uma fita corre e os dois quadros
 * dela trocam por filmes que não estão em nenhuma casa (24/11/2026; antes trocava uma casa só) (src/dominio/rotacaoCartazes.ts garante que o mesmo filme nunca aparece em duas fitas). Não gira com seis filmes
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
          const sorteios = [Math.random(), Math.random(), Math.random()];
          setEstado((anterior) => {
            const base = anterior.chave === chave ? anterior : inicial(chave, lista);
            let k = 0;
            const troca = proximaTroca(base.ids, lista, () => sorteios[k++ % sorteios.length], base.ultima);
            if (!troca) return base;
            return {
              chave,
              ids: aplicarTroca(base.ids, troca),
              trocas: base.trocas.map((n, i) => (i === troca.fita ? n + 1 : n)),
              ultima: { fita: troca.fita, saiu: filmesDaFita(base.ids, troca.fita).filter((id) => !troca.ids.includes(id)) },
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
