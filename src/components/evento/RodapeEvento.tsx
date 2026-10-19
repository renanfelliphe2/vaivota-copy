"use client";

import { ExternalLink } from "lucide-react";
import { LogoVaiVota } from "@/components/plataforma/LogoVaiVota";
import { calcularTokens } from "@/lib/tema";
import { useEventoAtivo } from "@/store/seletores/evento";
import { AvisoPrivacidade } from "./AvisoPrivacidade";
import { LogoOrganizador, MARCA_ORGANIZADOR } from "./MarcaOrganizador";

/**
 * Rodapé comum (Etapa 2): nome, "Feito com VaiVota", aviso da plataforma (sempre) e o do evento (opcional).
 * 19/10/2026: faixa clara com o logo do organizador, como a faixa de patrocínio das artes da Maratona Tech Tivit.
 */
export function RodapeEvento() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, tema } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;
  // O texto do logo colorido é cinza: em tema de fundo escuro, vai a versão de texto branco.
  const fundoEscuro = calcularTokens(tema).esquemaCor === "dark";

  return (
    <footer className="w-full bg-tema-fundo text-sm text-tema-texto-suave">
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8 text-center sm:px-6 md:flex-row md:justify-between md:text-left">
        <div className="flex flex-col items-center gap-3 md:flex-row md:gap-5">
          {MARCA_ORGANIZADOR && (
            <>
              <LogoOrganizador marca={MARCA_ORGANIZADOR} claro={fundoEscuro} className="h-14" />
              <span aria-hidden className="hidden h-10 w-px bg-tema-borda md:block" />
            </>
          )}
          <p className="font-display text-base font-extrabold text-tema-texto">{nome}</p>
        </div>
        <div className="flex flex-col items-center gap-1 md:items-end">
          <div className="flex flex-wrap items-center justify-center gap-x-4 md:justify-end">
            <AvisoPrivacidade />
            {evento.avisoPrivacidadeUrl && (
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
            )}
          </div>
          <p className="inline-flex items-center gap-1.5 text-xs">
            Feito com <LogoVaiVota className="h-5" />
          </p>
        </div>
      </div>
    </footer>
  );
}
