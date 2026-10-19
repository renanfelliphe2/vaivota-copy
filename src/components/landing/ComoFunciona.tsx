"use client";

import { ArrowUp, Eye, Lock, Trophy, Vote } from "lucide-react";
import { votaveis } from "@/dominio/candidatos";
import { minusculas } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { Constelacao } from "./Decoracoes";

/**
 * Como funciona (19/10/2026: depois da votação, que é o principal da página). Faixa com o degradê das artes da
 * Maratona Tech Tivit (primária → secundária); o texto é o azul-noite, que passa de 4,5:1 em todo o degradê (o branco
 * não passa no verde).
 */
export function ComoFunciona() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const rotulos = minusculas(ativo.tema.rotuloCandidatos);
  const temCandidatos = votaveis(ativo.candidatos).length > 0;
  const passos = [
    { icone: Eye, titulo: "Conheça", texto: `Veja os ${rotulos} em votação neste evento.` },
    { icone: Vote, titulo: "Vote", texto: "Crie sua conta, escolha seu favorito e confirme. Cada pessoa vota uma vez." },
    { icone: Trophy, titulo: "Acompanhe", texto: "O resultado é divulgado pela organização do evento." },
  ];

  return (
    <section
      aria-labelledby="como-funciona"
      className="relative isolate w-full overflow-hidden bg-linear-to-r from-tema-primaria to-tema-secundaria text-marca-noite"
    >
      <Constelacao className="absolute -right-24 -top-10 -z-10 h-[130%] w-auto text-white opacity-60" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">Passo a passo</p>
          <h2 id="como-funciona" className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3 sm:gap-5">
          {passos.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="flex flex-col gap-4 rounded-3xl bg-tema-fundo p-6 text-tema-texto shadow-lg shadow-marca-noite/10">
              <div className="flex items-center justify-between">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-tema-primaria to-tema-secundaria">
                  <Icone className="size-6 text-marca-noite" />
                </span>
                <span aria-hidden className="font-display text-4xl font-extrabold text-tema-borda">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-xl font-extrabold">{titulo}</h3>
                <p className="text-tema-texto-suave">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 font-semibold">
            <Lock aria-hidden className="size-5 shrink-0" />
            Seu voto é secreto: ele não fica ligado ao seu nome.
          </p>
          {temCandidatos && (
            <a
              href="#candidatos"
              className="inline-flex min-h-12 items-center gap-2 rounded-full bg-marca-noite px-7 font-semibold text-white shadow-lg shadow-marca-noite/25 transition hover:-translate-y-0.5"
            >
              Ver {rotulos}
              <ArrowUp aria-hidden className="size-5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
