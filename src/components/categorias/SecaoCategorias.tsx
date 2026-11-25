"use client";

import { ArrowRight, CircleCheck, Tablet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { AvisoVotacao } from "@/components/votacao/AvisoVotacao";
import { DialogoRevisao } from "@/components/votacao/DialogoRevisao";
import { idDetalhes, temDetalhesItem } from "./DetalhesItem";
import { useEnviarVoto } from "@/components/votacao/useEnviarVoto";
import { filtrarPorTitulo } from "@/dominio/busca";
import { rotaCategoria } from "@/dominio/categorias";
import { rotaVerificarEmail } from "@/dominio/destinoAcesso";
import { modoVotoCategoria, type ModoVotoCategoria } from "@/dominio/modoVotoCategoria";
import type { AvisoVotacao as TipoAviso } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { textoContador } from "@/lib/textosEstado";
import { abrirAcesso } from "@/store/acoesAcesso";
import { descartarSucesso, selecionarCandidato } from "@/store/acoesVotacao";
import { useMeusVotos } from "@/store/meusVotos";
import type { ItemLista } from "@/store/seletores/candidatos";
import { useCategoriasDoEvento, type CategoriaComItens } from "@/store/seletores/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSelecaoVoto } from "@/store/seletores/votacao";
import { useVisaoEvento } from "@/store/seletores/visao";
import { BotaoFilme } from "./BotaoFilme";
import { BarraPesquisa, BotaoPesquisar } from "./BuscaItens";
import { Carrossel } from "./Carrossel";
import { DialogoCoracao } from "./DialogoCoracao";

export const ID_SECAO_CATEGORIAS = "categorias";

/** Âncora da seção de uma categoria na página do evento. */
export const idSecaoCategoria = (slugCategoria: string) => `categoria-${slugCategoria}`;

/**
 * Categorias na página do evento. 09/11/2026 (organograma do Festival Ver e Fazer Filmes): um botão por categoria.
 * 23/11/2026: todas as categorias aparecem na própria página do evento. No topo, um botão por categoria que rola até a seção
 * dela; o "Ver mais" leva à página da categoria (descrição, voto e destino do QR Code).
 * Para quem já votou numa categoria, o selo "Você já votou" (o servidor só sabe o SE; nunca em quem). 24/11/2026: no aparelho em
 * que a pessoa votou, também EM QUEM (guardado só no navegador, src/store/meusVotos.ts): o cartão ganha o selo "Seu voto" e a
 * categoria diz "Você votou em …". Sem categorias, nada.
 * 25/11/2026 (demanda A3): as categorias do totem também aparecem, com os itens, para divulgá-los; sem "Ver mais" (não têm página
 * nem QR Code), sem voto e com o aviso de que o voto é só nos totens. Não contam no "Você votou em X de Y".
 * 25/11/2026 (demanda B1): cada categoria é um carrossel com TODOS os itens (infinito quando não cabem na tela), com busca pelo
 * título quando não cabem, e o voto acontece aqui mesmo: tocar num item abre a mesma revisão da página da categoria, com as
 * mesmas regras (um voto por categoria, confirmado, coração animado, "Seu voto" depois).
 */
export function SecaoCategorias() {
  const ativo = useEventoAtivo();
  const categorias = useCategoriasDoEvento({ incluirTotem: true });
  const visao = useVisaoEvento();
  const sessao = useSessao();
  const cinema = useIdentidadePagina().estilo === "cinema";
  const eventoId = ativo?.evento.id ?? "";
  const meusVotos = useMeusVotos(sessao.usuario?.id ?? null, eventoId || null);
  const votacao = useSelecaoVoto(eventoId || null);
  const anunciar = useAnunciar();
  const router = useRouter();
  const pathname = usePathname();
  const busca = useSearchParams();
  // A categoria do último toque: recebe o aviso do voto (ex.: "este item não está mais disponível") e o envio.
  const [categoriaDoToque, setCategoriaDoToque] = useState<string | null>(null);

  const aberta = visao?.variante === "ABERTA";
  const modoDe = (c: CategoriaComItens): ModoVotoCategoria =>
    modoVotoCategoria({
      urnaAberta: aberta,
      logado: sessao.logado,
      emailVerificado: sessao.emailVerificado,
      papel: sessao.papel,
      soTotem: c.soTotem,
      votou: c.votou,
    });

  // O item escolhido (na revisão) e a categoria dele: só numa categoria em que a pessoa ainda pode escolher.
  const daSelecao = (categorias ?? [])
    .filter((c) => modoDe(c) === "ESCOLHA")
    .flatMap((c) => c.itens.filter((i) => i.candidato.id === votacao.selecaoId && !i.bloqueadoVotoProprio).map((item) => ({ c, item })))[0];
  const categoriaDoEnvio = daSelecao?.c.categoria.id ?? categoriaDoToque;
  const { enviar, verificarNovamente } = useEnviarVoto(eventoId, "PUBLICO", () => {}, categoriaDoEnvio);

  // Volta do acesso com `?votar=`: na escolha, abre a revisão do item; noutro estado definitivo, só limpa a URL.
  const votarUrl = busca.get("votar");
  const daUrl = votarUrl
    ? (categorias ?? []).flatMap((c) => c.itens.filter((i) => i.candidato.id === votarUrl).map((item) => ({ c, item })))[0]
    : undefined;
  const modoDaUrl = daUrl ? modoDe(daUrl.c) : null;
  const idDaUrl = daUrl && !daUrl.item.bloqueadoVotoProprio ? daUrl.item.candidato.id : null;
  useEffect(() => {
    if (!votarUrl || !eventoId || !categorias || modoDaUrl === "VISITANTE" || modoDaUrl === "AGUARDANDO") return;
    // O jurado avalia na lista de baixo (SecaoVotacao), que trata o `?votar=` dele.
    if (sessao.papel === "JURADO") return;
    if (modoDaUrl === "ESCOLHA" && idDaUrl) selecionarCandidato(eventoId, idDaUrl);
    router.replace(pathname, { scroll: false });
  }, [votarUrl, modoDaUrl, idDaUrl, eventoId, categorias, sessao.papel, pathname, router]);

  if (!ativo || !categorias || categorias.length === 0 || !visao) return null;
  const { tema, slug } = ativo;
  const publico = sessao.logado && sessao.papel === "PUBLICO";
  // Só as da página contam no "Você votou em X de Y".
  const comItens = categorias.filter((c) => !c.soTotem && c.itens.length > 0);
  const votadas = comItens.filter((c) => c.votou).length;
  const rotuloItens = tema.rotuloCandidatos.toLocaleLowerCase("pt-BR");
  const rotuloItem = tema.rotuloCandidato.toLocaleLowerCase("pt-BR");

  // O coração: só para o público, depois de um voto numa categoria da página (o `ultimoVoto` fica só nesta aba).
  const categoriaDoSucesso =
    publico && votacao.ultimoVoto
      ? (categorias.find((c) => !c.soTotem && c.itens.some((i) => i.candidato.id === votacao.ultimoVoto?.candidatoId)) ?? null)
      : null;
  const pendentes = comItens.filter((c) => !c.votou && c.categoria.id !== categoriaDoSucesso?.categoria.id);

  function tocar(c: CategoriaComItens, item: ItemLista) {
    const modo = modoDe(c);
    if (item.bloqueadoVotoProprio) return;
    if (modo === "VISITANTE") {
      const de = `/e/${slug}?votar=${encodeURIComponent(item.candidato.id)}`;
      if (!sessao.logado) abrirAcesso("entrar", de);
      else router.push(rotaVerificarEmail(slug, de));
      return;
    }
    if (modo !== "ESCOLHA") return;
    setCategoriaDoToque(c.categoria.id);
    selecionarCandidato(eventoId, item.candidato.id);
    anunciar(`Sua escolha: ${item.candidato.titulo}`);
  }

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
                ? `Conheça os ${rotuloItens} de cada categoria: toque num cartão para ver os detalhes e em "Votar" no seu ${rotuloItem} favorito. Você vota uma vez em cada categoria e confirma antes de o voto contar.`
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

      {categorias.map((c, i) => {
        const modo = modoDe(c);
        const avisoAqui = categoriaDoEnvio === c.categoria.id ? avisoDaCategoria(modo, votacao.aviso) : null;
        return (
          <SecaoDaCategoria
            key={c.categoria.id}
            dados={c}
            numero={i + 1}
            href={rotaCategoria(slug, c.categoria.slug)}
            rotuloContador={textoContador(c.itens.length, tema)}
            rotuloItens={rotuloItens}
            modo={modo}
            aviso={avisoAqui}
            meuVotoId={publico && c.votou ? (meusVotos[c.categoria.id] ?? null) : null}
            cinema={cinema}
            aoTocar={(item) => tocar(c, item)}
            // Alterna o fundo, começando pelo da cabeça (que vira o fundo da primeira seção).
            fundo={i % 2 === 0 ? (cinema ? "bg-cine-papel" : "bg-tema-superficie") : "bg-tema-fundo"}
          />
        );
      })}

      <DialogoRevisao
        titulo={daSelecao ? `Votar em ${daSelecao.c.categoria.nome}` : "Votar"}
        formato="cartaz"
        item={daSelecao?.item ?? null}
        papelVoto="PUBLICO"
        primeiroVotoJurado={false}
        ehVotoAtual={false}
        envio={votacao.envio}
        falhaEnvio={votacao.falhaEnvio}
        aoConfirmar={() => daSelecao && void enviar(daSelecao.item.candidato.id)}
        aoTrocar={() => selecionarCandidato(eventoId, null)}
        aoVerificar={() => void verificarNovamente()}
        // 25/11/2026: os detalhes ficam na página da categoria; "Ver mais" leva até o bloco do item lá.
        temVerMais={(i) => temDetalhesItem(i, ativo.camposCandidato)}
        aoVerMais={(i) => {
          if (!daSelecao) return;
          selecionarCandidato(eventoId, null);
          router.push(`${rotaCategoria(slug, daSelecao.c.categoria.slug)}#${idDetalhes(i.candidato.id)}`);
        }}
      />

      <DialogoCoracao
        aberto={categoriaDoSucesso !== null}
        categoria={categoriaDoSucesso?.categoria.nome ?? ""}
        proxima={pendentes[0] ? { nome: pendentes[0].categoria.nome, href: `/e/${slug}#${idSecaoCategoria(pendentes[0].categoria.slug)}` } : null}
        hrefCategorias={`/e/${slug}#${ID_SECAO_CATEGORIAS}`}
        aoFechar={() => descartarSucesso(eventoId)}
        focoAoFechar={() =>
          categoriaDoSucesso ? document.getElementById(`titulo-${idSecaoCategoria(categoriaDoSucesso.categoria.slug)}`) : null
        }
      />
    </section>
  );
}

/** Os mesmos avisos da página da categoria: na escolha, todos menos "já votou antes"; fora dela, só os que explicam por quê. */
function avisoDaCategoria(modo: ModoVotoCategoria, aviso: TipoAviso | null): TipoAviso | null {
  if (modo === "ESCOLHA") return aviso !== "JA_VOTOU_ANTES" ? aviso : null;
  return aviso === "JA_VOTOU_ANTES" || aviso === "NAO_REGISTRADO" ? aviso : null;
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
  modo,
  aviso,
  meuVotoId,
  cinema,
  aoTocar,
  fundo,
}: {
  dados: CategoriaComItens;
  numero: number;
  href: string;
  rotuloContador: string;
  rotuloItens: string;
  modo: ModoVotoCategoria;
  aviso: TipoAviso | null;
  /** Em quem a pessoa votou nesta categoria, se este navegador sabe. */
  meuVotoId: string | null;
  cinema: boolean;
  aoTocar: (item: ItemLista) => void;
  fundo: string;
}) {
  const { categoria, itens, soTotem } = dados;
  const idTitulo = `titulo-${idSecaoCategoria(categoria.slug)}`;
  const idBusca = `busca-${idSecaoCategoria(categoria.slug)}`;
  const meuItem = meuVotoId ? (itens.find((i) => i.candidato.id === meuVotoId) ?? null) : null;
  const votou = modo === "JA_VOTOU";
  const clicavel = modo === "ESCOLHA" || modo === "VISITANTE";
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termo, setTermo] = useState("");
  // A busca só aparece quando os itens não cabem na tela (com todos à vista, não há o que procurar).
  const [cabemTodos, setCabemTodos] = useState(true);
  const visiveis = filtrarPorTitulo(itens, termo, (i) => i.candidato.titulo);

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
              {/* 25/11/2026: com o voto conhecido, só o cartão em destaque; sem ele (outro aparelho), o aviso curto. */}
              {votou && !meuItem && (
                <span className="inline-flex items-center gap-1 font-semibold text-tema-sucesso">
                  <CircleCheck aria-hidden className="size-4" />
                  Você já votou
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(!cabemTodos || buscaAberta) && itens.length > 1 && (
              <BotaoPesquisar
                aberta={buscaAberta}
                idBarra={idBusca}
                nome={categoria.nome}
                aoAlternar={() => {
                  setBuscaAberta(!buscaAberta);
                  setTermo("");
                }}
              />
            )}
            {/* 25/11/2026: a categoria do totem também leva à página dela (os detalhes dos itens), além do aviso. */}
            {soTotem && <AvisoSoTotem />}
            {/* max-sm:hidden: o botão já é inline-flex, e um "hidden" solto perdia para ele (os dois apareciam no celular). */}
            <BotaoVerMais href={href} nome={categoria.nome} className="max-sm:hidden" />
          </div>
        </div>

        {buscaAberta && (
          <BarraPesquisa
            id={idBusca}
            termo={termo}
            aoMudar={setTermo}
            aoFechar={() => {
              setBuscaAberta(false);
              setTermo("");
            }}
            rotulo={`Pesquisar ${rotuloItens} de ${categoria.nome}`}
            encontrados={visiveis.length}
            total={itens.length}
          />
        )}

        <AvisoVotacao aviso={aviso} />

        {itens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
            Os {rotuloItens} desta categoria ainda não foram publicados.
          </p>
        ) : (
          <Carrossel
            itens={visiveis}
            total={itens.length}
            aoMedir={setCabemTodos}
            automatico={!termo.trim()}
            rotulo={`${categoria.nome}: ${rotuloItens}`}
            chave={(item) => item.candidato.id}
            classeItem="w-40 sm:w-48 lg:w-52"
            render={(item) => (
              <BotaoFilme
                item={item}
                clicavel={clicavel && !item.bloqueadoVotoProprio}
                meuVoto={item.candidato.id === meuItem?.candidato.id}
                cinema={cinema}
                compacto
                sizes="(min-width: 1024px) 13rem, (min-width: 640px) 12rem, 10rem"
                // 25/11/2026: o cartão leva aos detalhes do item na página da categoria; só o botão "Votar" abre a confirmação.
                hrefDetalhes={`${href}#${idDetalhes(item.candidato.id)}`}
                aoTocar={() => aoTocar(item)}
              />
            )}
          />
        )}

        {/* No celular, o "Ver mais" vem depois da lista. */}
        <BotaoVerMais href={href} nome={categoria.nome} className="self-stretch sm:hidden" />
      </div>
    </section>
  );
}

/**
 * Na categoria do totem, ao lado do "Ver mais". 25/11/2026: "apenas nos totens", sem "no local do evento" (os totens nem sempre
 * ficam no local).
 */
function AvisoSoTotem() {
  return (
    <p className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-tema-fundo px-4 py-2 text-sm font-semibold text-tema-primaria-texto shadow-sm ring-1 ring-tema-borda/80 sm:self-auto">
      <Tablet aria-hidden className="size-4 shrink-0" />
      Votação apenas nos totens
    </p>
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
