"use client";

import { useMemo } from "react";
import { votaveis } from "@/dominio/candidatos";
import { situacaoTotem, type DispositivoDoTotem, type SituacaoTotem } from "@/dominio/totem";
import type { Candidato } from "@/dominio/tipos";
import { useEventoAtivo, type EventoAtivo } from "./evento";

export type VisaoTotem = {
  ativo: EventoAtivo;
  /** Aparelho pareado com este evento (lido do servidor pelo cookie do tablet); null se não houver ou se for de outro evento. */
  dispositivo: DispositivoDoTotem | null;
  candidatos: Candidato[];
  situacao: SituacaoTotem;
};

/** Visão do quiosque: evento da URL, o aparelho pareado, os candidatos votáveis e a situação. */
export function useVisaoTotem(pareado: DispositivoDoTotem | null): VisaoTotem | null {
  const ativo = useEventoAtivo();

  return useMemo(() => {
    if (!ativo) return null;
    const dispositivo = pareado && pareado.eventoId === ativo.evento.id ? pareado : null;
    const candidatos = votaveis(ativo.candidatos);
    return { ativo, dispositivo, candidatos, situacao: situacaoTotem(ativo.evento, dispositivo, candidatos.length) };
  }, [ativo, pareado]);
}
