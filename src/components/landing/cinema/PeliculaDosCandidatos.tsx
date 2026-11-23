"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { CASAS_DO_HERO } from "@/dominio/rotacaoCartazes";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { QuadroContagem } from "./DecoracoesCinema";
import { DURACAO_TROCA_MS, type RotacaoCartazes } from "./useRotacaoCartazes";

// Película do hero do estilo cinema (07/11/2026): os cartazes dos candidatos em quadros de filme. Cada cartaz leva ao
// cartão dele na lista e o destaca (DestaqueCandidato), como o mosaico do estilo padrão. Sem cartaz, os quadros mostram a
// contagem regressiva do começo do filme (6, 5, 4...) e a película inteira é decorativa.
//
// 23/11/2026: seis casas em três fitas. De tempos em tempos uma casa troca de filme (useRotacaoCartazes) com a película correndo:
// o quadro velho sobe e sai pela fita, o novo entra de baixo com o clarão do projetor e os furos da fita passam. No celular a
// fita é deitada e a película corre de lado.

type Casa = { tipo: "cartaz"; candidato: Candidato } | { tipo: "contagem"; numero: number };

const chaveDaCasa = (casa: Casa) => (casa.tipo === "cartaz" ? casa.candidato.id : `contagem-${casa.numero}`);

/** As seis casas: os filmes que a rotação pôs em cada uma e, faltando filme, a contagem regressiva até completar. */
export function montarCasas(candidatos: readonly Candidato[], ids: readonly string[]): Casa[] {
  const porId = new Map(candidatos.map((c) => [c.id, c]));
  const lista: Casa[] = [];
  for (const id of ids) {
    const candidato = porId.get(id);
    if (candidato) lista.push({ tipo: "cartaz", candidato });
  }
  for (let numero = CASAS_DO_HERO - lista.length; numero >= 1; numero--) lista.push({ tipo: "contagem", numero });
  return lista;
}

type Eixo = "v" | "h";
type PropsPelicula = { casas: Casa[]; trocas: readonly number[]; decorativa: boolean; rotacao: RotacaoCartazes; aoEscolher: (candidatoId: string) => void };

/** O desenho de um quadro (cartaz e título que sobe no hover, ou a contagem). */
function Conteudo({ casa, tamanhos }: { casa: Casa; tamanhos: string }) {
  if (casa.tipo === "contagem") return <QuadroContagem numero={casa.numero} />;
  return (
    <>
      <ImagemCandidato
        titulo={casa.candidato.titulo}
        imagemUrl={casa.candidato.imagemUrl}
        proporcao="5/7"
        sizes={tamanhos}
        className="transition-transform duration-500 group-hover/quadro:scale-105"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-black/85 to-transparent px-2 pb-2 pt-6 text-left text-xs font-bold text-white transition-transform duration-300 group-hover/quadro:translate-y-0 group-has-focus-visible/quadro:translate-y-0"
      >
        <span className="line-clamp-2">{casa.candidato.titulo}</span>
      </span>
    </>
  );
}

/**
 * Uma casa da película. Quando o filme dela muda, o quadro que saía fica por cima (sem clique, escondido de leitor de tela)
 * enquanto a película corre: o velho sai, o novo entra, e um clarão de projetor cobre a emenda.
 */
function Quadro({ casa, aoEscolher, tamanhos, eixo }: { casa: Casa; aoEscolher: (id: string) => void; tamanhos: string; eixo: Eixo }) {
  const [visto, setVisto] = useState(casa);
  const [saindo, setSaindo] = useState<Casa | null>(null);
  // Ajuste no próprio render (padrão do React para "estado derivado do que veio por prop"): guarda o que saiu.
  if (chaveDaCasa(casa) !== chaveDaCasa(visto)) {
    setSaindo(visto);
    setVisto(casa);
  }
  useEffect(() => {
    if (!saindo) return;
    const fim = setTimeout(() => setSaindo(null), DURACAO_TROCA_MS + 80);
    return () => clearTimeout(fim);
  }, [saindo]);

  return (
    <div
      className={cx(
        "group/quadro relative block w-full overflow-hidden bg-black ring-1 ring-white/10 transition duration-300 ease-out",
        casa.tipo === "cartaz" && "hover:-translate-y-1 hover:ring-2 hover:ring-cine-luz has-focus-visible:-translate-y-1 has-focus-visible:ring-2 has-focus-visible:ring-white",
      )}
    >
      <div key={chaveDaCasa(casa)} className={cx("relative", saindo && `cine-quadro-entra-${eixo}`)}>
        {casa.tipo === "contagem" ? (
          <Conteudo casa={casa} tamanhos={tamanhos} />
        ) : (
          <button
            type="button"
            data-gatilho-destaque=""
            aria-label={`Ver ${casa.candidato.titulo} na lista`}
            onClick={() => aoEscolher(casa.candidato.id)}
            className="relative block w-full cursor-pointer overflow-hidden focus-visible:outline-none"
          >
            <Conteudo casa={casa} tamanhos={tamanhos} />
          </button>
        )}
      </div>
      {saindo && (
        <>
          <div aria-hidden inert key={`saindo-${chaveDaCasa(saindo)}`} className={cx("pointer-events-none absolute inset-0 overflow-hidden bg-black", `cine-quadro-sai-${eixo}`)}>
            <Conteudo casa={saindo} tamanhos={tamanhos} />
          </div>
          <span aria-hidden className="cine-quadro-clarao pointer-events-none absolute inset-0 bg-cine-luz" />
        </>
      )}
    </div>
  );
}

/** Furos de uma fita. Cada troca (`pulso`) recomeça a corrida dos furos, que passam como a película puxada pelo projetor. */
function Furos({ eixo, pulso, className }: { eixo: Eixo; pulso: number; className: string }) {
  return <span key={pulso} aria-hidden className={cx(eixo === "v" ? "cine-furos-v" : "cine-furos-h", pulso > 0 && `cine-furos-correm-${eixo}`, className)} />;
}

/** Tira de pé, com os furos nas duas bordas: dois quadros. */
function TiraDePe({ lista, pulso, aoEscolher }: { lista: Casa[]; pulso: number; aoEscolher: (id: string) => void }) {
  return (
    <div className="relative bg-cine-pelicula px-[1.125rem] py-3 shadow-2xl shadow-black/60 ring-1 ring-white/5">
      <Furos eixo="v" pulso={pulso} className="absolute inset-y-0 left-0 w-[1.125rem]" />
      <Furos eixo="v" pulso={pulso} className="absolute inset-y-0 right-0 w-[1.125rem]" />
      <ul className="flex flex-col gap-3">
        {lista.map((casa, i) => (
          <li key={i}>
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="9rem" eixo="v" />
          </li>
        ))}
      </ul>
    </div>
  );
}

const FITAS = [
  { casas: [0, 1], deslocamento: "translate-y-0", duracao: 7 },
  { casas: [2, 3], deslocamento: "translate-y-14", duracao: 8 },
  { casas: [4, 5], deslocamento: "translate-y-4", duracao: 9 },
];

/**
 * Desktop: três fitas de pé, inclinadas, com dois quadros cada (seis cartazes). Cada fita flutua no seu tempo e fica numa
 * altura, como as colunas do mosaico do estilo padrão.
 */
export function PeliculaTripla({ casas, trocas, decorativa, rotacao, aoEscolher }: PropsPelicula) {
  return (
    <div
      {...rotacao.pausa}
      {...(decorativa ? { "aria-hidden": true } : { role: "group", "aria-label": "Atalhos para a lista" })}
      className="relative mx-auto flex w-full max-w-[26rem] -rotate-6 justify-center gap-3 xl:max-w-[29rem] xl:gap-4"
    >
      <div aria-hidden className="absolute inset-12 -z-10 rounded-full bg-tema-primaria/25 blur-3xl" />
      {FITAS.map((fita, i) => (
        <div
          key={i}
          className={cx("marca-flutuar w-32 xl:w-36", fita.deslocamento)}
          style={{ "--atraso": `${-i * 2300}ms`, "--dur": `${fita.duracao}s` } as CSSProperties}
        >
          <TiraDePe lista={fita.casas.map((c) => casas[c])} pulso={fita.casas.reduce((s, c) => s + (trocas[c] ?? 0), 0)} aoEscolher={aoEscolher} />
        </div>
      ))}
    </div>
  );
}

/** Celular e tablet: uma tira deitada, de ponta a ponta, com as seis casas; a película corre de lado nas trocas. */
export function PeliculaDeitada({ casas, trocas, decorativa, rotacao, aoEscolher }: PropsPelicula) {
  const pulso = trocas.reduce((s, n) => s + n, 0);
  return (
    <div
      {...rotacao.pausa}
      {...(decorativa ? { "aria-hidden": true } : { role: "group", "aria-label": "Atalhos para a lista" })}
      className="relative bg-cine-pelicula py-[1.125rem] shadow-2xl shadow-black/60"
    >
      <Furos eixo="h" pulso={pulso} className="absolute inset-x-0 top-0 h-[1.125rem]" />
      <Furos eixo="h" pulso={pulso} className="absolute inset-x-0 bottom-0 h-[1.125rem]" />
      <ul className="flex snap-x gap-2.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-6">
        {casas.map((casa, i) => (
          <li key={i} className="w-24 shrink-0 snap-start sm:w-28">
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="7rem" eixo="h" />
          </li>
        ))}
      </ul>
    </div>
  );
}
