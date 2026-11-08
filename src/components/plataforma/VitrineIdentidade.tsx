"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, type CSSProperties } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { legendaDaVotacao } from "@/dominio/vitrineEventos";
import { cx } from "@/lib/classes";
import { contar } from "@/lib/formatar";
import { calcularTokens, type CoresTema } from "@/lib/tema";
import { coresDoTema, origemDoClique, TEMA_VAIVOTA, useTemaDaLanding, useVotacoesRealizadas } from "./TemaDaLanding";
import { TituloDeSecao } from "./TituloDeSecao";

/** Números das votações com a urna encerrada (vêm do servidor, src/server/votacoesEncerradas.ts). */
export type ResumoVotacao = { slug: string; participantes: number; votos: number };

const PERSONALIZAVEL = ["Cores", "Logo", "Fonte", "Nome dos candidatos", "Contraste conferido"];

/**
 * Vitrine "A cara do seu evento" (07/11/2026): todas as votações que já aconteceram, cada uma com a identidade do evento.
 * Ao escolher uma, a landing inteira veste o tema dela (TemaDaLanding). Lê os eventos do estado público (sem consulta
 * própria): entra o evento que já abriu a urna ou foi concluído; rascunho nunca.
 */
export function VitrineIdentidade({ resumos }: { resumos: ResumoVotacao[] }) {
  const votacoes = useVotacoesRealizadas();
  const { evento: naPagina, aplicar } = useTemaDaLanding();
  const slug = naPagina?.slug ?? null;

  return (
    <section id="identidade" aria-labelledby="titulo-identidade" className="vv-identidade w-full border-y border-tema-borda">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end lg:gap-12">
          <TituloDeSecao
            id="titulo-identidade"
            rotulo="Identidade visual"
            titulo={
              <>
                A cara do{" "}
                <span className="bg-linear-to-r from-tema-primaria-texto to-vv-destaque-texto bg-clip-text text-transparent">seu evento</span>
              </>
            }
            texto="Cada votação na VaiVota veste as cores, o logo e a fonte de quem organiza. Escolha um evento abaixo e veja esta página inteira mudar para a identidade dele."
          />
          <ul aria-label="O que o evento personaliza" className="vv-surgir flex flex-wrap gap-2 text-sm font-semibold lg:justify-end">
            {PERSONALIZAVEL.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 rounded-full bg-tema-fundo px-3 py-1.5 ring-1 ring-tema-borda">
                <Check aria-hidden className="size-4 text-vv-destaque-texto" strokeWidth={3} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CartaoIdentidade
            nome="VaiVota"
            legenda="Cores originais da plataforma"
            rotuloAcao="Voltar esta página às cores originais da VaiVota"
            cores={TEMA_VAIVOTA}
            logoUrl={null}
            selecionado={slug === null}
            aoAplicar={(origem) => aplicar(null, origem)}
          />
          {votacoes.map(({ evento, tema, nome }) => {
            const resumo = resumos.find((r) => r.slug === evento.slug);
            return (
              <CartaoIdentidade
                key={evento.id}
                nome={nome}
                legenda={legendaDaVotacao(evento)}
                detalhe={resumo ? `${contar(resumo.votos, "voto", "votos")} · ${contar(resumo.participantes, "participante", "participantes")}` : undefined}
                rotuloAcao={`Ver esta página com a identidade de ${nome}`}
                cores={coresDoTema(tema)}
                logoUrl={tema.logoUrl}
                selecionado={slug === evento.slug}
                aoAplicar={(origem) => aplicar(evento.slug, origem)}
                href={`/e/${evento.slug}`}
              />
            );
          })}
          {votacoes.length === 0 && (
            <li className="flex min-h-64 items-center justify-center rounded-[1.75rem] border-2 border-dashed border-tema-borda p-8 text-center text-tema-texto-suave">
              O próximo evento aparece aqui, com a identidade dele, assim que a votação abrir.
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

type PropsCartao = {
  nome: string;
  legenda: string;
  detalhe?: string;
  /** Nome acessível do botão (a miniatura é decorativa). */
  rotuloAcao: string;
  cores: CoresTema;
  logoUrl: string | null;
  selecionado: boolean;
  aoAplicar: (origem: { x: number; y: number }) => void;
  href?: string;
};

function CartaoIdentidade({ nome, legenda, detalhe, rotuloAcao, cores, logoUrl, selecionado, aoAplicar, href }: PropsCartao) {
  const idLegenda = useId();
  return (
    <li className="vv-surgir flex flex-col gap-1">
      <button
        type="button"
        aria-pressed={selecionado}
        aria-label={rotuloAcao}
        aria-describedby={idLegenda}
        onClick={(e) => aoAplicar(origemDoClique(e))}
        className={cx(
          "group flex flex-1 flex-col gap-4 rounded-[1.75rem] bg-tema-fundo p-3.5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
          selecionado ? "ring-2 ring-tema-texto" : "ring-1 ring-tema-borda hover:ring-tema-texto-suave",
        )}
      >
        <Miniatura nome={nome} cores={cores} logoUrl={logoUrl} />
        <span className="flex items-start justify-between gap-3 px-1.5">
          <span className="min-w-0">
            <span className="block text-lg font-bold leading-tight">{nome}</span>
            <span id={idLegenda} className="mt-1 block text-sm text-tema-texto-suave">
              {legenda}
              {detalhe && <span className="block font-semibold text-tema-texto">{detalhe}</span>}
            </span>
          </span>
          <span
            aria-hidden
            className={cx(
              "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
              selecionado ? "bg-tema-texto text-tema-fundo" : "bg-tema-superficie text-tema-texto group-hover:bg-tema-texto group-hover:text-tema-fundo",
            )}
          >
            {selecionado ? (
              <>
                <Check className="size-3.5" strokeWidth={3} />
                Na página
              </>
            ) : (
              "Aplicar"
            )}
          </span>
        </span>
        <span aria-hidden className="flex items-center gap-3 px-1.5 pb-1">
          <span className="flex">
            {[cores.corPrimaria, cores.corSecundaria, cores.corFundo, cores.corTexto].map((cor, i) => (
              <span key={i} className="-ml-1.5 size-6 rounded-full shadow-sm ring-2 ring-tema-fundo first:ml-0" style={{ backgroundColor: cor }} />
            ))}
          </span>
          <span className="font-mono text-xs uppercase text-tema-texto-suave">
            {cores.corPrimaria} · {cores.corSecundaria}
          </span>
        </span>
      </button>
      {href && (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center gap-1 self-start px-2 text-sm font-semibold text-tema-texto-suave underline-offset-4 hover:text-tema-texto hover:underline"
        >
          Abrir a página do evento
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      )}
    </li>
  );
}

/**
 * Miniatura decorativa da página do evento, pintada com os tokens do tema DELE (não o da página): faixa na primária,
 * "Aa" na fonte, botão na secundária e cartões na superfície. Span, não div: fica dentro do botão.
 */
function Miniatura({ nome, cores, logoUrl }: { nome: string; cores: CoresTema; logoUrl: string | null }) {
  const tokens = useMemo(() => calcularTokens(cores), [cores]);
  return (
    <span
      aria-hidden
      style={{ ...tokens.variaveis, colorScheme: tokens.esquemaCor } as CSSProperties}
      className="pointer-events-none block overflow-hidden rounded-[1.25rem] bg-tema-fundo font-tema text-tema-texto ring-1 ring-tema-borda"
    >
      <span className="flex items-center gap-2 bg-tema-primaria px-3 py-2.5 text-tema-sobre-primaria">
        {logoUrl ? (
          <span className="flex h-6 shrink-0 items-center rounded-md bg-white px-1.5">
            <LogoEvento nome={nome} logoUrl={logoUrl} className="h-4 w-auto" />
          </span>
        ) : (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-tema-sobre-primaria/15 text-xs font-bold">
            {nome.trim().charAt(0).toLocaleUpperCase("pt-BR")}
          </span>
        )}
        <span className="truncate text-xs font-bold">{nome}</span>
        <span className="ml-auto flex shrink-0 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-1.5 rounded-full bg-tema-sobre-primaria/50" />
          ))}
        </span>
      </span>
      <span className="flex flex-col gap-3 p-3.5">
        <span className="flex items-end justify-between gap-3">
          <span>
            <span className="block text-3xl font-bold leading-none">Aa</span>
            <span className="mt-1 block text-[11px] text-tema-texto-suave">{cores.fonte}</span>
          </span>
          <span className="rounded-full bg-tema-secundaria px-3 py-1.5 text-[11px] font-bold text-tema-sobre-secundaria">Quero votar</span>
        </span>
        <span className="grid grid-cols-3 gap-1.5">
          {["bg-tema-primaria", "bg-tema-secundaria", "bg-tema-primaria"].map((cor, i) => (
            <span key={i} className="flex flex-col gap-1 rounded-lg bg-tema-superficie p-1.5">
              <span className={cx("block aspect-[4/3] rounded-md opacity-85", cor)} />
              <span className="block h-1 w-3/4 rounded-full bg-tema-texto-suave/40" />
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
