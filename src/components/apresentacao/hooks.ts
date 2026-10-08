"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { avancaSozinha, duracaoDoPasso } from "@/dominio/apresentacao/motor";
import type { AcaoMotor, Cena, EstadoMotor } from "@/dominio/apresentacao/tipos";

// Etapa 8 (seção 5.5, regras do React Compiler): timers e listeners só em useEffect, com limpeza;
// nenhum setState síncrono no corpo do efeito; refs só em efeitos e handlers.

export const LARGURA_PALCO = 1920;
export const ALTURA_PALCO = 1080;

/** Escala do canvas lógico 1920×1080 para caber no contêiner (letterbox). */
export function useEscalaPalco(ref: RefObject<HTMLElement | null>): number {
  const [escala, setEscala] = useState(0.5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setEscala(Math.min(width / LARGURA_PALCO, height / ALTURA_PALCO));
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return escala;
}

/** true enquanto algum elemento estiver em tela cheia; avisa ao sair. */
export function useTelaCheia(aoSair: () => void): boolean {
  const [cheia, setCheia] = useState(false);
  const aoSairRef = useRef(aoSair);
  useEffect(() => {
    aoSairRef.current = aoSair;
  });
  useEffect(() => {
    const aoMudar = () => {
      const agora = Boolean(document.fullscreenElement);
      setCheia(agora);
      if (!agora) aoSairRef.current();
    };
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);
  return cheia;
}

export type AtalhosPalco = Partial<Record<"espaco" | "avancar" | "voltar" | "trailer" | "telaCheia" | "emergencia" | "sair" | "ajuda", () => void>>;

/** Um keydown no window (D15). Ignora `repeat` e alvos interativos (botão, campo, dialog). */
export function usePalcoTeclado(atalhos: AtalhosPalco): void {
  const atual = useRef(atalhos);
  useEffect(() => {
    atual.current = atalhos;
  });
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest("button, a, input, select, textarea, dialog, [contenteditable='true']")) return;
      const a = atual.current;
      let acao: (() => void) | undefined;
      if (e.key === " ") acao = a.espaco;
      else if (e.key === "ArrowRight" || e.key === "Enter") acao = a.avancar;
      else if (e.key === "ArrowLeft") acao = a.voltar;
      else if (e.key === "E" && e.shiftKey) acao = a.emergencia;
      else if (e.key.toLowerCase() === "t" && !e.shiftKey) acao = a.trailer;
      else if (e.key.toLowerCase() === "f" && !e.shiftKey) acao = a.telaCheia;
      else if (e.key.toLowerCase() === "q" && !e.shiftKey) acao = a.sair;
      else if (e.key === "?") acao = a.ajuda;
      if (!acao) return;
      e.preventDefault();
      acao();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, []);
}

/** Um setTimeout por (cena, passo, pausado, modo, trailer); despacha AVANCO_AUTOMATICO com o par atual. */
export function useTemporizadorDoPasso(estado: EstadoMotor, roteiro: Cena[], despachar: (a: AcaoMotor) => void, ativo = true): void {
  const { cena, passo, pausado, modoAvanco, trailer, situacao } = estado;
  const despacharRef = useRef(despachar);
  useEffect(() => {
    despacharRef.current = despachar;
  });
  const atual = roteiro[cena];
  useEffect(() => {
    if (!ativo || !atual || pausado || situacao === "CONCLUIDA" || !avancaSozinha(atual, modoAvanco)) return;
    const ms = duracaoDoPasso(atual, passo, trailer);
    if (ms === null) return;
    const timer = setTimeout(() => despacharRef.current({ tipo: "AVANCO_AUTOMATICO", cena, passo }), ms);
    return () => clearTimeout(timer);
  }, [ativo, atual, cena, passo, pausado, modoAvanco, trailer, situacao]);
}

/** HUD visível ao mover o mouse; some após `ms` sem movimento. */
export function useHudVisivel(ms: number, forcado: boolean): boolean {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const aoMover = () => {
      setVisivel(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisivel(false), ms);
    };
    window.addEventListener("mousemove", aoMover);
    return () => {
      window.removeEventListener("mousemove", aoMover);
      clearTimeout(timer);
    };
  }, [ms]);
  return visivel || forcado;
}

/** Contador de tiques local (ensaio, D5): nunca usa o relógio global. */
export function useTique(intervaloMs: number, ativo: boolean): number {
  const [tiques, setTiques] = useState(0);
  useEffect(() => {
    if (!ativo) return;
    const timer = setInterval(() => setTiques((t) => t + 1), intervaloMs);
    return () => clearInterval(timer);
  }, [intervaloMs, ativo]);
  return tiques;
}

/** Página atual em rotação (D19), por tique local; sem rotação com uma página. */
export function usePaginaRotativa(paginas: number, intervaloMs: number): number {
  const tiques = useTique(intervaloMs, paginas > 1);
  return paginas > 1 ? tiques % paginas : 0;
}

/** prefers-reduced-motion. */
export function useMovimentoReduzido(): boolean {
  const [reduzido, setReduzido] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aoMudar = () => setReduzido(mq.matches);
    const timer = setTimeout(aoMudar, 0);
    mq.addEventListener("change", aoMudar);
    return () => {
      clearTimeout(timer);
      mq.removeEventListener("change", aoMudar);
    };
  }, []);
  return reduzido;
}

/** Contagem animada até `alvo` (requestAnimationFrame); reduced motion = valor final. */
export function useContagemAnimada(alvo: number, duracaoMs: number, ativo: boolean): number {
  const reduzido = useMovimentoReduzido();
  const [valor, setValor] = useState(0);
  useEffect(() => {
    if (!ativo || reduzido) return;
    let quadro = 0;
    let inicio: number | null = null;
    const passo = (t: number) => {
      inicio ??= t;
      const f = Math.min(1, (t - inicio) / duracaoMs);
      setValor(alvo * (1 - (1 - f) ** 3));
      if (f < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracaoMs, ativo, reduzido]);
  return reduzido || !ativo ? alvo : valor;
}
