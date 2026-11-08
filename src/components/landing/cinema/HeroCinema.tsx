"use client";

import { CalendarDays, Clapperboard, Film, MapPin, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { LogoOrganizador } from "@/components/evento/MarcaOrganizador";
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
import { Rosacea } from "./DecoracoesCinema";
import { PeliculaDeitada, PeliculaDupla } from "./PeliculaDosCandidatos";

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
  const lista = useCandidatosParaVotacao();
  const { organizador } = useIdentidadePagina();
  const { destacar } = useDestaqueCandidato();
  if (!ativo || !situacao) return null;
  const { evento, tema } = ativo;
  const candidatos = lista?.itens.map((i) => i.candidato) ?? [];
  const n = candidatos.length;
  const { chamada, principal } = dividirTitulo(tema.nomeExibicao ?? evento.nome);
  const periodo =
    evento.janelaInicio && evento.janelaFim
      ? descreverPeriodo(paraMs(evento.janelaInicio), paraMs(evento.janelaFim), evento.fusoHorario)
      : null;
  const informacoes = [
    periodo && { icone: CalendarDays, texto: `Votação: ${periodo}` },
    evento.local && { icone: MapPin, texto: evento.local },
    n > 0 && { icone: Film, texto: textoContador(n, tema) },
  ].filter((i): i is { icone: LucideIcon; texto: string } => Boolean(i));

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
      <div aria-hidden className="cine-feixe absolute inset-0 -z-10" />
      <div aria-hidden className="cine-grao absolute inset-0 -z-10" />
      <Rosacea className="absolute -left-52 -top-28 -z-10 size-[34rem] text-cine-secundaria-clara opacity-[0.08] sm:-left-36" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-10 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12 lg:pb-20 lg:pt-16">
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

          <h1 id="titulo-evento" className="marca-subir mt-6 font-cine uppercase" style={atraso(80)}>
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

          {informacoes.length > 0 && (
            <ul className="marca-subir mt-6 flex flex-wrap gap-2" style={atraso(260)}>
              {informacoes.map(({ icone: Icone, texto }) => (
                <li
                  key={texto}
                  className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-white/90 ring-1 ring-white/15"
                >
                  <Icone aria-hidden className="size-4 shrink-0 text-cine-secundaria-clara" />
                  {texto}
                </li>
              ))}
            </ul>
          )}

          <AcoesDoHero />
        </div>

        <div className="marca-subir hidden lg:block" style={atraso(200)}>
          <PeliculaDupla candidatos={candidatos} aoEscolher={destacar} />
        </div>
      </div>

      <div className="marca-subir pb-10 lg:hidden" style={atraso(380)}>
        <PeliculaDeitada candidatos={candidatos} aoEscolher={destacar} />
      </div>

      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />
    </section>
  );
}
