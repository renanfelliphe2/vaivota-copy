"use client";

import { Heart } from "lucide-react";
import { AvisoVotoProprio } from "@/components/candidato/AvisoVotoProprio";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { cx } from "@/lib/classes";
import type { ItemLista } from "@/store/seletores/candidatos";

/**
 * O botão do filme (organograma: imagem + título), na página da categoria e, desde 25/11/2026 (B1), no carrossel da landing.
 * Clicável, o cartão inteiro é o botão ("Votar em <título>"); na leitura, o mesmo cartão sem ação. Nunca mostra número de votos.
 */
export function BotaoFilme({
  item,
  clicavel,
  meuVoto = false,
  cinema,
  aoTocar,
  sizes = "(min-width: 1152px) 17rem, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw",
  compacto = false,
}: {
  item: ItemLista;
  clicavel: boolean;
  /** O item em que a pessoa votou (24/11/2026): selo "Seu voto" e moldura na cor do tema. */
  meuVoto?: boolean;
  cinema: boolean;
  aoTocar: () => void;
  sizes?: string;
  /** Cartão menor (carrossel da landing): título e botão em tamanho de lista. */
  compacto?: boolean;
}) {
  const { candidato, bloqueadoVotoProprio } = item;
  const dicaId = `dica-voto-proprio-${candidato.id}`;
  const conteudo = (
    <>
      <div className="relative overflow-hidden">
        <ImagemCandidato
          titulo={candidato.titulo}
          imagemUrl={candidato.imagemUrl}
          proporcao="5/7"
          className={cx("transition-transform duration-500", clicavel && "group-hover:scale-105")}
          sizes={sizes}
        />
        {clicavel && (
          <span
            aria-hidden
            className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-full bg-tema-fundo/90 text-tema-primaria shadow-md ring-1 ring-tema-borda transition group-hover:scale-110 sm:right-3 sm:top-3"
          >
            <Heart className="size-5" />
          </span>
        )}
        {meuVoto && <SeloSeuVoto />}
      </div>
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <div className={cx("flex flex-1 flex-col gap-2 text-left", compacto ? "p-3" : "p-3 sm:p-4")}>
        <h3
          className={cx(
            "line-clamp-3 leading-snug tracking-tight wrap-anywhere",
            compacto ? "text-sm sm:text-base" : "text-base sm:text-lg",
            cinema ? "font-cine font-bold" : "font-display font-extrabold",
          )}
        >
          {candidato.titulo}
        </h3>
        {bloqueadoVotoProprio && <AvisoVotoProprio dicaId={dicaId} />}
        {clicavel && (
          <span aria-hidden className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-tema-primaria px-4 text-sm font-semibold text-tema-sobre-primaria">
            <Heart className="size-4" />
            Votar
          </span>
        )}
      </div>
    </>
  );
  const classes = cx(
    "group relative isolate flex w-full flex-col overflow-hidden rounded-2xl bg-tema-fundo sm:rounded-3xl",
    meuVoto ? "shadow-lg shadow-tema-primaria/25 ring-4 ring-tema-primaria" : "shadow-sm ring-1 ring-tema-borda/80",
  );
  if (!clicavel)
    return (
      <article aria-label={meuVoto ? `${candidato.titulo} (seu voto)` : candidato.titulo} aria-describedby={bloqueadoVotoProprio ? dicaId : undefined} className={classes}>
        {conteudo}
      </article>
    );
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={`Votar em ${candidato.titulo}`}
      className={cx(classes, "cursor-pointer transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15 active:scale-[0.98]")}
    >
      {conteudo}
    </button>
  );
}

/** Selo sobre o cartaz do item em que a pessoa votou (24/11/2026). */
export function SeloSeuVoto() {
  return (
    <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-tema-primaria px-3 py-1 text-xs font-bold text-tema-sobre-primaria shadow-md sm:left-3 sm:top-3 sm:text-sm">
      <Heart aria-hidden className="size-3.5 fill-current sm:size-4" />
      Seu voto
    </span>
  );
}
