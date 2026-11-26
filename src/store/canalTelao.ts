"use client";

import { useEffect, useRef, useState } from "react";
import type { ComandoDoPalco, ComandoTelao, EstadoTelao } from "@/dominio/telaoRemoto";

// Controle remoto do telão (08/10/2026): o ControleRemoto (em qualquer aba do admin) comanda o palco (aba do telão) e o
// palco conta o que está mostrando. Canal próprio, fora do estado do protótipo: comandos e estado do telão nunca
// disputam a escrita com o progresso da revelação (sincronizarAbas troca o estado inteiro, e a última escrita vale).
// Os tipos moram em dominio/telaoRemoto (25/11/2026): o servidor também os usa, no telão pareado em outro aparelho.

export type { ComandoDoPalco, ComandoTelao, EstadoTelao };

const CANAL = "vaivota-telao";
/** O palco repete o estado neste intervalo; sem notícia por SEM_SINAL_MS, a sala mostra o telão como desconectado. */
export const BATIMENTO_MS = 2000;
const SEM_SINAL_MS = 5000;

/**
 * O que o controle remoto mostra. Telão em outro aparelho (25/11/2026): `remoto` diz que o estado veio do servidor, e SEM_SINAL que
 * o aparelho pareado parou de responder (sem internet ou com a página fechada).
 */
export type TelaoNoControle = (EstadoTelao | { situacao: "SEM_SINAL"; ensaio: boolean }) & { remoto: boolean };

type Mensagem = { tipo: "COMANDO"; comando: ComandoTelao } | { tipo: "ESTADO"; estado: EstadoTelao | null } | { tipo: "PEDIR_ESTADO" };

let canal: BroadcastChannel | null = null;
function obterCanal(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  canal ??= new BroadcastChannel(CANAL);
  return canal;
}

// Telão em outro aparelho (25/11/2026): os comandos chegam pelo servidor (telaoRemoto.ts) e são entregues aqui mesmo, na aba do
// palco, aos mesmos ouvintes do canal. O BroadcastChannel não entrega à própria aba, por isso a lista local.
const ouvintesLocais = new Set<(m: Mensagem) => void>();
const observadoresDoEstado = new Set<(estado: EstadoTelao | null) => void>();

function ouvir(aoReceber: (m: Mensagem) => void): () => void {
  ouvintesLocais.add(aoReceber);
  const c = obterCanal();
  const ouvinte = (e: MessageEvent<Mensagem>) => aoReceber(e.data);
  c?.addEventListener("message", ouvinte);
  return () => {
    ouvintesLocais.delete(aoReceber);
    c?.removeEventListener("message", ouvinte);
  };
}

/** Publica o estado do palco: às outras abas e a quem observa nesta (o telão pareado o leva ao servidor). */
function publicarEstado(estado: EstadoTelao | null): void {
  obterCanal()?.postMessage({ tipo: "ESTADO", estado } satisfies Mensagem);
  for (const observar of observadoresDoEstado) observar(estado);
}

/** Sala → palco. */
export function enviarComandoTelao(comando: ComandoTelao): void {
  obterCanal()?.postMessage({ tipo: "COMANDO", comando } satisfies Mensagem);
}

/** Telão pareado: executa nesta aba um comando que veio do controle remoto pelo servidor. */
export function entregarComandoTelao(comando: ComandoTelao): void {
  for (const ouvinte of [...ouvintesLocais]) ouvinte({ tipo: "COMANDO", comando });
}

/** Telão pareado: cada estado que o palco publica (na mudança, no batimento e null ao sair). Devolve o cancelamento. */
export function observarEstadoTelao(observar: (estado: EstadoTelao | null) => void): () => void {
  observadoresDoEstado.add(observar);
  return () => observadoresDoEstado.delete(observar);
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
    publicarEstado(atual.current);
  }, [chave]);

  useEffect(() => {
    const publicar = () => publicarEstado(atual.current);
    const sumir = () => publicarEstado(null);
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
