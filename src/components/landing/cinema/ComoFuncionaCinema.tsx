"use client";

import { ArrowUp, Eye, Lock, Trophy, Vote } from "lucide-react";
import type { CSSProperties } from "react";
import { votaveis } from "@/dominio/candidatos";
import { minusculas } from "@/lib/rotulos";
import { tokensCinema } from "@/lib/tema";
import { useEventoAtivo } from "@/store/seletores/evento";
import { Rosacea } from "./DecoracoesCinema";

/**
 * Como funciona no estilo cinema (07/11/2026): os três passos em ingressos (canhoto com o número, recortes laterais e a
 * linha picotada), na sala escura entre duas bordas de película. Os textos são os mesmos do estilo padrão.
 */
export function ComoFuncionaCinema() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const rotulos = minusculas(ativo.tema.rotuloCandidatos);
  const temCandidatos = votaveis(ativo.candidatos).length > 0;
  // Evento com categorias (09/11/2026): um voto em cada categoria, e o atalho leva às categorias.
  const comCategorias = ativo.categorias.length > 0;
  const passos = [
    {
      icone: Eye,
      titulo: "Conheça",
      texto: comCategorias ? `Escolha uma categoria e veja os ${rotulos} dela.` : `Veja os ${rotulos} em votação neste evento.`,
    },
    {
      icone: Vote,
      titulo: "Vote",
      texto: comCategorias
        ? "Entre na sua conta, toque no seu favorito e confirme. Você vota uma vez em cada categoria."
        : "Crie sua conta, escolha seu favorito e confirme. Cada pessoa vota uma vez.",
    },
    { icone: Trophy, titulo: "Acompanhe", texto: "O resultado é divulgado pela organização do evento." },
  ];

  return (
    <section
      aria-labelledby="como-funciona"
      style={tokensCinema(ativo.tema) as CSSProperties}
      className="cine-sala relative isolate w-full overflow-clip text-white [--tema-foco:#ffffff]"
    >
      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />
      <div aria-hidden className="cine-grao absolute inset-0 -z-10" />
      <Rosacea className="absolute -bottom-40 -right-44 -z-10 size-[30rem] text-cine-primaria-clara opacity-[0.07]" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cine-primaria-clara">Passo a passo</p>
          <h2 id="como-funciona" className="font-cine text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
        </div>

        <ol className="grid gap-5 sm:grid-cols-3">
          {passos.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="cine-ingresso flex flex-col rounded-2xl bg-tema-fundo text-tema-texto shadow-xl shadow-black/40">
              <div className="flex h-[var(--corte)] items-center justify-between gap-3 px-6">
                <span className="font-cine text-xs font-bold uppercase tracking-[0.24em] text-tema-primaria-texto">Passo</span>
                <span aria-hidden className="font-cine text-3xl font-bold tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div aria-hidden className="mx-6 border-t-2 border-dashed border-tema-borda" />
              <div className="flex flex-1 flex-col gap-3 p-6 pt-5">
                <Icone aria-hidden className="size-6 text-tema-primaria-texto" />
                <h3 className="font-cine text-xl font-bold">{titulo}</h3>
                <p className="text-tema-texto-suave">{texto}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-semibold text-white/90">
            <Lock aria-hidden className="size-5 shrink-0 text-cine-secundaria-clara" />
            Seu voto é secreto: ele não fica ligado ao seu nome.
          </p>
          {temCandidatos && (
            <a
              href={comCategorias ? "#categorias" : "#candidatos"}
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-tema-secundaria px-7 font-semibold text-tema-sobre-secundaria shadow-lg shadow-black/30 transition hover:-translate-y-0.5"
            >
              {comCategorias ? "Ver as categorias" : `Ver ${rotulos}`}
              <ArrowUp aria-hidden className="size-5" />
            </a>
          )}
        </div>
      </div>

      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />
    </section>
  );
}
