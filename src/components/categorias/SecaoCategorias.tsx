"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { rotaCategoria } from "@/dominio/categorias";
import { cx } from "@/lib/classes";
import { textoContador } from "@/lib/textosEstado";
import type { ItemLista } from "@/store/seletores/candidatos";
import { useCategoriasDoEvento, type CategoriaComItens } from "@/store/seletores/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useVisaoEvento } from "@/store/seletores/visao";

export const ID_SECAO_CATEGORIAS = "categorias";

/** Âncora da seção de uma categoria na página do evento. */
export const idSecaoCategoria = (slugCategoria: string) => `categoria-${slugCategoria}`;

/**
 * Categorias na página do evento. 09/11/2026 (organograma do Festival Ver e Fazer Filmes): um botão por categoria.
 * 23/11/2026: todas as categorias aparecem na própria página do evento. No topo, um botão por categoria que rola até a seção
 * dela; cada seção mostra todos os itens da categoria e um "Ver mais", que leva à página da categoria (descrição e voto).
 * Para quem já votou numa categoria, o selo "Você já votou" (só o SE; nunca em quem). Sem categorias, nada.
 */
export function SecaoCategorias() {
  const ativo = useEventoAtivo();
  const categorias = useCategoriasDoEvento();
  const visao = useVisaoEvento();
  const sessao = useSessao();
  const cinema = useIdentidadePagina().estilo === "cinema";
  if (!ativo || !categorias || categorias.length === 0 || !visao) return null;
  const { tema } = ativo;
  const aberta = visao.variante === "ABERTA";
  const publico = sessao.logado && sessao.papel === "PUBLICO";
  const comItens = categorias.filter((c) => c.itens.length > 0);
  const votadas = comItens.filter((c) => c.votou).length;
  const rotuloItens = tema.rotuloCandidatos.toLocaleLowerCase("pt-BR");

  return (
    <section id={ID_SECAO_CATEGORIAS} aria-labelledby="titulo-categorias" className="w-full scroll-mt-40">
      <div className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-superficie")}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
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
                ? `Conheça os ${rotuloItens} de cada categoria. Para votar, toque em "Ver mais": você vota uma vez em cada categoria.`
                : `Conheça os ${rotuloItens} de cada categoria.`}
            </p>
          </header>

          <nav aria-label="Ir para a categoria">
            <ul className="flex flex-wrap gap-2 sm:gap-3">
              {categorias.map(({ categoria, votou }) => (
                <li key={categoria.id}>
                  <button
                    type="button"
                    onClick={() => irParaCategoria(categoria.slug)}
                    className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full bg-tema-fundo px-5 text-sm font-semibold shadow-sm ring-1 ring-tema-borda transition hover:-translate-y-0.5 hover:ring-tema-primaria sm:text-base"
                  >
                    <span className="truncate">{categoria.nome}</span>
                    {publico && votou && <CircleCheck aria-label="você já votou" className="size-4 shrink-0 text-tema-sucesso" />}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {categorias.map((c, i) => (
        <SecaoDaCategoria
          key={c.categoria.id}
          dados={c}
          numero={i + 1}
          href={rotaCategoria(ativo.slug, c.categoria.slug)}
          rotuloContador={textoContador(c.itens.length, tema)}
          rotuloItens={rotuloItens}
          votou={publico && c.votou}
          cinema={cinema}
          // Alterna o fundo, começando pelo da cabeça (que vira o fundo da primeira seção).
          fundo={i % 2 === 0 ? (cinema ? "bg-cine-papel" : "bg-tema-superficie") : "bg-tema-fundo"}
        />
      ))}
    </section>
  );
}

/** Rola até a seção da categoria e leva o foco ao título dela (para teclado e leitor de tela). */
function irParaCategoria(slugCategoria: string) {
  const secao = document.getElementById(idSecaoCategoria(slugCategoria));
  if (!secao) return;
  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  secao.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "start" });
  secao.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
}

function SecaoDaCategoria({
  dados,
  numero,
  href,
  rotuloContador,
  rotuloItens,
  votou,
  cinema,
  fundo,
}: {
  dados: CategoriaComItens;
  numero: number;
  href: string;
  rotuloContador: string;
  rotuloItens: string;
  votou: boolean;
  cinema: boolean;
  fundo: string;
}) {
  const { categoria, itens } = dados;
  const idTitulo = `titulo-${idSecaoCategoria(categoria.slug)}`;

  return (
    <section id={idSecaoCategoria(categoria.slug)} aria-labelledby={idTitulo} className={cx("w-full scroll-mt-40", fundo)}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 border-t border-tema-borda pt-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-tema-primaria-texto">Categoria {String(numero).padStart(2, "0")}</p>
            <h3
              id={idTitulo}
              tabIndex={-1}
              className={cx("text-2xl leading-tight tracking-tight wrap-anywhere sm:text-3xl", cinema ? "font-cine font-bold" : "font-display font-extrabold")}
            >
              {categoria.nome}
            </h3>
            {categoria.premio && <p className="font-semibold text-tema-texto-suave">{categoria.premio}</p>}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tema-texto-suave">
              <span>{rotuloContador}</span>
              {votou && (
                <span className="inline-flex items-center gap-1 font-semibold text-tema-sucesso">
                  <CircleCheck aria-hidden className="size-4" />
                  Você já votou
                </span>
              )}
            </p>
          </div>
          <BotaoVerMais href={href} nome={categoria.nome} className="hidden sm:inline-flex" />
        </div>

        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
            Os {rotuloItens} desta categoria ainda não foram publicados.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
            {itens.map((item) => (
              <li key={item.candidato.id} className="flex">
                <CartaoItem item={item} cinema={cinema} />
              </li>
            ))}
          </ul>
        )}

        {/* No celular, o "Ver mais" vem depois da lista. */}
        <BotaoVerMais href={href} nome={categoria.nome} className="self-stretch sm:hidden" />
      </div>
    </section>
  );
}

function BotaoVerMais({ href, nome, className }: { href: string; nome: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-tema-primaria px-6 font-semibold text-tema-sobre-primaria shadow-sm transition hover:gap-3 hover:shadow-md",
        className,
      )}
    >
      Ver mais<span className="sr-only"> sobre {nome}</span>
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

/** Cartaz + título, só para conhecer (o voto é na página da categoria). Nunca mostra número de votos. */
function CartaoItem({ item, cinema }: { item: ItemLista; cinema: boolean }) {
  const { candidato } = item;
  return (
    <article aria-label={candidato.titulo} className="flex w-full flex-col overflow-hidden rounded-2xl bg-tema-fundo shadow-sm ring-1 ring-tema-borda/80">
      <ImagemCandidato
        titulo={candidato.titulo}
        imagemUrl={candidato.imagemUrl}
        proporcao="5/7"
        sizes="(min-width: 1152px) 13rem, (min-width: 1024px) 19vw, (min-width: 640px) 32vw, 48vw"
      />
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <h4 className={cx("line-clamp-3 p-3 text-sm leading-snug tracking-tight wrap-anywhere sm:text-base", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
        {candidato.titulo}
      </h4>
    </article>
  );
}
