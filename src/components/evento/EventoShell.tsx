"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEventoAtivo } from "@/store/seletores/evento";
import { GarantiaParticipacao } from "./AcessoEvento";
import { LogoEvento } from "./LogoEvento";
import { MenuUsuario } from "./MenuUsuario";
import { RodapeEvento } from "./RodapeEvento";

/** Casca das rotas públicas do evento (Etapa 2): header com logo e menu, main#conteudo e rodapé. */
export function EventoShell({ children }: { children: ReactNode }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null; // o GateEvento já impede; defensivo para o tipo
  const { slug, evento, tema } = ativo;

  return (
    <>
      <GarantiaParticipacao />
      <header className="w-full border-b border-tema-borda">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={`/e/${slug}`} className="rounded-md">
            <LogoEvento nome={tema.nomeExibicao ?? evento.nome} logoUrl={tema.logoUrl} className="h-9 sm:h-11" prioridade />
          </Link>
          <MenuUsuario />
        </div>
      </header>
      <main id="conteudo" className="flex flex-1 flex-col">
        {children}
      </main>
      <RodapeEvento />
    </>
  );
}
