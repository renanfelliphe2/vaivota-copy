"use client";

import type { ReactNode } from "react";
import { Parceiros } from "@/components/landing/Parceiros";
import { useEventoAtivo } from "@/store/seletores/evento";
import { GarantiaParticipacao } from "./AcessoEvento";
import { useIdentidadePagina } from "./identidadePagina";
import { RodapeEvento } from "./RodapeEvento";

/**
 * Casca das rotas públicas do evento (Etapa 2): main#conteudo e rodapé. O cabeçalho fixo vem do GateEvento.
 * 09/11/2026 (organograma do Festival): em evento com categorias, os logos dos parceiros vão ao pé de TODAS as páginas do
 * evento (a página inicial, a de cada categoria e as de acesso), logo acima do rodapé.
 */
export function EventoShell({ children }: { children: ReactNode }) {
  const ativo = useEventoAtivo();
  const cinema = useIdentidadePagina().estilo === "cinema";
  if (!ativo) return null; // o GateEvento já impede; defensivo para o tipo

  return (
    <>
      <GarantiaParticipacao />
      <main id="conteudo" className="flex flex-1 flex-col">
        {children}
      </main>
      {ativo.categorias.length > 0 && <Parceiros cinema={cinema} />}
      <RodapeEvento />
    </>
  );
}
