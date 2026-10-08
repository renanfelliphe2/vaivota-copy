"use client";

import { useEffect, useRef, useState } from "react";
import type { ModoAvanco } from "@/dominio/tipos";

// Controle remoto do telão (08/10/2026): o ControleRemoto (em qualquer aba do admin) comanda o palco (aba do telão) e o
// palco conta o que está mostrando. Canal próprio, fora do estado do protótipo: comandos e estado do telão nunca
// disputam a escrita com o progresso da revelação (sincronizarAbas troca o estado inteiro, e a última escrita vale).

const CANAL = "vaivota-telao";
/** O palco repete o estado neste intervalo; sem notícia por SEM_SINAL_MS, a sala mostra o telão como desconectado. */
export const BATIMENTO_MS = 2000;
const SEM_SINAL_MS = 5000;

/** Os botões do controle remoto. Só por clique: o controle aparece em todas as abas e não usa teclado. */
export type ComandoTelao = "AVANCAR" | "VOLTAR" | "ALTERNAR_PAUSA" | "ALTERNAR_MODO" | "EMERGENCIA" | "REINICIAR" | "DESLIGAR" | "LIGAR";

/** Comandos que dependem da cena (o palco diz quais valem agora). */
export type ComandoDoPalco = Exclude<ComandoTelao, "DESLIGAR" | "LIGAR">;

export type EstadoTelao =
  /** Aba aberta, esperando o clique em "Entrar em tela cheia" na própria janela do telão. */
  | { situacao: "AGUARDANDO_CLIQUE"; ensaio: boolean }
  /** Desligado pelo controle: tela preta com a logo; a revelação fica pausada onde estava. */
  | { situacao: "DESLIGADO"; ensaio: boolean }
  | {
      situacao: "LIGADO";
      ensaio: boolean;
      nomeCena: string;
      /** Só durante a revelação: cena atual (1…) e total. */
      progresso: { cena: number; total: number } | null;
      /** APRESENTANDO e PAUSADO: revelação em curso. PARADO: tela sem cenas para conduzir (candidatos, final). */
      andamento: "APRESENTANDO" | "PAUSADO" | "PARADO";
      modoAvanco: ModoAvanco | null;
      telaCheia: boolean;
      mensagem: string | null;
      pode: Record<ComandoDoPalco, boolean>;
    };

type Mensagem = { tipo: "COMANDO"; comando: ComandoTelao } | { tipo: "ESTADO"; estado: EstadoTelao | null } | { tipo: "PEDIR_ESTADO" };

let canal: BroadcastChannel | null = null;
function obterCanal(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  canal ??= new BroadcastChannel(CANAL);
  return canal;
}

function ouvir(aoReceber: (m: Mensagem) => void): () => void {
  const c = obterCanal();
  if (!c) return () => {};
  const ouvinte = (e: MessageEvent<Mensagem>) => aoReceber(e.data);
  c.addEventListener("message", ouvinte);
  return () => c.removeEventListener("message", ouvinte);
}

/** Sala → palco. */
export function enviarComandoTelao(comando: ComandoTelao): void {
  obterCanal()?.postMessage({ tipo: "COMANDO", comando } satisfies Mensagem);
}

/**
 * Palco: publica o próprio estado a cada mudança (comparado por conteúdo), repete no batimento, responde a quem
 * pede e avisa null ao sair (desmontar ou fechar a aba). Executa os comandos recebidos com `aoComando`.
 */
export function useTelaoPublicado(estado: EstadoTelao, aoComando?: (comando: ComandoTelao) => void): void {
  const atual = useRef(estado);
  const comandoRef = useRef(aoComando);
  const chave = JSON.stringify(estado);
  useEffect(() => {
    atual.current = estado;
    comandoRef.current = aoComando;
  });

  useEffect(() => {
    obterCanal()?.postMessage({ tipo: "ESTADO", estado: atual.current } satisfies Mensagem);
  }, [chave]);

  useEffect(() => {
    const publicar = () => obterCanal()?.postMessage({ tipo: "ESTADO", estado: atual.current } satisfies Mensagem);
    const sumir = () => obterCanal()?.postMessage({ tipo: "ESTADO", estado: null } satisfies Mensagem);
    const parar = ouvir((m) => {
      if (m.tipo === "PEDIR_ESTADO") publicar();
      else if (m.tipo === "COMANDO") comandoRef.current?.(m.comando);
    });
    const batimento = setInterval(publicar, BATIMENTO_MS);
    window.addEventListener("pagehide", sumir);
    return () => {
      parar();
      clearInterval(batimento);
      window.removeEventListener("pagehide", sumir);
      sumir();
    };
  }, []);
}

/** Sala: o último estado do telão, ou null sem telão (ou sem sinal há SEM_SINAL_MS). */
export function useEstadoTelao(): EstadoTelao | null {
  // Relógio real (não o simulado): é só a vivacidade da outra aba. Lido nos callbacks, nunca no render.
  const [recebido, setRecebido] = useState<{ estado: EstadoTelao | null; em: number }>({ estado: null, em: 0 });
  const [agora, setAgora] = useState(0);
  useEffect(() => {
    const parar = ouvir((m) => {
      if (m.tipo !== "ESTADO") return;
      const em = Date.now();
      setRecebido({ estado: m.estado, em });
      setAgora(em);
    });
    obterCanal()?.postMessage({ tipo: "PEDIR_ESTADO" } satisfies Mensagem);
    const t = setInterval(() => setAgora(Date.now()), BATIMENTO_MS);
    return () => {
      parar();
      clearInterval(t);
    };
  }, []);
  return agora - recebido.em < SEM_SINAL_MS ? recebido.estado : null;
}
