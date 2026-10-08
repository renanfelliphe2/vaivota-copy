"use client";

import type { EstadoApp, EstadoDev, EstadoUi } from "@/dominio/tipos";
import { useAmbiente, useStore } from "../AppProvider";

export function useDev(): EstadoDev {
  return useStore((e) => e.dev);
}

export function useUi(): EstadoUi {
  return useStore((e) => e.ui);
}

/** Estado completo: só para o InspetorEstado da toolbar (nunca para telas, D4). */
export function useEstadoCompleto(): EstadoApp {
  return useStore((e) => e);
}

/** Lê o estado na hora, fora da renderização (handlers da toolbar). */
export function useLerEstado(): () => EstadoApp {
  const { store } = useAmbiente();
  return store.getState;
}
