"use client";

import { ExternalLink } from "lucide-react";
import { votaveis } from "@/dominio/candidatos";
import { rotaVotacao } from "@/dominio/destinoAcesso";
import { chamadaDaSituacao, votacaoAberta } from "@/dominio/situacaoEvento";
import { Botao, classesBotao } from "@/components/ui/Botao";
import { minusculas } from "@/lib/rotulos";
import { anoNoFuso, paraMs } from "@/lib/tempo";
import { abrirAcesso } from "@/store/acoesAcesso";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSituacaoEvento } from "@/store/seletores/situacao";

const ID_EXPLICACAO = "cta-indisponivel";

/**
 * Primeira dobra da página do evento (/e/[slug], 08/10/2026: a landing do evento saiu de "/").
 * Igual para todos (08/10/2026): a chamada da situação (Criar conta / Quero votar / Em breve) abre o diálogo de
 * acesso do visitante; logado, "Quero votar" leva à votação e "Criar conta", sem sentido para quem já tem conta, some.
 */
export function LandingHero() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const { logado } = useSessao();
  if (!ativo || !situacao) return null;
  const { slug, evento, tema, candidatos } = ativo;
  const chamada = chamadaDaSituacao(situacao);
  const n = votaveis(candidatos).length;
  const rotulos = minusculas(tema.rotuloCandidatos);
  const ano = evento.janelaInicio ? anoNoFuso(paraMs(evento.janelaInicio), evento.fusoHorario) : null;
  const badge = [evento.local, ano].filter(Boolean).join(" · ");
  // "Quero votar" só com o evento ativo e a urna aberta (a situação já garante; a regra fica explícita).
  const semVoto = chamada.rotulo === "Quero votar" && !votacaoAberta(evento);
  const rotuloChamada = semVoto || (logado && chamada.rotulo === "Criar conta") ? null : chamada.rotulo;

  return (
    <section aria-labelledby="titulo-evento" className="w-full">
      {tema.capaUrl && (
        <div aria-hidden className="h-28 w-full overflow-hidden sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element -- capa decorativa, pode ser blob: na prévia */}
          <img src={tema.capaUrl} alt="" className="size-full object-cover" />
        </div>
      )}
      <div className="w-full bg-gradient-to-b from-tema-secundaria/10 to-tema-fundo px-4 py-16 text-center sm:px-6 sm:py-20">
        {badge && (
          <span className="inline-block rounded-full bg-tema-secundaria/15 px-4 py-1 text-sm font-medium text-tema-secundaria-texto">
            {badge}
          </span>
        )}
        <h1
          id="titulo-evento"
          className="mx-auto mt-6 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
        >
          {tema.nomeExibicao ?? evento.nome}
        </h1>
        {evento.descricao && (
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-tema-texto-suave">{evento.descricao}</p>
        )}
        <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-tema-primaria-texto">
          {n >= 2 ? `Escolha seus favoritos entre ${n} ${rotulos}` : `Escolha seus favoritos entre os ${rotulos}`}
        </p>

        {(rotuloChamada || evento.linkSobre) && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {rotuloChamada &&
              (chamada.desabilitado ? (
                <Botao tamanho="grande" disabled aria-describedby={ID_EXPLICACAO}>
                  {rotuloChamada}
                </Botao>
              ) : logado ? (
                <Botao href={rotaVotacao(slug)} tamanho="grande">
                  {rotuloChamada}
                </Botao>
              ) : (
                <Botao
                  tamanho="grande"
                  onClick={() => abrirAcesso(rotuloChamada === "Criar conta" ? "criar" : "entrar")}
                >
                  {rotuloChamada}
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
        )}
        {rotuloChamada && chamada.desabilitado && (
          <p id={ID_EXPLICACAO} className="mt-3 text-sm text-tema-texto-suave">
            A votação ainda não está disponível.
          </p>
        )}
      </div>
    </section>
  );
}
