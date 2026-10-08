"use client";

import { ExternalLink } from "lucide-react";
import { useEventoAtivo } from "@/store/seletores/evento";
import { AvisoPrivacidade } from "./AvisoPrivacidade";

/** Rodapé comum (Etapa 2): nome, "Feito com VaiVota", aviso da plataforma (sempre) e o do evento (opcional). */
export function RodapeEvento() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, tema } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;

  return (
    <footer className="w-full border-t border-tema-borda px-6 py-6 text-sm text-tema-texto-suave">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 text-center sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
        <p className="font-medium text-tema-texto">{nome}</p>
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <AvisoPrivacidade />
        {evento.avisoPrivacidadeUrl && (
          <>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <a
              href={evento.avisoPrivacidadeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 underline underline-offset-2 hover:no-underline"
            >
              Aviso de privacidade do evento
              <ExternalLink aria-hidden className="size-3.5" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </>
        )}
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <p className="text-xs">Feito com VaiVota</p>
      </div>
    </footer>
  );
}
