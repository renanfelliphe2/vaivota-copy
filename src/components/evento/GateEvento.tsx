"use client";

import type { ReactNode } from "react";
import { SimuladorVotos } from "@/components/dashboard/SimuladorVotos";
import { useEventoAtivo, useSlugAtivo } from "@/store/seletores/evento";
import { EventoNaoEncontrado } from "./EventoNaoEncontrado";

/**
 * D14: validade do slug resolvida no cliente (o slug pode ser renomeado na Etapa 6).
 * Etapa 7 (D12, ajuste mínimo do Anexo C): monta o SimuladorVotos uma única vez por evento.
 */
export function GateEvento({ children }: { children: ReactNode }) {
  const slug = useSlugAtivo();
  const ativo = useEventoAtivo();
  if (!ativo) return <EventoNaoEncontrado slug={slug} />;
  return (
    <>
      <SimuladorVotos eventoId={ativo.evento.id} />
      {children}
    </>
  );
}
