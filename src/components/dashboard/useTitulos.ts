"use client";

import { useMemo } from "react";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Título do candidato pelo seletor público (os DTOs do painel só trazem `candidatoId`). */
export function useTitulos(): (candidatoId: string) => string {
  const candidatos = useEventoAtivo()?.candidatos;
  return useMemo(() => {
    const mapa = new Map((candidatos ?? []).map((c) => [c.id, c.titulo]));
    return (id: string) => mapa.get(id) ?? id;
  }, [candidatos]);
}
