"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { AvisoVotoProprio } from "@/components/candidato/AvisoVotoProprio";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { cx } from "@/lib/classes";
import type { ItemLista } from "@/store/seletores/candidatos";

/**
 * O cartão do filme (organograma: imagem + título), na página da categoria e, desde 25/11/2026 (B1), no carrossel da landing.
 * Nunca mostra número de votos.
 * 25/11/2026: o toque no cartão leva aos detalhes do item (na página da categoria) e só o botão "Votar" abre a confirmação; na
 * leitura (sem voto), o cartão segue levando aos detalhes. O item em que a pessoa votou tem só o contorno na cor do tema (sem
 * selo).
 */
export function BotaoFilme({
  item,
  clicavel,
  meuVoto = false,
  cinema,
  aoTocar,
  sizes = "(min-width: 1152px) 17rem, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw",
  compacto = false,
  hrefDetalhes,
  aoAbrirDetalhes,
}: {
  item: ItemLista;
  /** Mostra o botão "Votar". */
  clicavel: boolean;
  /** O item em que a pessoa votou (24/11/2026): moldura na cor do tema. */
  meuVoto?: boolean;
  cinema: boolean;
  /** O botão "Votar". */
  aoTocar: () => void;
  sizes?: string;
  /** Cartão menor (carrossel da landing): título e botão em tamanho de lista. */
  compacto?: boolean;
  /** Para onde o toque no cartão leva: os detalhes do item na página da categoria. */
  hrefDetalhes: string;
  /** Na própria página da categoria: rola até os detalhes em vez de navegar. */
  aoAbrirDetalhes?: () => void;
}) {
  const { candidato, bloqueadoVotoProprio } = item;
  const dicaId = `dica-voto-proprio-${candidato.id}`;
  const abrir = aoAbrirDetalhes
    ? (e: MouseEvent) => {
        e.preventDefault();
        aoAbrirDetalhes();
      }
    : undefined;

  return (
    <article
      aria-label={meuVoto ? `${candidato.titulo} (seu voto)` : candidato.titulo}
      aria-describedby={bloqueadoVotoProprio ? dicaId : undefined}
      className={cx(
        "group relative isolate flex w-full flex-col overflow-hidden rounded-2xl bg-tema-fundo transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15 has-focus-visible:-translate-y-1 sm:rounded-3xl",
        meuVoto ? "shadow-lg shadow-tema-primaria/25 ring-4 ring-tema-primaria" : "shadow-sm ring-1 ring-tema-borda/80",
      )}
    >
      {/* O cartão inteiro é o link para os detalhes (cobre tudo menos o botão de voto). */}
      <Link href={hrefDetalhes} onClick={abrir} aria-label={`Ver detalhes de ${candidato.titulo}`} className="absolute inset-0 z-1 rounded-[inherit]" />
      <div className="relative overflow-hidden">
        <ImagemCandidato
          titulo={candidato.titulo}
          imagemUrl={candidato.imagemUrl}
          proporcao="5/7"
          className="transition-transform duration-500 group-hover:scale-105"
          sizes={sizes}
        />
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
          // Acima do link do cartão (z-2): o toque no botão vota e não abre os detalhes.
          <button
            type="button"
            onClick={aoTocar}
            aria-label={`Votar em ${candidato.titulo}`}
            className="relative z-2 mt-auto inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-tema-primaria px-4 text-sm font-semibold text-tema-sobre-primaria transition hover:brightness-110 active:scale-[0.97]"
          >
            <Heart aria-hidden className="size-4" />
            Votar
          </button>
        )}
      </div>
    </article>
  );
}
