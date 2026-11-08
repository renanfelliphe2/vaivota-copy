"use client";

import { CircleCheck, Clock, ExternalLink, UserPlus, Vote } from "lucide-react";
import type { CSSProperties } from "react";
import { Botao } from "@/components/ui/Botao";
import { rotaVotacao } from "@/dominio/destinoAcesso";
import { chamadaDaSituacao, votacaoAberta } from "@/dominio/situacaoEvento";
import { abrirAcesso } from "@/store/acoesAcesso";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { useVisaoEvento } from "@/store/seletores/visao";

const ID_EXPLICACAO = "cta-indisponivel";
const ICONES_CHAMADA = { "Quero votar": Vote, "Criar conta": UserPlus, "Em breve": Clock } as const;

/** Botões de vidro sobre o fundo escuro do hero (âncora e link externo). */
export const CLASSES_VIDRO =
  "inline-flex min-h-12 grow items-center justify-center gap-2 rounded-full bg-white/10 px-6 text-base font-semibold text-white ring-1 ring-white/35 backdrop-blur transition hover:bg-white/20 sm:grow-0";

const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as CSSProperties;

/**
 * Rola até a lista de candidatos (19/10/2026). Um <Link> para "/e/slug#candidatos" não rola quando a URL já termina
 * nesse hash (é o caso logo após o login: o destino do acesso é essa mesma âncora). A rolagem suave vem do CSS.
 * Sem a seção na página, cai na navegação normal.
 */
function irParaCandidatos(rota: string) {
  const secao = document.getElementById("candidatos");
  if (!secao) {
    window.location.assign(rota);
    return;
  }
  secao.scrollIntoView({ block: "start" });
  secao.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
}

/**
 * A chamada da primeira dobra da página do evento, sobre fundo escuro (19/10/2026; separada do LandingHero em 07/11/2026
 * para servir aos dois estilos de página). Criar conta / Quero votar / Em breve abre o diálogo de acesso do visitante;
 * logado, "Quero votar" rola até a lista de candidatos, "Criar conta" some e, para quem já votou, vira o aviso de voto
 * registrado. Ao lado, "Sobre o evento" quando há link.
 */
export function AcoesDoHero() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const visao = useVisaoEvento();
  const { logado } = useSessao();
  if (!ativo || !situacao) return null;
  const { slug, evento } = ativo;
  const chamada = chamadaDaSituacao(situacao);
  // "Quero votar" só com o evento ativo e a urna aberta (a situação já garante; a regra fica explícita).
  const semVoto = chamada.rotulo === "Quero votar" && !votacaoAberta(evento);
  const jaVotou = logado && visao?.seloVoto === "REGISTRADO";
  const rotuloChamada = semVoto || jaVotou || (logado && chamada.rotulo === "Criar conta") ? null : chamada.rotulo;
  const IconeChamada = rotuloChamada ? ICONES_CHAMADA[rotuloChamada] : null;
  const iconeChamada = IconeChamada && <IconeChamada aria-hidden className="size-5" />;
  const classesChamada = "grow shadow-lg shadow-black/25 sm:grow-0";

  return (
    <>
      {(rotuloChamada || jaVotou || evento.linkSobre) && (
        <div className="marca-subir mt-8 flex w-full flex-wrap items-center gap-3" style={atraso(300)}>
          {rotuloChamada &&
            (chamada.desabilitado ? (
              <Botao variante="secundaria" tamanho="grande" disabled aria-describedby={ID_EXPLICACAO} icone={iconeChamada} className={classesChamada}>
                {rotuloChamada}
              </Botao>
            ) : logado ? (
              <Botao variante="secundaria" tamanho="grande" icone={iconeChamada} className={classesChamada} onClick={() => irParaCandidatos(rotaVotacao(slug))}>
                {rotuloChamada}
              </Botao>
            ) : (
              <Botao
                variante="secundaria"
                tamanho="grande"
                icone={iconeChamada}
                className={classesChamada}
                onClick={() => abrirAcesso(rotuloChamada === "Criar conta" ? "criar" : "entrar")}
              >
                {rotuloChamada}
              </Botao>
            ))}
          {jaVotou && (
            <p className="inline-flex min-h-12 grow items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-marca-noite shadow-lg shadow-black/25 sm:grow-0">
              <CircleCheck aria-hidden className="size-5 text-tema-sucesso" />
              Seu voto foi registrado
            </p>
          )}
          {evento.linkSobre && (
            <a href={evento.linkSobre} target="_blank" rel="noopener noreferrer" className={CLASSES_VIDRO}>
              <span>Sobre o evento</span>
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </div>
      )}
      {rotuloChamada && chamada.desabilitado && (
        <p id={ID_EXPLICACAO} className="mt-3 text-sm text-white/80">
          A votação ainda não está disponível.
        </p>
      )}
    </>
  );
}
