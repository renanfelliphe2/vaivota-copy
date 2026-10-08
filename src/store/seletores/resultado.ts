"use client";

import { resultadoAtual } from "@/dominio/resultado";
import { resolverFaseConfig } from "@/dominio/travas";
import { useStore } from "../AppProvider";

/**
 * Etapa 7: só o número da maior versão do resultado do evento (ou null), para o painel refazer a consulta
 * quando surge uma versão nova. Os dados do resultado continuam saindo só por serviço (D4 da Etapa 0).
 */
export function useVersaoResultado(eventoId: string | null): number | null {
  return useStore((e) => (eventoId ? (resultadoAtual(e.banco.resultados, eventoId)?.versao ?? null) : null));
}

/** Etapa 7 (D12): o SimuladorVotos só roda com a urna aberta (fase URNA_ABERTA). */
export function useUrnaAberta(eventoId: string): boolean {
  return useStore((e) => {
    const evento = e.banco.eventos.find((ev) => ev.id === eventoId);
    return evento ? resolverFaseConfig(evento).fase === "URNA_ABERTA" : false;
  });
}
