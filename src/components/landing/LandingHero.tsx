"use client";

import { CircleCheck, Clock, ExternalLink, UserPlus, Vote } from "lucide-react";
import type { CSSProperties } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { LogoOrganizador, MARCA_ORGANIZADOR } from "@/components/evento/MarcaOrganizador";
import { Botao } from "@/components/ui/Botao";
import { rotaVotacao } from "@/dominio/destinoAcesso";
import { chamadaDaSituacao, votacaoAberta } from "@/dominio/situacaoEvento";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { dividirNome, minusculas } from "@/lib/rotulos";
import { textoContador } from "@/lib/textosEstado";
import { anoNoFuso, paraMs } from "@/lib/tempo";
import { abrirAcesso } from "@/store/acoesAcesso";
import { useCandidatosParaVotacao } from "@/store/seletores/candidatos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { useVisaoEvento } from "@/store/seletores/visao";
import { Constelacao, Onda } from "./Decoracoes";
import { useDestaqueCandidato } from "./DestaqueCandidato";

const ID_EXPLICACAO = "cta-indisponivel";
const ICONES_CHAMADA = { "Quero votar": Vote, "Criar conta": UserPlus, "Em breve": Clock } as const;
/** Casas do mosaico além do centro (3 × 3). Com mais candidatos, o mosaico mostra os primeiros e o centro, o total. */
const CASAS_MOSAICO = 8;
const MAX_AVATARES = 8;

/** Botões de vidro sobre o fundo escuro do hero (âncora e link externo). */
const CLASSES_VIDRO =
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
 * Primeira dobra da página do evento (/e/[slug]; 19/10/2026: redesenho com a identidade das artes da Maratona Tech Tivit).
 * Fundo noite → mar com a rede de nós do logo do organizador, nome em dois tons, a chamada da situação e os candidatos
 * (avatares no celular, mosaico no desktop) logo na primeira tela: o objetivo da página é mostrá-los e levar ao voto.
 * Cada casa do mosaico leva ao cartão do candidato na lista e o destaca (DestaqueCandidato).
 * A chamada (Criar conta / Quero votar / Em breve) abre o diálogo de acesso do visitante; logado, "Quero votar" rola até
 * a lista de candidatos (não há outro botão para isso), "Criar conta" some e, para quem já votou, vira o aviso de voto registrado.
 */
export function LandingHero() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const visao = useVisaoEvento();
  const lista = useCandidatosParaVotacao();
  const { logado } = useSessao();
  const { destacar } = useDestaqueCandidato();
  if (!ativo || !situacao) return null;
  const { slug, evento, tema } = ativo;
  const chamada = chamadaDaSituacao(situacao);
  const candidatos = lista?.itens.map((i) => i.candidato) ?? [];
  const n = candidatos.length;
  const ano = evento.janelaInicio ? anoNoFuso(paraMs(evento.janelaInicio), evento.fusoHorario) : null;
  const { primeira, resto } = dividirNome(tema.nomeExibicao ?? evento.nome);
  // "Quero votar" só com o evento ativo e a urna aberta (a situação já garante; a regra fica explícita).
  const semVoto = chamada.rotulo === "Quero votar" && !votacaoAberta(evento);
  const jaVotou = logado && visao?.seloVoto === "REGISTRADO";
  const rotuloChamada = semVoto || jaVotou || (logado && chamada.rotulo === "Criar conta") ? null : chamada.rotulo;
  const IconeChamada = rotuloChamada ? ICONES_CHAMADA[rotuloChamada] : null;
  const iconeChamada = IconeChamada && <IconeChamada aria-hidden className="size-5" />;
  const classesChamada = "grow shadow-lg shadow-black/25 sm:grow-0";

  return (
    // Foco branco: a cor de foco do tema (a primária) some sobre o fundo escuro.
    <section aria-labelledby="titulo-evento" className="marca-hero relative isolate w-full overflow-hidden text-white [--tema-foco:#ffffff]">
      {tema.capaUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- capa decorativa, pode ser blob: na prévia
        <img src={tema.capaUrl} alt="" aria-hidden className="absolute inset-0 -z-10 size-full object-cover opacity-20 mix-blend-luminosity" />
      )}
      <Constelacao className="absolute right-0 top-0 -z-10 h-full w-full max-w-4xl text-white opacity-80 [mask-image:linear-gradient(to_left,#000_45%,transparent)]" />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-24 pt-10 sm:px-6 sm:pb-32 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_25rem] lg:pb-40 lg:pt-16 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="flex min-w-0 flex-col items-start">
          <div className="marca-subir flex items-center gap-4" style={atraso(0)}>
            {MARCA_ORGANIZADOR && (
              <>
                <LogoOrganizador marca={MARCA_ORGANIZADOR} claro prioridade className="h-14 sm:h-16" />
                <span aria-hidden className="h-10 w-px bg-white/30" />
              </>
            )}
          </div>

          <h1
            id="titulo-evento"
            className="marca-subir mt-8 font-display text-[clamp(2.5rem,11vw,3.75rem)] font-extrabold leading-[0.95] tracking-tight lg:text-6xl xl:text-7xl"
            style={atraso(80)}
          >
            {primeira}
            {resto && (
              <>
                {" "}
                <span className="block w-fit bg-linear-to-r from-marca-agua to-tema-secundaria bg-clip-text pb-[0.08em] text-transparent">
                  {resto}
                </span>
              </>
            )}
          </h1>
          <span aria-hidden className="marca-subir mt-6 h-1.5 w-20 rounded-full bg-linear-to-r from-marca-agua to-tema-secundaria" style={atraso(160)} />

          {evento.descricao && (
            <p className="marca-subir mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg" style={atraso(220)}>
              {evento.descricao}
            </p>
          )}

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

          {n > 0 && (
            <div className="marca-subir mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 lg:hidden" style={atraso(380)}>
              <div aria-hidden className="flex -space-x-3">
                {candidatos.slice(0, MAX_AVATARES).map((c) => (
                  <ImagemCandidato
                    key={c.id}
                    titulo={c.titulo}
                    imagemUrl={c.imagemUrl}
                    proporcao="1/1"
                    sizes="44px"
                    className="size-11 shrink-0 rounded-full bg-white ring-2 ring-white/85"
                  />
                ))}
                {n > MAX_AVATARES && (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marca-noite text-xs font-bold ring-2 ring-white/85">
                    +{n - MAX_AVATARES}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-white/90">{textoContador(n, tema)}</p>
            </div>
          )}
        </div>

        {n > 0 && (
          <div className="marca-subir hidden lg:block" style={atraso(200)}>
            <MosaicoCandidatos
              candidatos={candidatos}
              total={n}
              rotulo={minusculas(n === 1 ? tema.rotuloCandidato : tema.rotuloCandidatos)}
              aoEscolher={destacar}
            />
          </div>
        )}
      </div>

      {/* A onda tem a cor da seção dos candidatos, que só existe com candidatos. */}
      {n > 0 && <Onda className="absolute inset-x-0 -bottom-px h-12 w-full sm:h-16 lg:h-24" />}
    </section>
  );
}

type PropsMosaico = { candidatos: readonly Candidato[]; total: number; rotulo: string; aoEscolher: (candidatoId: string) => void };

/**
 * Mosaico 3 × 3 dos candidatos (desktop). O centro mostra o total; as outras casas recebem os candidatos na ordem da lista,
 * ou ficam como vidro vazio. Cada casa de candidato é um botão (19/10/2026) que leva ao cartão dele na lista e o destaca.
 * No DOM as casas vão linha a linha (a ordem do Tab segue a da leitura); cada coluna flutua no seu tempo, e a do meio
 * fica mais baixa.
 */
function MosaicoCandidatos({ candidatos, total, rotulo, aoEscolher }: PropsMosaico) {
  const fila = candidatos.slice(0, CASAS_MOSAICO);
  const casas = Array.from({ length: 9 }, (_, i) => (i === 4 ? ("centro" as const) : (fila.shift() ?? null)));

  return (
    <div role="group" aria-label="Atalhos para a lista" className="relative mx-auto w-full max-w-[27rem]">
      <div aria-hidden className="absolute inset-10 -z-10 rounded-full bg-tema-secundaria/30 blur-3xl" />
      <div className="grid -rotate-6 grid-cols-3 gap-4">
        {casas.map((casa, i) => {
          const coluna = i % 3;
          return (
            <div
              key={i}
              className={cx("marca-flutuar", coluna === 1 && "translate-y-12")}
              style={{ "--atraso": `${-coluna * 2300}ms`, "--dur": `${7 + coluna}s` } as CSSProperties}
            >
              <CasaMosaico casa={casa} total={total} rotulo={rotulo} aoEscolher={aoEscolher} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CasaMosaico({ casa, total, rotulo, aoEscolher }: Omit<PropsMosaico, "candidatos"> & { casa: Candidato | "centro" | null }) {
  const base = "aspect-square w-full overflow-hidden rounded-2xl shadow-xl shadow-black/30 ring-1 ring-white/25";
  if (casa === "centro") {
    return (
      <div aria-hidden className={cx(base, "flex flex-col items-center justify-center bg-linear-to-br from-tema-primaria to-tema-secundaria text-marca-noite")}>
        <span className="font-display text-5xl font-extrabold leading-none">{total}</span>
        <span className="mt-1 text-sm font-bold">{rotulo}</span>
      </div>
    );
  }
  if (!casa) return <div aria-hidden className={cx(base, "bg-white/10")} />;
  // Hover e foco: a casa sobe, cresce e ganha o anel branco; a imagem aproxima e o nome sobe da base.
  return (
    <button
      type="button"
      data-gatilho-destaque=""
      aria-label={`Ver ${casa.titulo} na lista`}
      onClick={() => aoEscolher(casa.id)}
      className={cx(
        base,
        "group/casa relative block cursor-pointer bg-white transition duration-300 ease-out",
        "hover:-translate-y-1.5 hover:scale-[1.06] hover:shadow-2xl hover:shadow-black/40 hover:ring-2 hover:ring-white",
        "focus-visible:-translate-y-1.5 focus-visible:scale-[1.06] focus-visible:ring-2 focus-visible:ring-white",
      )}
    >
      <ImagemCandidato
        titulo={casa.titulo}
        imagemUrl={casa.imagemUrl}
        proporcao="1/1"
        sizes="9rem"
        className="size-full transition-transform duration-500 group-hover/casa:scale-110"
      />
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 translate-y-full bg-linear-to-t from-marca-noite/90 to-transparent px-2.5 pb-2 pt-6 text-left text-xs font-bold text-white transition-transform duration-300 group-hover/casa:translate-y-0 group-focus-visible/casa:translate-y-0"
      >
        <span className="line-clamp-1">{casa.titulo}</span>
      </span>
    </button>
  );
}
