"use client";

import { CalendarDays, Clapperboard, Film } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { LogoOrganizador } from "@/components/evento/MarcaOrganizador";
import { PilulasInformacao, pilulaDoLocal, type InformacaoPilula } from "@/components/evento/PilulasInformacao";
import { idDetalhes } from "@/components/categorias/DetalhesItem";
import { rotaCategoria } from "@/dominio/categorias";
import { cx } from "@/lib/classes";
import { dividirTitulo } from "@/lib/rotulos";
import { tokensCinema } from "@/lib/tema";
import { textoContador } from "@/lib/textosEstado";
import { descreverPeriodo, paraMs } from "@/lib/tempo";
import { useCandidatosParaVotacao } from "@/store/seletores/candidatos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { AcoesDoHero } from "../AcoesDoHero";
import { useDestaqueCandidato } from "../DestaqueCandidato";
import { Holofotes, Rosacea } from "./DecoracoesCinema";
import { montarCasas, PeliculaCarrossel, PeliculaTripla } from "./PeliculaDosCandidatos";
import { useRotacaoCartazes } from "./useRotacaoCartazes";

const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as CSSProperties;

/**
 * Primeira dobra da página do evento no estilo cinema (07/11/2026, Festival Ver e Fazer Filmes): a sala escura com a luz
 * do projetor e a granulação de filme, o título em letras de cartaz (a edição em cima, o nome embaixo), as cores do tema
 * numa faixa, o período da votação, o local e a película com os cartazes, que levam aos cartões da lista. A chamada é a
 * mesma do estilo padrão (AcoesDoHero). A borda de baixo é a da película.
 */
export function HeroCinema() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const lista = useCandidatosParaVotacao("ONLINE");
  const { organizador } = useIdentidadePagina();
  const { destacar } = useDestaqueCandidato();
  const router = useRouter();
  const candidatos = lista?.itens.map((i) => i.candidato) ?? [];
  const rotacao = useRotacaoCartazes(candidatos.map((c) => c.id));
  if (!ativo || !situacao) return null;
  const { evento, tema } = ativo;
  const n = candidatos.length;
  const { chamada, principal } = dividirTitulo(tema.nomeExibicao ?? evento.nome);
  // Evento com categorias (09/11/2026): o cartaz leva à página da categoria do filme (não há lista na página inicial).
  // 25/11/2026: direto aos detalhes do filme lá.
  const aoEscolher = (candidatoId: string) => {
    const categoriaId = candidatos.find((c) => c.id === candidatoId)?.categoriaId;
    const categoria = ativo.categorias.find((c) => c.id === categoriaId);
    if (categoria) router.push(`${rotaCategoria(ativo.slug, categoria.slug)}#${idDetalhes(candidatoId)}`);
    else destacar(candidatoId);
  };
  // As seis casas e a rotação de dois em dois: só a película de pé, do desktop.
  const pelicula = { casas: montarCasas(candidatos, rotacao.ids), trocas: rotacao.trocas, decorativa: n === 0, rotacao, aoEscolher };
  const periodo =
    evento.janelaInicio && evento.janelaFim
      ? descreverPeriodo(paraMs(evento.janelaInicio), paraMs(evento.janelaFim), evento.fusoHorario)
      : null;
  const informacoes = [
    periodo && { icone: CalendarDays, texto: `Votação: ${periodo}` },
    pilulaDoLocal(evento.local),
    n > 0 && { icone: Film, texto: textoContador(n, tema) },
  ].filter((i): i is InformacaoPilula => Boolean(i));

  return (
    // Foco branco: a cor de foco do tema some sobre a sala escura. As cores claras do texto vêm calculadas para o tema.
    <section
      aria-labelledby="titulo-evento"
      style={tokensCinema(tema) as CSSProperties}
      className="cine-sala relative isolate w-full overflow-clip text-white [--tema-foco:#ffffff]"
    >
      {tema.capaUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- capa decorativa, pode ser blob: na prévia
        <img src={tema.capaUrl} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover opacity-15 mix-blend-luminosity" />
      )}
      <Holofotes />
      <div aria-hidden className="cine-grao absolute inset-0 -z-10" />
      <Rosacea className="absolute -left-52 -top-28 -z-10 size-[34rem] text-cine-secundaria-clara opacity-[0.08] sm:-left-36" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-12 lg:pb-20 xl:grid-cols-[minmax(0,1fr)_29rem] lg:pt-16">
        <div className="flex min-w-0 flex-col items-start">
          {organizador && (
            <div className="marca-subir mb-8" style={atraso(0)}>
              <LogoOrganizador marca={organizador} claro prioridade className="h-14 sm:h-16" />
            </div>
          )}
          <p
            className="marca-subir inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cine-primaria-clara ring-1 ring-white/15"
            style={atraso(0)}
          >
            <Clapperboard aria-hidden className="size-4" />
            Votação popular
          </p>

          <h1 id="titulo-evento" className="marca-subir mt-6 max-w-full font-cine uppercase wrap-anywhere" style={atraso(80)}>
            {chamada && (
              <span className="block text-[clamp(1.15rem,4.5vw,1.6rem)] font-bold tracking-[0.14em] text-cine-primaria-clara">{chamada}</span>
            )}
            <span className={cx("block text-balance text-[clamp(2.4rem,10vw,4.5rem)] font-bold leading-[0.98] tracking-tight", chamada && "mt-2")}>
              {principal}
            </span>
          </h1>
          {/* As duas cores do tema, lado a lado, como os fios de cor do logo. */}
          <span aria-hidden className="marca-subir mt-6 flex h-1.5 w-28 overflow-hidden rounded-full" style={atraso(160)}>
            <span className="flex-1 bg-tema-primaria" />
            <span className="flex-1 bg-tema-secundaria" />
          </span>

          {evento.descricao && (
            <p className="marca-subir mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/85 sm:text-lg" style={atraso(220)}>
              {evento.descricao}
            </p>
          )}

          <PilulasInformacao itens={informacoes} className="marca-subir mt-6" style={atraso(260)} />

          <AcoesDoHero />
        </div>

        <div className="marca-subir hidden lg:block" style={atraso(200)}>
          <PeliculaTripla {...pelicula} />
        </div>
      </div>

      {/* 25/11/2026: no tablet, um carrossel infinito comum com todos os cartazes; no celular, sem película. */}
      <div className="marca-subir hidden pb-10 md:block lg:hidden" style={atraso(380)}>
        <PeliculaCarrossel candidatos={candidatos} aoEscolher={aoEscolher} />
      </div>

      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />
    </section>
  );
}
