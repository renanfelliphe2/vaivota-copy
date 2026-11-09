"use client";

import { ArrowLeft, ArrowRight, CalendarDays, CircleCheck, Film, Heart, Info, MapPin, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { AvisoVotoProprio } from "@/components/candidato/AvisoVotoProprio";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { UrnaStatusCard } from "@/components/evento/UrnaStatusCard";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { Alerta } from "@/components/ui/Alerta";
import { AvisoVotacao } from "@/components/votacao/AvisoVotacao";
import { DialogoRevisao } from "@/components/votacao/DialogoRevisao";
import { useEnviarVoto } from "@/components/votacao/useEnviarVoto";
import { rotaCategoria } from "@/dominio/categorias";
import { rotaVerificarEmail } from "@/dominio/destinoAcesso";
import { cx } from "@/lib/classes";
import { tokensCinema } from "@/lib/tema";
import { textoContador } from "@/lib/textosEstado";
import { descreverPeriodo, paraMs } from "@/lib/tempo";
import { abrirAcesso } from "@/store/acoesAcesso";
import { descartarSucesso, selecionarCandidato } from "@/store/acoesVotacao";
import type { ItemLista } from "@/store/seletores/candidatos";
import { useCategoriasDoEvento, type CategoriaComItens } from "@/store/seletores/categorias";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSelecaoVoto } from "@/store/seletores/votacao";
import { useVisaoEvento } from "@/store/seletores/visao";
import { DialogoCoracao } from "./DialogoCoracao";
import { ID_SECAO_CATEGORIAS } from "./SecaoCategorias";

/**
 * O que a página da categoria deixa fazer:
 * - VISITANTE (sem sessão ou sem e-mail verificado), com a urna aberta: o toque no filme pede o acesso e volta com `?votar=`;
 * - AGUARDANDO: logado, a participação ainda está sendo criada (GarantiaParticipacao);
 * - ESCOLHA: público que ainda não votou nesta categoria; o toque abre a confirmação;
 * - JA_VOTOU: público que já votou nesta categoria (só o SE; nunca em quem);
 * - LEITURA: urna fechada, admin ou jurado: só a lista.
 */
type Modo = "VISITANTE" | "AGUARDANDO" | "ESCOLHA" | "JA_VOTOU" | "LEITURA";

/**
 * Página de uma categoria (09/11/2026, organograma do Festival Ver e Fazer Filmes): /e/[slug]/categoria/[categoria], também o
 * destino do QR Code dela. Um botão por filme (cartaz + título). Tocar abre "Revise seu voto" (decisão do dono do produto:
 * toque + confirmar, contra o voto sem querer); confirmado, o coração animado. Uma vez em cada categoria. O voto e as regras são
 * os de sempre (servidor: src/server/votacao.ts); a categoria vem do filme.
 */
export function PaginaCategoria() {
  const params = useParams<{ categoria?: string | string[] }>();
  const slugCategoria = typeof params?.categoria === "string" ? decodeURIComponent(params.categoria) : "";
  const ativo = useEventoAtivo();
  const categorias = useCategoriasDoEvento();
  const visao = useVisaoEvento();
  const sessao = useSessao();
  const atual = categorias?.find((c) => c.categoria.slug === slugCategoria) ?? null;
  const eventoId = ativo?.evento.id ?? "";
  const votacao = useSelecaoVoto(ativo?.evento.id ?? null);
  const { enviar, verificarNovamente } = useEnviarVoto(eventoId, "PUBLICO", () => {}, atual?.categoria.id ?? null);
  const busca = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const anunciar = useAnunciar();
  const cinema = useIdentidadePagina().estilo === "cinema";

  const visitante = !sessao.logado || !sessao.emailVerificado;
  const aberta = visao?.variante === "ABERTA";
  const modo: Modo = !aberta
    ? "LEITURA"
    : visitante
      ? "VISITANTE"
      : sessao.papel === null
        ? "AGUARDANDO"
        : sessao.papel !== "PUBLICO"
          ? "LEITURA"
          : atual?.votou
            ? "JA_VOTOU"
            : "ESCOLHA";

  // Volta do acesso com `?votar=`: na escolha, abre a confirmação; noutro estado definitivo, só limpa a URL.
  const votarUrl = busca.get("votar");
  const itemVotarUrl = atual?.itens.find((i) => i.candidato.id === votarUrl && !i.bloqueadoVotoProprio) ?? null;
  useEffect(() => {
    if (!votarUrl || !eventoId || modo === "VISITANTE" || modo === "AGUARDANDO") return;
    if (modo === "ESCOLHA" && itemVotarUrl) selecionarCandidato(eventoId, itemVotarUrl.candidato.id);
    router.replace(pathname, { scroll: false });
  }, [votarUrl, itemVotarUrl, modo, eventoId, pathname, router]);

  if (!ativo || !categorias || !visao) return null;
  if (visao.variante === "INDISPONIVEL") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <UrnaStatusCard visao={visao} tituloComoH1 />
      </div>
    );
  }
  if (!atual) return <CategoriaNaoEncontrada slug={ativo.slug} />;

  const { slug, tema } = ativo;
  const { categoria, itens } = atual;
  const itemSelecionado = modo === "ESCOLHA" ? (itens.find((i) => i.candidato.id === votacao.selecaoId && !i.bloqueadoVotoProprio) ?? null) : null;
  // O coração só depois de um voto desta categoria (o `ultimoVoto` não diz em quem a ninguém: fica só nesta aba).
  const sucessoAqui = votacao.ultimoVoto !== null && itens.some((i) => i.candidato.id === votacao.ultimoVoto?.candidatoId);
  const pendentes = categorias.filter((c) => c.categoria.id !== categoria.id && c.itens.length > 0 && !c.votou);
  const outras = categorias.filter((c) => c.categoria.id !== categoria.id);
  // Na leitura, só os avisos que explicam por que não há escolha.
  const aviso =
    modo === "ESCOLHA"
      ? votacao.aviso !== "JA_VOTOU_ANTES"
        ? votacao.aviso
        : null
      : votacao.aviso === "JA_VOTOU_ANTES" || votacao.aviso === "NAO_REGISTRADO"
        ? votacao.aviso
        : null;

  function tocar(item: ItemLista) {
    if (item.bloqueadoVotoProprio) return;
    if (modo === "VISITANTE") {
      const de = `${rotaCategoria(slug, categoria.slug)}?votar=${encodeURIComponent(item.candidato.id)}`;
      if (!sessao.logado) abrirAcesso("entrar", de);
      else router.push(rotaVerificarEmail(slug, de));
      return;
    }
    if (modo !== "ESCOLHA") return;
    selecionarCandidato(eventoId, item.candidato.id);
    anunciar(`Sua escolha: ${item.candidato.titulo}`);
  }

  const clicavel = modo === "ESCOLHA" || modo === "VISITANTE";
  const instrucao =
    modo === "ESCOLHA" || modo === "VISITANTE"
      ? `Toque no seu ${tema.rotuloCandidato.toLocaleLowerCase("pt-BR")} favorito para votar. Você confirma antes de o voto contar.`
      : null;

  return (
    <>
      <CabecaCategoria dados={atual} />

      <section aria-labelledby="titulo-filmes" className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-superficie")}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12">
          <div className="flex flex-col gap-2">
            <h2 id="titulo-filmes" tabIndex={-1} className={cx("text-2xl tracking-tight sm:text-3xl", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
              {tema.rotuloCandidatos}
            </h2>
            {instrucao && <p className="max-w-2xl text-tema-texto-suave">{instrucao}</p>}
          </div>

          <AvisoVotacao aviso={aviso} />
          {modo === "JA_VOTOU" && (
            <Alerta variante="sucesso" titulo="Você já votou nesta categoria">
              Obrigado! {pendentes.length > 0 ? "Ainda dá para votar nas outras categorias, logo abaixo." : "O resultado será divulgado pela organização."}
            </Alerta>
          )}
          {modo === "LEITURA" && aberta && sessao.papel === "ADMIN" && (
            <Alerta variante="informacao">Você é administrador deste evento: administradores não votam.</Alerta>
          )}
          {modo === "LEITURA" && aberta && sessao.papel === "JURADO" && (
            <Alerta variante="informacao">Como jurado, você avalia na página inicial do evento. O voto das categorias é do público.</Alerta>
          )}
          {!aberta && <UrnaStatusCard visao={visao} />}

          {itens.length === 0 ? (
            <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
              Os {tema.rotuloCandidatos.toLocaleLowerCase("pt-BR")} desta categoria ainda não foram publicados.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
              {itens.map((item) => (
                <li key={item.candidato.id} className="flex">
                  <BotaoFilme item={item} clicavel={clicavel && !item.bloqueadoVotoProprio} cinema={cinema} aoTocar={() => tocar(item)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {outras.length > 0 && <OutrasCategorias slug={slug} outras={outras} cinema={cinema} publico={sessao.papel === "PUBLICO"} />}

      <DialogoRevisao
        titulo={`Votar em ${categoria.nome}`}
        formato="cartaz"
        item={itemSelecionado}
        papelVoto="PUBLICO"
        primeiroVotoJurado={false}
        ehVotoAtual={false}
        envio={votacao.envio}
        falhaEnvio={votacao.falhaEnvio}
        aoConfirmar={() => itemSelecionado && void enviar(itemSelecionado.candidato.id)}
        aoTrocar={() => selecionarCandidato(eventoId, null)}
        aoVerificar={() => void verificarNovamente()}
      />

      <DialogoCoracao
        aberto={sucessoAqui}
        categoria={categoria.nome}
        proxima={pendentes[0] ? { nome: pendentes[0].categoria.nome, href: rotaCategoria(slug, pendentes[0].categoria.slug) } : null}
        hrefCategorias={`/e/${slug}#${ID_SECAO_CATEGORIAS}`}
        aoFechar={() => descartarSucesso(eventoId)}
        focoAoFechar={() => document.getElementById("titulo-filmes")}
      />
    </>
  );
}

const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as CSSProperties;

/** Faixa do topo: a sala escura do estilo cinema, com o caminho de volta, o nome da categoria e o prêmio. */
function CabecaCategoria({ dados }: { dados: CategoriaComItens }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { slug, evento, tema } = ativo;
  const { categoria, itens } = dados;
  const periodo =
    evento.janelaInicio && evento.janelaFim
      ? descreverPeriodo(paraMs(evento.janelaInicio), paraMs(evento.janelaFim), evento.fusoHorario)
      : null;
  const informacoes = [
    periodo && { icone: CalendarDays, texto: `Votação: ${periodo}` },
    evento.local && { icone: MapPin, texto: evento.local },
    { icone: Film, texto: textoContador(itens.length, tema) },
  ].filter((i): i is { icone: LucideIcon; texto: string } => Boolean(i));

  return (
    <section
      aria-labelledby="titulo-categoria"
      style={tokensCinema(tema) as CSSProperties}
      className="cine-sala relative isolate w-full overflow-clip text-white [--tema-foco:#ffffff]"
    >
      <div aria-hidden className="cine-feixe absolute inset-0 -z-10" />
      <div aria-hidden className="cine-grao absolute inset-0 -z-10" />
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
        <Link
          href={`/e/${slug}#${ID_SECAO_CATEGORIAS}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/8 px-4 text-sm font-semibold text-white/90 ring-1 ring-white/15 transition hover:bg-white/15"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Todas as categorias
        </Link>
        <div className="flex flex-col gap-2">
          <p className="marca-subir text-xs font-bold uppercase tracking-[0.2em] text-cine-primaria-clara" style={atraso(0)}>
            {tema.nomeExibicao ?? evento.nome}
          </p>
          <h1 id="titulo-categoria" className="marca-subir font-cine text-[clamp(2rem,8vw,3.75rem)] font-bold leading-[1.02] tracking-tight" style={atraso(80)}>
            {categoria.nome}
          </h1>
          {categoria.premio && (
            <p className="marca-subir text-lg font-semibold text-cine-secundaria-clara sm:text-xl" style={atraso(140)}>
              {categoria.premio}
            </p>
          )}
        </div>
        <span aria-hidden className="marca-subir flex h-1.5 w-28 overflow-hidden rounded-full" style={atraso(180)}>
          <span className="flex-1 bg-tema-primaria" />
          <span className="flex-1 bg-tema-secundaria" />
        </span>
        <ul className="marca-subir flex flex-wrap gap-2" style={atraso(220)}>
          {informacoes.map(({ icone: Icone, texto }) => (
            <li key={texto} className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-white/90 ring-1 ring-white/15">
              <Icone aria-hidden className="size-4 shrink-0 text-cine-secundaria-clara" />
              {texto}
            </li>
          ))}
        </ul>
      </div>
      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />
    </section>
  );
}

/**
 * O botão do filme (organograma: imagem + título). Clicável, o cartão inteiro é o botão ("Votar em <título>"); na leitura,
 * o mesmo cartão sem ação. Nunca mostra número de votos.
 */
function BotaoFilme({ item, clicavel, cinema, aoTocar }: { item: ItemLista; clicavel: boolean; cinema: boolean; aoTocar: () => void }) {
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
          sizes="(min-width: 1152px) 17rem, (min-width: 1024px) 24vw, (min-width: 640px) 32vw, 48vw"
        />
        {clicavel && (
          <span
            aria-hidden
            className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-full bg-tema-fundo/90 text-tema-primaria shadow-md ring-1 ring-tema-borda transition group-hover:scale-110 sm:right-3 sm:top-3"
          >
            <Heart className="size-5" />
          </span>
        )}
      </div>
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <div className="flex flex-1 flex-col gap-2 p-3 text-left sm:p-4">
        <h3 className={cx("line-clamp-3 text-base leading-snug tracking-tight wrap-anywhere sm:text-lg", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
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
  const classes = "group relative isolate flex w-full flex-col overflow-hidden rounded-2xl bg-tema-fundo shadow-sm ring-1 ring-tema-borda/80 sm:rounded-3xl";
  if (!clicavel)
    return (
      <article aria-label={candidato.titulo} aria-describedby={bloqueadoVotoProprio ? dicaId : undefined} className={classes}>
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

/** As outras categorias, no fim da página: para seguir votando sem voltar ao começo. */
function OutrasCategorias({ slug, outras, cinema, publico }: { slug: string; outras: CategoriaComItens[]; cinema: boolean; publico: boolean }) {
  return (
    <nav aria-labelledby="titulo-outras" className="w-full bg-tema-fundo">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6">
        <h2 id="titulo-outras" className={cx("text-xl tracking-tight", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>
          Outras categorias
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {outras.map(({ categoria, votou }) => (
            <li key={categoria.id}>
              <Link
                href={rotaCategoria(slug, categoria.slug)}
                className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-tema-superficie px-5 py-3 ring-1 ring-tema-borda transition hover:-translate-y-0.5 hover:ring-tema-primaria"
              >
                <span className="flex min-w-0 flex-col">
                  <span className={cx("truncate text-lg", cinema ? "font-cine font-bold" : "font-display font-extrabold")}>{categoria.nome}</span>
                  {categoria.premio && <span className="truncate text-sm text-tema-texto-suave">{categoria.premio}</span>}
                </span>
                {publico && votou ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-tema-sucesso">
                    <CircleCheck aria-hidden className="size-4" />
                    Votou
                  </span>
                ) : (
                  <ArrowRight aria-hidden className="size-5 shrink-0 text-tema-primaria-texto transition group-hover:translate-x-1" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function CategoriaNaoEncontrada({ slug }: { slug: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <Info aria-hidden className="size-8 text-tema-primaria-texto" />
      <h1 className="text-2xl font-bold">Categoria não encontrada</h1>
      <p className="text-tema-texto-suave">O endereço pode ter mudado. Veja as categorias na página do evento.</p>
      <Link href={`/e/${slug}#${ID_SECAO_CATEGORIAS}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tema-primaria px-5 font-semibold text-tema-sobre-primaria">
        <ArrowLeft aria-hidden className="size-4" />
        Ver as categorias
      </Link>
    </div>
  );
}
