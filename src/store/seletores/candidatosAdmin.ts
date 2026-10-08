"use client";

import { useMemo } from "react";
import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import { useEventoAtivo } from "./evento";

export type EstadoCandidatoAdmin = "NA_VOTACAO" | "RASCUNHO" | "FORA_DA_DISPUTA";

export type CandidatoAdmin = { candidato: Candidato; estado: EstadoCandidatoAdmin };

export function estadoCandidatoAdmin(c: Candidato): EstadoCandidatoAdmin {
  if (c.desqualificado) return "FORA_DA_DISPUTA";
  return c.publicado ? "NA_VOTACAO" : "RASCUNHO";
}

/**
 * Etapa 6: todos os candidatos do evento ativo na ordem de `ordem` (desempate por id), com os campos
 * extras. Referência estável (memoizada no hook, D11 da Etapa 0). A Etapa 7 usa a mesma ordem.
 */
export function useCandidatosAdmin(): { itens: CandidatoAdmin[]; campos: CampoCandidato[]; naVotacao: number } | null {
  const ativo = useEventoAtivo();
  return useMemo(() => {
    if (!ativo) return null;
    const itens = [...ativo.candidatos]
      .sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))
      .map((candidato) => ({ candidato, estado: estadoCandidatoAdmin(candidato) }));
    return { itens, campos: ativo.camposCandidato, naVotacao: itens.filter((i) => i.estado === "NA_VOTACAO").length };
  }, [ativo]);
}
