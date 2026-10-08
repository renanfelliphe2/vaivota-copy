"use client";

import { useEffect } from "react";
import { adicionarVotosSimulados } from "@/store/acoesDashboard";
import { useAmbiente, useStore } from "@/store/AppProvider";
import { useUrnaAberta } from "@/store/seletores/resultado";
import { INTERVALO_SIMULADOR_MS, quantidadeDoCiclo } from "@/store/simularVotos";

// Etapa 7 (D12, rev. 3 D15): montado UMA vez no GateEvento. Com `dev.simularVotosEntrando` ligado, a urna
// aberta e a aba visível, cria de 1 a 3 votos a cada 3 s. Limpa o timer ao desmontar; nunca acumula.

export function SimuladorVotos({ eventoId }: { eventoId: string }) {
  const ligado = useStore((e) => e.dev.simularVotosEntrando);
  const urnaAberta = useUrnaAberta(eventoId);
  const { store } = useAmbiente();

  useEffect(() => {
    if (!ligado || !urnaAberta) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      adicionarVotosSimulados(eventoId, quantidadeDoCiclo(store.getState().banco.sequencias.voto));
    }, INTERVALO_SIMULADOR_MS);
    return () => clearInterval(timer);
  }, [ligado, urnaAberta, eventoId, store]);

  return null;
}
