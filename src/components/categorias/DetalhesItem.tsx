"use client";

import { CalendarDays, ChevronDown, ExternalLink, Hash, Heart } from "lucide-react";
import { useState } from "react";
import { AvisoVotoProprio } from "@/components/candidato/AvisoVotoProprio";
import { camposComValor } from "@/components/candidato/CamposExtras";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { VideoCampo } from "@/components/candidato/VideoCampo";
import { formatarValorCampo, hrefDoCampo } from "@/dominio/camposExtras";
import type { CampoCandidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import type { ItemLista } from "@/store/seletores/candidatos";
import { SeloSeuVoto } from "./BotaoFilme";

/** Âncora do bloco de detalhes de um item na página da categoria (o "Ver detalhes" do cartão e o "Ver mais" da revisão). */
export const idDetalhes = (candidatoId: string) => `detalhes-${candidatoId}`;

/** Fichas com mais linhas que isto começam recolhidas ("Ver ficha completa"). */
const FICHA_RECOLHIDA = 6;

type Partes = {
  videos: { campo: CampoCandidato; valor: string }[];
  fatos: { campo: CampoCandidato; valor: string }[];
  descricao: string | null;
  links: { campo: CampoCandidato; valor: string; href: string }[];
  ficha: { campo: CampoCandidato; valor: string }[];
};

/**
 * Os campos do item, separados pelo papel na página (25/11/2026): vídeo em destaque, número e data como etiquetas, a
 * descrição como parágrafo, links como botões e o resto (Direção, Roteiro...) na ficha. Tudo na ordem da configuração.
 */
export function partesDoItem(item: ItemLista, campos: readonly CampoCandidato[]): Partes {
  const partes: Partes = { videos: [], fatos: [], descricao: null, links: [], ficha: [] };
  for (const c of camposComValor(item.candidato, campos)) {
    const href = c.campo.tipo === "LINK" ? hrefDoCampo(c.valor) : null;
    if (c.campo.tipo === "VIDEO") partes.videos.push(c);
    else if (c.campo.tipo === "NUMERO" || c.campo.tipo === "DATA") partes.fatos.push(c);
    else if (c.campo.chave === "descricao" && c.campo.tipo === "TEXTO") partes.descricao = c.valor;
    else if (href) partes.links.push({ ...c, href });
    else partes.ficha.push(c);
  }
  return partes;
}

export function temDetalhesItem(item: ItemLista, campos: readonly CampoCandidato[]): boolean {
  return camposComValor(item.candidato, campos).length > 0;
}

/**
 * O bloco de um item na seção "Conheça" da página da categoria (25/11/2026): cartaz, título, voto e os detalhes que o item
 * tiver. Sem vídeo, o cartaz fica ao lado do texto; com vídeo, o vídeo abre o bloco e o cartaz vira miniatura junto ao título.
 */
export function DetalhesItem({
  item,
  campos,
  clicavel,
  meuVoto,
  cinema,
  rotuloFicha,
  aoVotar,
}: {
  item: ItemLista;
  campos: readonly CampoCandidato[];
  clicavel: boolean;
  meuVoto: boolean;
  cinema: boolean;
  rotuloFicha: string;
  aoVotar: () => void;
}) {
  const { candidato, bloqueadoVotoProprio } = item;
  const { videos, fatos, descricao, links, ficha } = partesDoItem(item, campos);
  const [fichaAberta, setFichaAberta] = useState(false);
  const comVideo = videos.length > 0;
  const tituloId = `titulo-${idDetalhes(candidato.id)}`;
  const dicaId = `dica-detalhes-${candidato.id}`;
  const fichaVisivel = fichaAberta ? ficha : ficha.slice(0, FICHA_RECOLHIDA);
  const fonteTitulo = cinema ? "font-cine font-bold" : "font-display font-extrabold";

  const cartaz = (classe: string, sizes: string) => (
    <div className={cx("relative shrink-0 overflow-hidden rounded-2xl shadow-md ring-1 ring-tema-borda/80", classe)}>
      <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="5/7" sizes={sizes} />
      {meuVoto && <SeloSeuVoto />}
    </div>
  );

  return (
    <article
      id={idDetalhes(candidato.id)}
      aria-labelledby={tituloId}
      className={cx(
        "scroll-mt-6 overflow-hidden rounded-3xl bg-tema-fundo p-4 sm:p-6 lg:p-8",
        meuVoto ? "ring-4 ring-tema-primaria" : "shadow-sm ring-1 ring-tema-borda/80",
      )}
    >
      <div className={cx("grid gap-6", !comVideo && "sm:grid-cols-[minmax(0,13rem)_1fr] lg:grid-cols-[15rem_1fr] lg:gap-10")}>
        {!comVideo && cartaz("w-40 sm:w-full", "(min-width: 1024px) 15rem, (min-width: 640px) 13rem, 10rem")}

        <div className="flex min-w-0 flex-col gap-5">
          {videos.map(({ campo, valor }) => (
            <VideoCampo key={campo.id} valor={valor} titulo={`${campo.rotulo}: ${candidato.titulo}`} />
          ))}

          <div className="flex items-start gap-4">
            {comVideo && cartaz("w-16 sm:w-20", "5rem")}
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <h3 id={tituloId} tabIndex={-1} className={cx("text-2xl leading-tight tracking-tight wrap-anywhere sm:text-3xl", fonteTitulo)}>
                {candidato.titulo}
              </h3>
              {fatos.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {fatos.map(({ campo, valor }) => {
                    const Icone = campo.tipo === "DATA" ? CalendarDays : Hash;
                    return (
                      <li key={campo.id} className="inline-flex items-center gap-1.5 rounded-full bg-tema-superficie px-3 py-1 text-sm ring-1 ring-tema-borda">
                        <Icone aria-hidden className="size-3.5 text-tema-primaria-texto" />
                        <span className="text-tema-texto-suave">{campo.rotulo}:</span>
                        <span className="font-semibold">{formatarValorCampo(campo.tipo, valor)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {descricao && <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed sm:text-lg">{descricao}</p>}

          {links.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {links.map(({ campo, valor, href }) => (
                <li key={campo.id}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-tema-primaria-texto ring-1 ring-tema-borda transition hover:ring-tema-primaria"
                    title={formatarValorCampo("LINK", valor)}
                  >
                    {campo.rotulo}
                    <ExternalLink aria-hidden className="size-4" />
                    <span className="sr-only">(abre em outra aba)</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {ficha.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-tema-borda pt-5">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-tema-primaria-texto">{rotuloFicha}</h4>
              <dl id={`ficha-${candidato.id}`} className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                {fichaVisivel.map(({ campo, valor }) => (
                  <div key={campo.id} className="flex min-w-0 flex-col gap-0.5">
                    <dt className="text-sm text-tema-texto-suave">{campo.rotulo}</dt>
                    <dd className="font-medium leading-snug wrap-anywhere">{formatarValorCampo(campo.tipo, valor)}</dd>
                  </div>
                ))}
              </dl>
              {ficha.length > FICHA_RECOLHIDA && (
                <button
                  type="button"
                  aria-expanded={fichaAberta}
                  aria-controls={`ficha-${candidato.id}`}
                  onClick={() => setFichaAberta((a) => !a)}
                  className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 self-start rounded-full text-sm font-semibold text-tema-primaria-texto hover:underline"
                >
                  {fichaAberta ? "Mostrar menos" : `Ver tudo (mais ${ficha.length - FICHA_RECOLHIDA})`}
                  <ChevronDown aria-hidden className={cx("size-4 transition", fichaAberta && "rotate-180")} />
                </button>
              )}
            </div>
          )}

          {bloqueadoVotoProprio && <AvisoVotoProprio dicaId={dicaId} />}
          {clicavel && !bloqueadoVotoProprio && (
            <button
              type="button"
              onClick={aoVotar}
              className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 self-start rounded-full bg-tema-primaria px-6 font-semibold text-tema-sobre-primaria shadow-md transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Heart aria-hidden className="size-5" />
              Votar em {candidato.titulo}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
