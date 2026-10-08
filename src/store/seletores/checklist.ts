"use client";

import { useMemo } from "react";
import { avaliarChecklist, montarEntradaChecklist, type EntradaChecklist, type ItemChecklist } from "@/dominio/checklistAtivacao";
import { resolverTravas, type Travas } from "@/dominio/travas";
import { useAgora, useStore } from "../AppProvider";
import { useEventoAtivo } from "./evento";

/**
 * Etapa 6 (D10): entrada do checklist do evento ativo, só com valores públicos e contagens (nunca hash).
 * Reativa, sem latência. O serviço de operação revalida com a mesma função pura.
 */
export function useEntradaChecklist(): EntradaChecklist | null {
  const ativo = useEventoAtivo();
  const agora = useAgora();
  const banco = useStore((e) => e.banco);
  const eventoId = ativo?.evento.id;
  // Arredonda o relógio ao minuto: o checklist não precisa mudar a cada tique de 1 s.
  const minuto = Math.floor(agora / 60_000) * 60_000;
  return useMemo(() => (eventoId ? montarEntradaChecklist({ banco }, eventoId, minuto) : null), [banco, eventoId, minuto]);
}

export function useChecklist(): ItemChecklist[] | null {
  const entrada = useEntradaChecklist();
  return useMemo(() => (entrada ? avaliarChecklist(entrada) : null), [entrada]);
}

/** Travas do evento ativo (D3): nível e motivo de cada ação. */
export function useTravas(): Travas | null {
  const ativo = useEventoAtivo();
  const conviteUsado = useStore((e) =>
    ativo ? e.banco.convitesJurado.some((c) => c.eventoId === ativo.evento.id && c.estado === "USADO") : false,
  );
  const evento = ativo?.evento;
  return useMemo(() => (evento ? resolverTravas(evento, { conviteUsado }) : null), [evento, conviteUsado]);
}
