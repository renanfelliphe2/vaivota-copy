"use client";

import { useEffect, useRef, useState } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import type { CandidatoPalco, EstadoTrailer } from "@/dominio/apresentacao/tipos";
import { comandoTirarMudo, comandoVolume, interpretarLinkTrailer } from "@/dominio/apresentacao/trailer";
import { cx } from "@/lib/classes";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { atraso, Cortina, FundoCinema, PalcoCinema, Reticencias, usePapelNaPassagem, vars } from "../Cinema";
import { useMovimentoReduzido } from "../hooks";
import { MaisNomes } from "../Pecas";
import { ChamadaCerimonia } from "../telao/CenasCerimonia";

// Etapa 8 (D11, 5.8): trailer único do evento por link/embed, com fallback gerado em CSS. Nunca armazena
// vídeo. O iframe começa sem mudo (o clique em Apresentar liberou o áudio, C19).
// 08/10/2026: o telão é uma aba própria e pode nunca ter recebido um toque; aí o vídeo começa mudo (única forma de
// o navegador deixar rodar sozinho) e o som volta no primeiro clique ou tecla no telão. O gerado virou uma
// sequência de títulos: logo → nome → candidatos → chamada do resultado.

const MAX_CANDIDATOS_TRAILER = 12;

/** Janelas de tempo (ms) do trailer gerado, proporcionais a DURACOES.trailerGerado. */
function janelas(total: number) {
  const t = (f: number) => Math.round(total * f);
  return {
    logo: { atraso: t(0.02), dur: t(0.28) },
    nome: { atraso: t(0.27), dur: t(0.36) },
    meio: { atraso: t(0.61), dur: t(0.27) },
    chamada: { atraso: t(0.86) },
  };
}

function PlacaLogo({ nome, logoUrl }: { nome: string; logoUrl: string | null }) {
  return (
    <div className="rounded-[36px] bg-tema-fundo px-12 py-8 text-tema-texto shadow-[0_0_120px_color-mix(in_srgb,var(--cinema-luz)_45%,transparent)] [&_span]:text-[64px] [&_img]:h-36">
      <LogoEvento nome={nome} logoUrl={logoUrl} className="h-36" />
    </div>
  );
}

function TrailerEstatico({ nome, logoUrl, candidatos }: { nome: string; logoUrl: string | null; candidatos: CandidatoPalco[] }) {
  const visiveis = candidatos.slice(0, MAX_CANDIDATOS_TRAILER);
  return (
    <PalcoCinema fundo={<FundoCinema holofotes={false} poeira={false} />}>
      <div className="flex h-full flex-col items-center justify-center gap-12 p-20 text-center">
        <PlacaLogo nome={nome} logoUrl={logoUrl} />
        <p className="text-[96px] font-black leading-tight">{nome}</p>
        {visiveis.length > 0 && (
          <div className="grid w-full grid-cols-6 gap-5">
            {visiveis.map((c) => (
              <ImagemCandidato key={c.id} titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="16/9" className="rounded-2xl" sizes="280px" />
            ))}
          </div>
        )}
      </div>
    </PalcoCinema>
  );
}

function TrailerGerado({ nome, logoUrl, candidatos }: { nome: string; logoUrl: string | null; candidatos: CandidatoPalco[] }) {
  const reduzido = useMovimentoReduzido();
  if (reduzido) return <TrailerEstatico nome={nome} logoUrl={logoUrl} candidatos={candidatos} />;
  const j = janelas(DURACOES.trailerGerado);
  const visiveis = candidatos.slice(0, MAX_CANDIDATOS_TRAILER);
  const camada = (w: { atraso: number; dur: number }) => vars({ "--atraso": `${w.atraso}ms`, "--dur": `${w.dur}ms` });
  return (
    <PalcoCinema>
      {/* 1. Logo */}
      <div className="cinema-janela absolute inset-0 flex flex-col items-center justify-center gap-10" style={camada(j.logo)}>
        <div className="cinema-pop" style={atraso(j.logo.atraso + 200)}>
          <PlacaLogo nome={nome} logoUrl={logoUrl} />
        </div>
        <p className="cinema-tracking text-[40px] font-semibold uppercase tracking-[0.5em] text-cinema-suave" style={atraso(j.logo.atraso + 900)}>
          {TEXTOS_PALCO.apresenta}
        </p>
      </div>

      {/* 2. Nome (25/11/2026: sem a data). Entra por desfoque e escala: animar o espaçamento das letras mudava a quebra
          de linha a cada quadro, e o bloco centralizado subia e descia até estabilizar. */}
      <div className="cinema-janela absolute inset-0 flex flex-col items-center justify-center gap-10 px-24 text-center" style={camada(j.nome)}>
        <p className="cinema-revelar text-[120px] font-black uppercase leading-[1.02] tracking-[0.04em] text-balance" style={atraso(j.nome.atraso + 100)}>
          {nome}
        </p>
        <span className="cinema-barra h-[4px] w-[900px] bg-linear-to-r from-transparent via-cinema-destaque to-transparent" style={atraso(j.nome.atraso + 700)} />
      </div>

      {/* 3. Candidatos (25/11/2026: sem itens, a janela fica vazia; saiu "Os votos foram contados") */}
      {visiveis.length > 0 && (
        <div className="cinema-janela absolute inset-0 flex flex-col items-center justify-center gap-8 px-20" style={camada(j.meio)}>
          <div className="grid w-full grid-cols-6 gap-5">
            {visiveis.map((c, i) => (
              <div key={c.id} className="cinema-pop overflow-hidden rounded-2xl" style={atraso(j.meio.atraso + 150 + i * 90)}>
                <div className="cinema-zoom-lento" style={vars({ "--dur": `${j.meio.dur}ms` })}>
                  <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="16/9" sizes="280px" />
                </div>
              </div>
            ))}
          </div>
          <MaisNomes mais={candidatos.length - visiveis.length} />
        </div>
      )}

      {/* 4. Chamada do resultado (fica até o fim) */}
      <div className="absolute inset-0 flex items-center justify-center px-24">
        <p className="cinema-revelar cinema-ouro text-center text-[130px] font-black uppercase leading-[1.02]" style={atraso(j.chamada.atraso)}>
          {TEXTOS_PALCO.chegouAHora}
        </p>
      </div>
    </PalcoCinema>
  );
}

/** O telão já recebeu um toque? Sem isso, o navegador bloqueia vídeo com som (só deixa mudo). */
function telaoAtivado(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.userActivation?.hasBeenActive ?? true;
}

/** "Na última edição…" no preto, antes de o trailer aparecer (08/10/2026): entra, segura e some na sua janela. */
function TituloAbertura() {
  return (
    <div
      className="cinema-janela absolute inset-0 flex flex-col items-center justify-center gap-10 text-white"
      style={vars({ "--atraso": "300ms", "--dur": `${DURACOES.aberturaTrailer - 300}ms` })}
    >
      <span className="cinema-barra h-[3px] w-[720px] bg-linear-to-r from-transparent via-white/70 to-transparent" style={atraso(500)} />
      <p className="cinema-tracking flex items-baseline text-[96px] font-light uppercase tracking-[0.3em]" style={atraso(400, { "--dur": "2200ms" })}>
        {TEXTOS_PALCO.naUltimaEdicao}
        <Reticencias />
      </p>
      <span className="cinema-barra h-[3px] w-[720px] bg-linear-to-r from-transparent via-white/70 to-transparent" style={atraso(700)} />
    </div>
  );
}

function TrailerLink({
  embed,
  mudo,
  nome,
  encerrando,
  aoPronto,
}: {
  embed: string;
  mudo: boolean;
  nome: string;
  /** Na chamada dos vencedores: o vídeo segue por baixo, mas o som baixa até zero. */
  encerrando: boolean;
  aoPronto: () => void;
}) {
  const quadro = useRef<HTMLIFrameElement>(null);
  /** Date.now() do onLoad do player. */
  const [carregouEm, setCarregouEm] = useState<number | null>(null);
  const [aberturaFeita, setAberturaFeita] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const papel = usePapelNaPassagem();
  const emCena = papel === "EM_CENA";
  const silenciar = papel === "SAINDO" || encerrando;

  // Entrada (08/10/2026): o vídeo começa a carregar e a tocar por baixo, enquanto a tela anterior escurece e o
  // título "Na última edição…" passa no preto (o som chega antes da imagem). O preto só abre depois do título, com o
  // player carregado há um instante (o autoplay leva um pouco); nunca sobre o quadro vazio.
  useEffect(() => {
    if (!emCena) return;
    const t = setTimeout(() => setAberturaFeita(true), DURACOES.aberturaTrailer);
    return () => clearTimeout(t);
  }, [emCena]);
  useEffect(() => {
    if (carregouEm === null || !aberturaFeita) return;
    const t = setTimeout(() => setVisivel(true), Math.max(0, carregouEm + DURACOES.esperaPlayerTrailer - Date.now()));
    return () => clearTimeout(t);
  }, [carregouEm, aberturaFeita]);

  // Saída (passagem pelo preto) e chamada dos vencedores: o som baixa junto com a imagem. Voltando da chamada, volta.
  useEffect(() => {
    const enviar = (fracao: number) => {
      const comando = comandoVolume(embed, fracao);
      if (comando) quadro.current?.contentWindow?.postMessage(comando, "*");
    };
    if (!silenciar) {
      enviar(1);
      return;
    }
    const inicio = Date.now();
    const passo = setInterval(() => {
      const fracao = 1 - (Date.now() - inicio) / DURACOES.passagemPreto;
      enviar(fracao);
      if (fracao <= 0) clearInterval(passo);
    }, 60);
    return () => clearInterval(passo);
  }, [silenciar, embed]);

  // Mudo: o primeiro clique ou tecla no telão devolve o som (o gesto libera o áudio na aba).
  useEffect(() => {
    if (!mudo) return;
    const comando = comandoTirarMudo(embed);
    if (!comando) return;
    const tirarMudo = () => {
      quadro.current?.contentWindow?.postMessage(comando, "*");
      window.removeEventListener("pointerdown", tirarMudo);
      window.removeEventListener("keydown", tirarMudo);
    };
    window.addEventListener("pointerdown", tirarMudo);
    window.addEventListener("keydown", tirarMudo);
    return () => {
      window.removeEventListener("pointerdown", tirarMudo);
      window.removeEventListener("keydown", tirarMudo);
    };
  }, [mudo, embed]);

  return (
    <div className="relative h-full bg-black">
      <iframe
        ref={quadro}
        src={embed}
        title={`Trailer: ${nome}`}
        allow="autoplay; fullscreen; encrypted-media"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
        onLoad={() => {
          aoPronto();
          setCarregouEm(Date.now());
        }}
      />
      <div
        className={cx("pointer-events-none absolute inset-0 bg-black transition-opacity duration-[1200ms] ease-out", visivel ? "opacity-0" : "opacity-100")}
      >
        {emCena && !aberturaFeita && <TituloAbertura />}
      </div>
    </div>
  );
}

export function CenaTrailer({
  estado,
  passo,
  linkTrailer,
  forcarGerado,
  nome,
  logoUrl,
  data,
  candidatos,
  aoPronto,
  aoFalhar,
}: {
  estado: EstadoTrailer;
  /** 0: o trailer; 1: a chamada "E os vencedores deste ano são…" por cima dele. */
  passo: number;
  /** Link cadastrado (YouTube ou Vimeo); sem link válido vai direto ao gerado. */
  linkTrailer: string | null;
  /** usarTrailerGerado ou dev.simularTrailerFalha (o iframe nem é montado). */
  forcarGerado: boolean;
  nome: string;
  logoUrl: string | null;
  data: string;
  candidatos: CandidatoPalco[];
  aoPronto: () => void;
  aoFalhar: () => void;
}) {
  const falhar = useRef(aoFalhar);
  useEffect(() => {
    falhar.current = aoFalhar;
  });
  // Decidido na entrada da cena: trocar a URL no meio recarregaria o vídeo.
  const [mudo] = useState(() => !telaoAtivado());
  const embed = interpretarLinkTrailer(linkTrailer, { mudo });
  const usarLink = Boolean(embed) && !forcarGerado;

  useEffect(() => {
    if (estado !== "CARREGANDO") return;
    const timer = setTimeout(() => falhar.current(), usarLink ? DURACOES.limiteCargaTrailer : 0);
    return () => clearTimeout(timer);
  }, [estado, usarLink]);

  const chamada = passo >= 1;
  return (
    <div className="relative h-full">
      {usarLink && embed && estado !== "GERADO" ? (
        <TrailerLink embed={embed} mudo={mudo} nome={nome} encerrando={chamada} aoPronto={aoPronto} />
      ) : (
        <>
          <TrailerGerado nome={nome} logoUrl={logoUrl} candidatos={candidatos} />
          <Cortina />
        </>
      )}
      {chamada && (
        <div className="absolute inset-0 z-20">
          <ChamadaCerimonia nome={nome} logoUrl={logoUrl} ano={/\d{4}/.exec(data)?.[0] ?? null} />
        </div>
      )}
    </div>
  );
}
