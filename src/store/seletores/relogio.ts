"use client";

import { useSyncExternalStore } from "react";
import { useAmbiente } from "../AppProvider";
import type { Relogio } from "../relogio";

export { useAgora } from "../AppProvider";

export function useRelogioPausado(): boolean {
  const { relogio } = useAmbiente();
  return useSyncExternalStore(relogio.subscribe, relogio.getPausado, () => false);
}

/** Ações do relógio (toolbar). */
export function useRelogio(): Pick<Relogio, "avancar" | "irPara" | "pausar" | "retomar" | "reiniciar"> {
  const { relogio } = useAmbiente();
  return relogio;
}
