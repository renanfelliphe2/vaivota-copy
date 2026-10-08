"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import type { EstadoApp } from "@/dominio/tipos";
import { T0_MS } from "@/lib/tempo";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { definirAmbiente, type Ambiente } from "./ambiente";
import { criarStore } from "./criarStore";
import { criarRelogio } from "./relogio";
import { ESPERA_COM_MAE_MS, ESPERA_SOZINHA_MS, idDaAbaMae, sincronizarAbas } from "./sincronizarAbas";
import { fecharUrnasVencidas } from "./transicoes";

const AmbienteContext = createContext<Ambiente | null>(null);

/**
 * D1: estado único em memória, montado no layout raiz. Store e relógio criados por montagem.
 * 08/10/2026: as abas do navegador ficam sincronizadas (sincronizarAbas). As telas só aparecem depois da foto de
 * outra aba (ou da espera curta, se esta for a primeira): sem isso, a aba nova do telão nasceria deslogada e o
 * RotaGuard a mandaria para o login.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [ambiente] = useState<Ambiente>(() => {
    const novo = { store: criarStore(criarEstadoInicial()), relogio: criarRelogio(T0_MS) };
    // Serviços (funções comuns) precisam do store já no primeiro efeito dos filhos.
    if (typeof window !== "undefined") definirAmbiente(novo);
    return novo;
  });

  useEffect(
    () => sincronizarAbas(ambiente, () => setPronto(true), idDaAbaMae() ? ESPERA_COM_MAE_MS : ESPERA_SOZINHA_MS),
    [ambiente],
  );

  useEffect(() => {
    definirAmbiente(ambiente);
    const { store, relogio } = ambiente;
    const fechar = () => store.atualizar((e) => fecharUrnasVencidas(e, relogio.getAgora()));
    // Tique de 1 s: avança o relógio e aplica o fechamento automático (D7). Pulos do relógio também checam.
    const intervalo = setInterval(() => {
      relogio.tique();
      fechar();
    }, 1000);
    const cancelar = relogio.subscribe(fechar);
    return () => {
      clearInterval(intervalo);
      cancelar();
    };
  }, [ambiente]);

  return <AmbienteContext.Provider value={ambiente}>{pronto ? children : null}</AmbienteContext.Provider>;
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

/** Instante simulado em ms. No servidor e na hidratação vale T0 (D6). */
export function useAgora(): number {
  const { relogio } = useAmbiente();
  return useSyncExternalStore(relogio.subscribe, relogio.getAgora, () => T0_MS);
}
