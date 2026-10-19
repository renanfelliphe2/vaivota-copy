"use client";

import type { ReactNode } from "react";
import { CabecalhoEvento } from "@/components/nav/CabecalhoEvento";
import { useEventoAtivo, useSlugAtivo } from "@/store/seletores/evento";
import { EventoNaoEncontrado } from "./EventoNaoEncontrado";

/**
 * D14: validade do slug resolvida no cliente (o slug pode ser renomeado na Etapa 6).
 * 08/10/2026: monta o cabeçalho fixo de todas as telas do evento (ele mesmo some no totem e no palco).
 * O simulador de votos do protótipo (Etapa 7) não existe no MVP da Maratona Tech Tivit: os votos são sempre reais.
 */
export function GateEvento({ children }: { children: ReactNode }) {
  const slug = useSlugAtivo();
  const ativo = useEventoAtivo();
  if (!ativo) return <EventoNaoEncontrado slug={slug} />;
  return (
    <>
      <CabecalhoEvento />
      {children}
    </>
  );
}
