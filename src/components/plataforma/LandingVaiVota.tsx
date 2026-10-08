"use client";

import { ArrowRight, Palette, QrCode, Trophy, Vote } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { TemaEvento } from "@/components/evento/TemaEvento";
import type { CoresTema } from "@/lib/tema";
import { useEventos, useTemas } from "@/store/seletores/evento";
import { LogoVaiVota } from "./LogoVaiVota";

/** Identidade da plataforma em "/": a única tela fora do tema de um evento. */
const TEMA_VAIVOTA: CoresTema = {
  corPrimaria: "#4F46E5",
  corSecundaria: "#F59E0B",
  corFundo: "#FFFFFF",
  corTexto: "#111827",
  fonte: "Space Grotesk",
};

const RECURSOS = [
  {
    icone: Palette,
    titulo: "A cara do seu evento",
    texto: "Logo, cores e textos próprios. Cada evento ganha sua página dedicada.",
  },
  {
    icone: Vote,
    titulo: "Voto do público e do júri",
    texto: "Uma pessoa, um voto. Jurados entram por convite e têm peso próprio.",
  },
  {
    icone: QrCode,
    titulo: "Totem e QR Code",
    texto: "Quem está no local vota pelo celular ou direto no totem.",
  },
  {
    icone: Trophy,
    titulo: "Revelação no telão",
    texto: "O resultado sobe ao palco no momento que a organização escolher.",
  },
];

/**
 * Landing da plataforma (08/10/2026). A landing de cada evento vive em /e/[slug]; aqui ficam a proposta do
 * VaiVota e a lista de eventos publicados (rascunho não aparece).
 */
export function LandingVaiVota() {
  const eventos = useEventos();
  const temas = useTemas();
  const publicados = useMemo(
    () =>
      eventos
        .filter((e) => e.estado !== "RASCUNHO")
        .map((e) => ({ evento: e, nome: temas.find((t) => t.eventoId === e.id)?.nomeExibicao ?? e.nome })),
    [eventos, temas],
  );

  return (
    <TemaEvento tema={TEMA_VAIVOTA} className="flex flex-1 flex-col">
      <header className="w-full border-b border-tema-borda">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-6">
          <Link href="/" className="rounded-md">
            <LogoVaiVota className="h-9 sm:h-10" prioridade />
          </Link>
        </div>
      </header>

      <main id="conteudo" className="flex flex-1 flex-col">
        <section className="w-full bg-gradient-to-b from-tema-primaria/10 to-tema-fundo px-4 py-20 text-center sm:px-6 sm:py-28">
          <LogoVaiVota className="mx-auto mb-10 h-16 sm:h-24" />
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            Votações em eventos, com a identidade de cada evento.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-tema-texto-suave">
            Festivais, mostras e premiações: o público vota pelo celular, o júri pelo convite, e o resultado é revelado
            no telão.
          </p>
          {publicados.length > 0 && (
            <a
              href="#eventos"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-tema-primaria px-8 text-base font-semibold text-tema-sobre-primaria hover:opacity-90"
            >
              Ver eventos
              <ArrowRight aria-hidden className="size-5" />
            </a>
          )}
        </section>

        <section aria-labelledby="recursos" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6">
          <h2 id="recursos" className="text-center text-2xl font-bold sm:text-3xl">
            Como o VaiVota funciona
          </h2>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="text-center">
                <Icone aria-hidden className="mx-auto mb-4 size-8 text-tema-primaria-texto" />
                <h3 className="text-lg font-semibold">{titulo}</h3>
                <p className="mt-2 text-tema-texto-suave">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {publicados.length > 0 && (
          <section aria-labelledby="eventos" className="w-full border-t border-tema-borda bg-tema-superficie">
            <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
              <h2 id="eventos" className="scroll-mt-4 text-2xl font-bold sm:text-3xl">
                Eventos
              </h2>
              <ul className="mt-8 grid gap-4 md:grid-cols-2">
                {publicados.map(({ evento, nome }) => (
                  <li key={evento.id}>
                    <Link
                      href={`/e/${evento.slug}`}
                      className="flex h-full flex-col gap-2 rounded-xl border border-tema-borda bg-tema-fundo p-5 hover:border-tema-primaria"
                    >
                      <span className="text-lg font-semibold">{nome}</span>
                      {evento.descricao && (
                        <span className="line-clamp-2 text-sm text-tema-texto-suave">{evento.descricao}</span>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-tema-primaria-texto">
                        Ir para o evento
                        <ArrowRight aria-hidden className="size-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="flex w-full flex-col items-center gap-2 border-t border-tema-borda px-6 py-6 text-center text-sm text-tema-texto-suave">
        <LogoVaiVota className="h-7" />
        Votações em eventos
      </footer>
    </TemaEvento>
  );
}
