"use client";

import { resolverSituacaoEvento, type OpcoesSituacao, type SituacaoEvento } from "@/dominio/situacaoEvento";
import { useAgora } from "../AppProvider";
import { useEventoAtivo } from "./evento";

/** Situação do evento ativo no relógio simulado (Etapa 1). null se não há evento. */
export function useSituacaoEvento(opcoes?: OpcoesSituacao): SituacaoEvento | null {
  const ativo = useEventoAtivo();
  const agora = useAgora();
  if (!ativo) return null;
  return resolverSituacaoEvento(ativo.evento, ativo.configApresentacao, agora, opcoes);
}
