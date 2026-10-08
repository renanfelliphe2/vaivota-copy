"use client";

import Link from "next/link";
import { ExternalLink, Gavel } from "lucide-react";
import { votaveis } from "@/dominio/candidatos";
import { chamadaDaSituacao } from "@/dominio/situacaoEvento";
import { Botao, classesBotao } from "@/components/ui/Botao";
import { minusculas } from "@/lib/rotulos";
import { anoNoFuso, paraMs } from "@/lib/tempo";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSituacaoEvento } from "@/store/seletores/situacao";

const ID_EXPLICACAO = "cta-indisponivel";

export function LandingHero() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  if (!ativo || !situacao) return null;
  const { slug, evento, tema, candidatos } = ativo;
  const chamada = chamadaDaSituacao(situacao);
  const n = votaveis(candidatos).length;
  const rotulos = minusculas(tema.rotuloCandidatos);
  const ano = evento.janelaInicio ? anoNoFuso(paraMs(evento.janelaInicio), evento.fusoHorario) : null;
  const badge = [evento.local, ano].filter(Boolean).join(" · ");
  const mostrarJurado = chamada.linkJurado && evento.moduloJuri;

  return (
    <section className="w-full bg-gradient-to-b from-tema-secundaria/10 to-tema-fundo px-4 py-16 text-center sm:px-6 sm:py-20">
      {badge && (
        <span className="inline-block rounded-full bg-tema-secundaria/15 px-4 py-1 text-sm font-medium text-tema-secundaria-texto">
          {badge}
        </span>
      )}
      <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        {tema.nomeExibicao ?? evento.nome}
      </h1>
      {evento.descricao && (
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-tema-texto-suave">{evento.descricao}</p>
      )}
      <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-tema-primaria-texto">
        {n >= 2 ? `Escolha seus favoritos entre ${n} ${rotulos}` : `Escolha seus favoritos entre os ${rotulos}`}
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {chamada.rotulo &&
          (chamada.desabilitado ? (
            <Botao tamanho="grande" disabled aria-describedby={ID_EXPLICACAO}>
              {chamada.rotulo}
            </Botao>
          ) : (
            <Botao href={`/e/${slug}`} tamanho="grande">
              {chamada.rotulo}
            </Botao>
          ))}
        {evento.linkSobre && (
          <a
            href={evento.linkSobre}
            target="_blank"
            rel="noopener noreferrer"
            className={classesBotao({ variante: "contorno", tamanho: "grande" })}
          >
            <span>Sobre o evento</span>
            <ExternalLink aria-hidden className="size-4" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </div>
      {chamada.desabilitado && (
        <p id={ID_EXPLICACAO} className="mt-3 text-sm text-tema-texto-suave">
          A votação ainda não está disponível.
        </p>
      )}
      {mostrarJurado && (
        <p className="mt-5">
          <Link
            href={`/e/${slug}/convite`}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-tema-primaria-texto underline underline-offset-4 hover:no-underline"
          >
            <Gavel aria-hidden className="size-4" />
            Sou jurado
          </Link>
        </p>
      )}
    </section>
  );
}
