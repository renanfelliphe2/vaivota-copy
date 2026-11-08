"use client";

import type { CSSProperties } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { QuadroContagem } from "./DecoracoesCinema";

// Película do hero do estilo cinema (07/11/2026): os cartazes dos candidatos em quadros de filme. Cada cartaz leva ao
// cartão dele na lista e o destaca (DestaqueCandidato), como o mosaico do estilo padrão. Sem cartaz, os quadros mostram a
// contagem regressiva do começo do filme (4, 3, 2, 1) e a película inteira é decorativa.

type Casa = { tipo: "cartaz"; candidato: Candidato } | { tipo: "contagem"; numero: number };

const CASAS_NA_DUPLA = 4;

/** As casas da película: os cartazes na ordem da lista e, faltando, a contagem regressiva até completar `minimo`. */
function casas(candidatos: readonly Candidato[], minimo: number): Casa[] {
  const lista: Casa[] = candidatos.map((candidato) => ({ tipo: "cartaz", candidato }));
  for (let numero = minimo - lista.length; numero >= 1; numero--) lista.push({ tipo: "contagem", numero });
  return lista;
}

type PropsPelicula = { candidatos: readonly Candidato[]; aoEscolher: (candidatoId: string) => void };

function Quadro({ casa, aoEscolher, tamanhos }: { casa: Casa; aoEscolher: (id: string) => void; tamanhos: string }) {
  if (casa.tipo === "contagem") return <QuadroContagem numero={casa.numero} className="ring-1 ring-white/10" />;
  const { candidato } = casa;
  // Hover e foco: o quadro sobe e ganha o anel de luz; o cartaz aproxima e o título sobe da base.
  return (
    <button
      type="button"
      data-gatilho-destaque=""
      aria-label={`Ver ${candidato.titulo} na lista`}
      onClick={() => aoEscolher(candidato.id)}
      className="group/quadro relative block w-full cursor-pointer overflow-hidden bg-black ring-1 ring-white/10 transition duration-300 ease-out hover:-translate-y-1 hover:ring-2 hover:ring-cine-luz focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-white"
    >
      <ImagemCandidato
        titulo={candidato.titulo}
        imagemUrl={candidato.imagemUrl}
        proporcao="5/7"
        sizes={tamanhos}
        className="transition-transform duration-500 group-hover/quadro:scale-105"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/85 to-transparent px-2 pb-2 pt-6 text-left text-xs font-bold text-white transition-transform duration-300 group-hover/quadro:translate-y-0 group-focus-visible/quadro:translate-y-0"
      >
        <span className="line-clamp-2">{candidato.titulo}</span>
      </span>
    </button>
  );
}

/** Tira de pé, com os furos nas duas bordas. */
function TiraDePe({ lista, aoEscolher }: { lista: Casa[]; aoEscolher: (id: string) => void }) {
  return (
    <div className="relative bg-cine-pelicula px-[1.125rem] py-3 shadow-2xl shadow-black/60 ring-1 ring-white/5">
      <span aria-hidden className="cine-furos-v absolute inset-y-0 left-0 w-[1.125rem]" />
      <span aria-hidden className="cine-furos-v absolute inset-y-0 right-0 w-[1.125rem]" />
      <ul className="flex flex-col gap-3">
        {lista.map((casa) => (
          <li key={casa.tipo === "cartaz" ? casa.candidato.id : `contagem-${casa.numero}`}>
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="9rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Desktop: duas tiras de pé, inclinadas, com até quatro quadros (dois em cada). Cada tira flutua no seu tempo e a segunda
 * fica mais baixa, como as colunas do mosaico do estilo padrão. Com mais de quatro candidatos, vão os quatro primeiros.
 */
export function PeliculaDupla({ candidatos, aoEscolher }: PropsPelicula) {
  const todas = casas(candidatos.slice(0, CASAS_NA_DUPLA), CASAS_NA_DUPLA);
  const colunas = [todas.slice(0, 2), todas.slice(2, 4)];
  const decorativa = candidatos.length === 0;
  return (
    <div
      {...(decorativa ? { "aria-hidden": true } : { role: "group", "aria-label": "Atalhos para a lista" })}
      className="relative mx-auto flex w-full max-w-[23rem] -rotate-6 justify-center gap-5"
    >
      <div aria-hidden className="absolute inset-12 -z-10 rounded-full bg-tema-primaria/25 blur-3xl" />
      {colunas.map((lista, i) => (
        <div
          key={i}
          className={cx("marca-flutuar w-40", i === 1 && "translate-y-14")}
          style={{ "--atraso": `${-i * 2300}ms`, "--dur": `${7 + i}s` } as CSSProperties}
        >
          <TiraDePe lista={lista} aoEscolher={aoEscolher} />
        </div>
      ))}
    </div>
  );
}

/** Celular e tablet: uma tira deitada, de ponta a ponta, que rola para o lado com todos os cartazes. */
export function PeliculaDeitada({ candidatos, aoEscolher }: PropsPelicula) {
  const lista = casas(candidatos, CASAS_NA_DUPLA);
  const decorativa = candidatos.length === 0;
  return (
    <div
      {...(decorativa ? { "aria-hidden": true } : { role: "group", "aria-label": "Atalhos para a lista" })}
      className="relative bg-cine-pelicula py-[1.125rem] shadow-2xl shadow-black/60"
    >
      <span aria-hidden className="cine-furos-h absolute inset-x-0 top-0 h-[1.125rem]" />
      <span aria-hidden className="cine-furos-h absolute inset-x-0 bottom-0 h-[1.125rem]" />
      <ul className="flex snap-x gap-2.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-6">
        {lista.map((casa) => (
          <li key={casa.tipo === "cartaz" ? casa.candidato.id : `contagem-${casa.numero}`} className="w-24 shrink-0 snap-start sm:w-28">
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="7rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}
