"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Carrossel } from "@/components/categorias/Carrossel";
import { CASAS_DO_HERO } from "@/dominio/rotacaoCartazes";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { QuadroContagem } from "./DecoracoesCinema";
import { DURACAO_FITA_MS, type RotacaoCartazes } from "./useRotacaoCartazes";

// Película do hero do estilo cinema (07/11/2026): os cartazes dos candidatos em quadros de filme. Cada cartaz leva ao
// cartão dele na lista e o destaca (DestaqueCandidato), como o mosaico do estilo padrão. Sem cartaz, os quadros mostram a
// contagem regressiva do começo do filme (6, 5, 4...) e a película inteira é decorativa.
//
// 23/11/2026: seis casas em três fitas. De tempos em tempos uma fita troca de filmes (useRotacaoCartazes).
// 24/11/2026: a fita inteira corre e os dois quadros mudam juntos: os velhos sobem e saem pela ponta da fita, os novos entram
// por baixo com o brilho do projetor e os furos passam junto.
// 25/11/2026: a troca de dois em dois fica só no desktop. No tablet, todos os cartazes num carrossel infinito comum; no
// celular, sem película. Cada cartaz leva aos detalhes do filme na página da categoria.

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

/** Uma casa da película: o cartaz (botão que leva aos detalhes do filme) ou a contagem. A troca é animada pela fita (TiraDePe). */
function Quadro({ casa, aoEscolher, tamanhos }: { casa: Casa; aoEscolher: (id: string) => void; tamanhos: string }) {
  return (
    <div
      className={cx(
        "group/quadro relative block w-full overflow-hidden bg-black ring-1 ring-white/10 transition duration-300 ease-out",
        casa.tipo === "cartaz" && "hover:-translate-y-1 hover:ring-2 hover:ring-cine-luz has-focus-visible:-translate-y-1 has-focus-visible:ring-2 has-focus-visible:ring-white",
      )}
    >
      {casa.tipo === "contagem" ? (
        <Conteudo casa={casa} tamanhos={tamanhos} />
      ) : (
        <button
          type="button"
          data-gatilho-destaque=""
          aria-label={`Ver detalhes de ${casa.candidato.titulo}`}
          onClick={() => aoEscolher(casa.candidato.id)}
          className="relative block w-full cursor-pointer overflow-hidden focus-visible:outline-none"
        >
          <Conteudo casa={casa} tamanhos={tamanhos} />
        </button>
      )}
    </div>
  );
}

/** Furos de uma fita de pé. Cada troca (`pulso`) recomeça a corrida dos furos, que passam como a película puxada pelo projetor. */
function Furos({ pulso, className }: { pulso: number; className: string }) {
  return <span key={pulso} aria-hidden className={cx("cine-furos-v", pulso > 0 && "cine-furos-correm-v", className)} />;
}

type Corrida = { saindo: Casa[]; entrando: ReadonlySet<string> };

/**
 * Tira de pé, com os furos nas duas bordas: dois quadros. Quando os filmes dela mudam, a fita inteira corre: os quadros que
 * saem ficam acima dos novos (fora da janela, sem clique e escondidos de leitor de tela) e tudo sobe junto, `--passos`
 * quadros, até os novos ocuparem o lugar. Os que saem somem pela ponta de cima da fita (overflow-hidden).
 */
function TiraDePe({ lista, pulso, aoEscolher }: { lista: Casa[]; pulso: number; aoEscolher: (id: string) => void }) {
  const [vista, setVista] = useState(lista);
  const [corrida, setCorrida] = useState<Corrida | null>(null);
  // Ajuste no próprio render, como no Quadro: guarda o que saiu e o que entrou.
  if (lista.map(chaveDaCasa).join("|") !== vista.map(chaveDaCasa).join("|")) {
    const ficam = new Set(lista.map(chaveDaCasa));
    const estavam = new Set(vista.map(chaveDaCasa));
    setCorrida({ saindo: vista.filter((c) => !ficam.has(chaveDaCasa(c))), entrando: new Set([...ficam].filter((k) => !estavam.has(k))) });
    setVista(lista);
  }
  useEffect(() => {
    if (!corrida) return;
    const fim = setTimeout(() => setCorrida(null), DURACAO_FITA_MS + 80);
    return () => clearTimeout(fim);
  }, [corrida]);

  const passos = corrida?.saindo.length ?? 0;
  return (
    <div
      className="relative overflow-hidden bg-cine-pelicula px-[1.125rem] py-3 shadow-2xl shadow-black/60 ring-1 ring-white/5 [--passo-furos:132px] xl:[--passo-furos:154px]"
      style={{ "--passos": passos } as CSSProperties}
    >
      <Furos pulso={pulso} className="absolute inset-y-0 left-0 w-[1.125rem]" />
      <Furos pulso={pulso} className="absolute inset-y-0 right-0 w-[1.125rem]" />
      <ul className="relative flex flex-col gap-3">
        {corrida?.saindo.map((casa, j) => (
          <li
            key={`saindo-${chaveDaCasa(casa)}`}
            aria-hidden
            inert
            className="cine-fita-sai pointer-events-none absolute inset-x-0 top-0"
            style={{ translate: `0 calc(${j - passos} * (100% + 0.75rem))` }}
          >
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="9rem" />
          </li>
        ))}
        {lista.map((casa) => (
          <li key={chaveDaCasa(casa)} className={cx(passos > 0 && (corrida?.entrando.has(chaveDaCasa(casa)) ? "cine-fita-entra" : "cine-fita-passa"))}>
            <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="9rem" />
          </li>
        ))}
      </ul>
      {passos > 0 && <span key={pulso} aria-hidden className="cine-fita-clarao pointer-events-none absolute inset-0 bg-cine-luz" />}
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
          <TiraDePe lista={fita.casas.map((c) => casas[c])} pulso={trocas[i] ?? 0} aoEscolher={aoEscolher} />
        </div>
      ))}
    </div>
  );
}

/**
 * Tablet (25/11/2026): uma tira deitada, de ponta a ponta, com TODOS os cartazes num carrossel infinito comum (o mesmo das
 * categorias), sem a troca de dois em dois do desktop. Sem filmes, a contagem regressiva parada e decorativa.
 */
export function PeliculaCarrossel({ candidatos, aoEscolher }: { candidatos: readonly Candidato[]; aoEscolher: (candidatoId: string) => void }) {
  const decorativa = candidatos.length === 0;
  const casas = decorativa ? montarCasas([], []) : candidatos.map((candidato): Casa => ({ tipo: "cartaz", candidato }));
  return (
    <div {...(decorativa ? { "aria-hidden": true } : {})} className="relative bg-cine-pelicula py-[1.125rem] shadow-2xl shadow-black/60">
      <span aria-hidden className="cine-furos-h absolute inset-x-0 top-0 h-[1.125rem]" />
      <span aria-hidden className="cine-furos-h absolute inset-x-0 bottom-0 h-[1.125rem]" />
      <div className="px-6">
        <Carrossel
          itens={casas}
          chave={chaveDaCasa}
          rotulo="Filmes em cartaz"
          classeItem="w-28"
          render={(casa) => <Quadro casa={casa} aoEscolher={aoEscolher} tamanhos="7rem" />}
        />
      </div>
    </div>
  );
}
