"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { EstadoPublico } from "@/dominio/estadoPublico";
import type { EstadoApp } from "@/dominio/tipos";
import { definirAmbiente, type Ambiente } from "./ambiente";
import { criarStore } from "./criarStore";
import { criarEstadoDoServidor } from "./estadoReal";
import { criarRelogio } from "./relogio";
import { intervaloDePollingMs, recarregarEstado } from "./servidor";

const AmbienteContext = createContext<Ambiente | null>(null);
const SementeOrdemContext = createContext(0);

/**
 * MVP Maratona Tech Tivit: estado único no navegador, montado no layout raiz com o estado público que o servidor já entregou
 * (a primeira tela sai renderizada com dados reais, sem espera). O relógio é o real, alinhado ao do servidor. Depois
 * disso, o estado se atualiza a cada ação (os serviços chamam `recarregarEstado`) e por polling enquanto a aba está visível
 * (10 s para quem espera a urna; 30 s para quem já votou ou administra; 60 s com a urna encerrada: ver `intervaloDePollingMs`).
 * `sementeOrdem` (19/10/2026): sorteada no servidor a cada carga da página, embaralha os candidatos (dominio/ordemVotacao).
 * Fica a da montagem: o polling e a navegação dentro do app não mudam a ordem; só uma carga nova da página muda.
 */
export function AppProvider({
  estadoInicial,
  sementeOrdem = 0,
  children,
}: {
  estadoInicial: EstadoPublico;
  sementeOrdem?: number;
  children: ReactNode;
}) {
  const [semente] = useState(sementeOrdem);
  const [ambiente] = useState<Ambiente>(() => {
    const novo = { store: criarStore(criarEstadoDoServidor(estadoInicial)), relogio: criarRelogio(estadoInicial.agoraMs) };
    // Serviços (funções comuns) precisam do store já no primeiro efeito dos filhos.
    if (typeof window !== "undefined") definirAmbiente(novo);
    return novo;
  });

  useEffect(() => {
    definirAmbiente(ambiente);
    const { relogio } = ambiente;
    const intervalo = setInterval(() => relogio.tique(), 1000);
    return () => clearInterval(intervalo);
  }, [ambiente]);

  useEffect(() => {
    let parado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const agendar = () => {
      clearTimeout(timer);
      if (parado) return;
      // O intervalo depende do estado: quem só espera a urna abrir consulta mais; quem já votou ou a urna encerrada, menos.
      timer = setTimeout(() => void ciclo(), intervaloDePollingMs(ambiente.store.getState()));
    };
    async function ciclo() {
      if (document.visibilityState === "visible") await recarregarEstado();
      agendar();
    }
    const aoVoltar = () => {
      // Voltou à aba depois de um tempo (ou de volta da tela bloqueada): atualiza já.
      if (document.visibilityState === "visible") void recarregarEstado();
    };

    agendar();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      parado = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, [ambiente]);

  return (
    <AmbienteContext.Provider value={ambiente}>
      <SementeOrdemContext.Provider value={semente}>{children}</SementeOrdemContext.Provider>
    </AmbienteContext.Provider>
  );
}

/** Semente da ordem aleatória dos candidatos nesta carga da página (a mesma no servidor e na hidratação). */
export function useSementeOrdem(): number {
  return useContext(SementeOrdemContext);
}

export function useAmbiente(): Ambiente {
  const ambiente = useContext(AmbienteContext);
  if (!ambiente) throw new Error("useAmbiente fora do AppProvider");
  return ambiente;
}

/** Leitura do estado por seletor. O seletor deve devolver uma referência estável (fatia do estado ou primitivo). */
export function useStore<T>(seletor: (estado: EstadoApp) => T): T {
  const { store } = useAmbiente();
  return useSyncExternalStore(
    store.subscribe,
    () => seletor(store.getState()),
    () => seletor(store.getState()),
  );
}

/** Instante em ms: o relógio real, alinhado ao do servidor. Na hidratação vale o instante em que o servidor montou a página. */
export function useAgora(): number {
  const { relogio } = useAmbiente();
  return useSyncExternalStore(relogio.subscribe, relogio.getAgora, relogio.getAgora);
}
