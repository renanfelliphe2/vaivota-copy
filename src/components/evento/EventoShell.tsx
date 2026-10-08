"use client";

import type { ReactNode } from "react";
import { useEventoAtivo } from "@/store/seletores/evento";
import { GarantiaParticipacao } from "./AcessoEvento";
import { RodapeEvento } from "./RodapeEvento";

/** Casca das rotas públicas do evento (Etapa 2): main#conteudo e rodapé. O cabeçalho fixo vem do GateEvento. */
export function EventoShell({ children }: { children: ReactNode }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null; // o GateEvento já impede; defensivo para o tipo

  return (
    <>
      <GarantiaParticipacao />
      <main id="conteudo" className="flex flex-1 flex-col">
        {children}
      </main>
      <RodapeEvento />
    </>
  );
}
