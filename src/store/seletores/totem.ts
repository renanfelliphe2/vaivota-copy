"use client";

import { useMemo } from "react";
import { votaveis } from "@/dominio/candidatos";
import { situacaoTotem, type SituacaoTotem } from "@/dominio/totem";
import type { Candidato, Dispositivo, EstadoUiTotem } from "@/dominio/tipos";
import { useStore } from "../AppProvider";
import { useEventoAtivo, type EventoAtivo } from "./evento";

export type VisaoTotem = {
  ativo: EventoAtivo;
  /** Aparelho pareado com este evento; null se não houver (ou se for de outro evento). */
  dispositivo: Dispositivo | null;
  candidatos: Candidato[];
  situacao: SituacaoTotem;
};

export function useUiTotem(): EstadoUiTotem {
  return useStore((e) => e.ui.totem);
}

/** Totens de um evento (toolbar). */
export function useDispositivos(eventoId: string): Dispositivo[] {
  const dispositivos = useStore((e) => e.banco.dispositivos);
  return useMemo(() => dispositivos.filter((d) => d.eventoId === eventoId), [dispositivos, eventoId]);
}

/** Votos infantis por dispositivo do evento (toolbar; o painel tem a própria contagem). */
export function useVotosInfantisPorDispositivo(eventoId: string): Map<string, number> {
  const votos = useStore((e) => e.banco.votosInfantis);
  return useMemo(() => {
    const contagem = new Map<string, number>();
    for (const v of votos) if (v.eventoId === eventoId) contagem.set(v.dispositivoId, (contagem.get(v.dispositivoId) ?? 0) + 1);
    return contagem;
  }, [votos, eventoId]);
}

/** Visão do quiosque: evento da URL, aparelho pareado, candidatos votáveis e a situação. */
export function useVisaoTotem(): VisaoTotem | null {
  const ativo = useEventoAtivo();
  const { dispositivoId } = useUiTotem();
  const dispositivos = useStore((e) => e.banco.dispositivos);

  return useMemo(() => {
    if (!ativo) return null;
    const achado = dispositivos.find((d) => d.id === dispositivoId);
    const dispositivo = achado && achado.eventoId === ativo.evento.id ? achado : null;
    const candidatos = votaveis(ativo.candidatos);
    return { ativo, dispositivo, candidatos, situacao: situacaoTotem(ativo.evento, dispositivo, candidatos.length) };
  }, [ativo, dispositivos, dispositivoId]);
}
