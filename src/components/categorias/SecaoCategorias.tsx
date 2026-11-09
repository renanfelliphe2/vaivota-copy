"use client";

import { ArrowRight, CircleCheck, Clapperboard, Eye, Heart } from "lucide-react";
import Link from "next/link";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { rotaCategoria } from "@/dominio/categorias";
import { cx } from "@/lib/classes";
import { textoContador } from "@/lib/textosEstado";
import { useCategoriasDoEvento, type CategoriaComItens } from "@/store/seletores/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useVisaoEvento } from "@/store/seletores/visao";

export const ID_SECAO_CATEGORIAS = "categorias";

/**
 * Categorias na página do evento (09/11/2026, organograma do Festival Ver e Fazer Filmes): um botão grande por categoria,
 * que leva à página dela, com os filmes e o voto. Mostra quantos itens cada uma tem e, para quem já votou nela, o selo
 * "Você já votou" (só o SE; nunca em quem). Sem categorias, nada.
 */
export function SecaoCategorias() {
  const ativo = useEventoAtivo();
  const categorias = useCategoriasDoEvento();
  const visao = useVisaoEvento();
  const sessao = useSessao();
  const cinema = useIdentidadePagina().estilo === "cinema";
  if (!ativo || !categorias || categorias.length === 0 || !visao) return null;
  const aberta = visao.variante === "ABERTA";
  const publico = sessao.logado && sessao.papel === "PUBLICO";
  const comItens = categorias.filter((c) => c.itens.length > 0);
  const votadas = comItens.filter((c) => c.votou).length;

  return (
    <section
      id={ID_SECAO_CATEGORIAS}
      aria-labelledby="titulo-categorias"
      className={cx("w-full scroll-mt-40", cinema ? "bg-cine-papel" : "bg-tema-superficie")}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-tema-primaria-texto">
            <span aria-hidden className="h-1 w-6 rounded-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
            Votação popular
          </p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="titulo-categorias" tabIndex={-1} className={cx("text-3xl tracking-tight sm:text-4xl", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
              Categorias
            </h2>
            {publico && comItens.length > 0 && (
              <p className="rounded-full bg-tema-fundo px-4 py-1.5 text-sm font-semibold text-tema-primaria-texto shadow-sm ring-1 ring-tema-borda/80">
                {votadas === comItens.length ? "Você votou em todas" : `Você votou em ${votadas} de ${comItens.length}`}
              </p>
            )}
          </div>
          <p className="max-w-2xl text-tema-texto-suave">
            {aberta
              ? "Escolha uma categoria para ver os filmes e votar no seu favorito. Você vota uma vez em cada categoria."
              : "Escolha uma categoria para conhecer os filmes."}
          </p>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categorias.map((c, i) => (
            <li key={c.categoria.id} className="flex">
              <BotaoCategoria
                dados={c}
                numero={i + 1}
                href={rotaCategoria(ativo.slug, c.categoria.slug)}
                rotuloItens={textoContador(c.itens.length, ativo.tema)}
                acao={c.votou && publico ? "VOTOU" : aberta && c.itens.length > 0 ? "VOTAR" : "VER"}
                cinema={cinema}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const MAX_CARTAZES = 3;

function BotaoCategoria({
  dados,
  numero,
  href,
  rotuloItens,
  acao,
  cinema,
}: {
  dados: CategoriaComItens;
  numero: number;
  href: string;
  rotuloItens: string;
  acao: "VOTAR" | "VOTOU" | "VER";
  cinema: boolean;
}) {
  const { categoria, itens } = dados;
  const cartazes = itens.slice(0, MAX_CARTAZES).map((i) => i.candidato);

  return (
    <Link
      href={href}
      className="group flex w-full flex-col overflow-hidden rounded-3xl bg-tema-fundo shadow-sm ring-1 ring-tema-borda/80 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/15 focus-visible:-translate-y-1"
    >
      {/* A película com até três cartazes da categoria; sem cartaz, a claquete. */}
      <div aria-hidden className="relative bg-cine-pelicula">
        <span className="cine-furos-h block h-[1.125rem] w-full" />
        <div className="flex h-44 items-stretch justify-center gap-2 px-3 sm:h-48">
          {cartazes.length > 0 ? (
            cartazes.map((c) => (
              <div key={c.id} className="h-full overflow-hidden bg-black ring-1 ring-white/10">
                <ImagemCandidato
                  titulo={c.titulo}
                  imagemUrl={c.imagemUrl}
                  proporcao="5/7"
                  className="h-full w-auto transition-transform duration-500 group-hover:scale-105"
                  sizes="8rem"
                />
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center text-white/60">
              <Clapperboard className="size-14" />
            </div>
          )}
        </div>
        <span className="cine-furos-h block h-[1.125rem] w-full" />
      </div>
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-tema-primaria-texto">Categoria {String(numero).padStart(2, "0")}</p>
        <h3 className={cx("text-2xl leading-tight tracking-tight wrap-anywhere", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
          {categoria.nome}
        </h3>
        {categoria.premio && <p className="font-semibold text-tema-texto-suave">{categoria.premio}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <span className="text-sm text-tema-texto-suave">{rotuloItens}</span>
          {acao === "VOTOU" ? (
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-tema-superficie px-4 text-sm font-semibold text-tema-sucesso ring-1 ring-tema-borda">
              <CircleCheck aria-hidden className="size-4" />
              Você já votou
            </span>
          ) : (
            <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-tema-primaria px-5 text-sm font-semibold text-tema-sobre-primaria transition group-hover:gap-3">
              {acao === "VOTAR" ? <Heart aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
              {acao === "VOTAR" ? "Votar" : "Ver filmes"}
              <ArrowRight aria-hidden className="size-4" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
