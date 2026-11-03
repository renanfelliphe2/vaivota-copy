"use client";

import { LogOut, WifiOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { definirQuiosqueAtivo } from "@/store/acoesTotem";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useVisaoTotem } from "@/store/seletores/totem";
import { recarregarEstado } from "@/store/servidor";
import { DialogoPinTotem } from "./DialogoPinTotem";
import { FluxoTotem } from "./FluxoTotem";
import { TotemBloqueado } from "./TotemBloqueado";
import { useDispositivoDoTotem } from "./useDispositivoDoTotem";

// Totem (Base/VotoInfantil.md §6): modo quiosque. Sem login: a identidade é o aparelho pareado (token no cookie do tablet).
// Tela cheia no primeiro toque, sem seleção de texto, sem menu de contexto; sair só com o PIN.
// Fora de VOTANDO mostra uma tela neutra; o fluxo desmonta e volta ao início quando a situação muda.
// O estado do aparelho (ativo, pausado, revogado) vem do servidor a cada poucos segundos e a cada voto recusado.

export function TelaTotem() {
  const ativoDoEvento = useEventoAtivo();
  const aparelho = useDispositivoDoTotem(ativoDoEvento?.evento.id ?? null);
  const visao = useVisaoTotem(aparelho.dispositivo);
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [pinAberto, setPinAberto] = useState(false);

  // A toolbar some em AUTO enquanto o quiosque está montado (Alt+D traz de volta).
  useEffect(() => {
    definirQuiosqueAtivo(true);
    return () => definirQuiosqueAtivo(false);
  }, []);

  if (!visao) return null;
  const { ativo, dispositivo, candidatos, situacao } = visao;
  const { tema, evento, configApresentacao } = ativo;
  const nome = tema.nomeExibicao ?? evento.nome;

  function pedirTelaCheia() {
    const el = raiz.current;
    if (!el?.requestFullscreen || document.fullscreenElement) return;
    // Sem tela cheia o quiosque segue em janela (navegador sem suporte ou gesto recusado).
    el.requestFullscreen().catch(() => {});
  }

  function sair() {
    setPinAberto(false);
    if (document.fullscreenElement) void document.exitFullscreen();
    router.push(`/e/${ativo.slug}`);
  }

  /** Voto recusado ou sem rede: confere de novo o aparelho e o evento, para a tela virar a neutra certa sem esperar o polling. */
  function atualizar() {
    aparelho.recarregar();
    void recarregarEstado();
  }

  const logo = <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-12 sm:h-16" prioridade />;

  return (
    <div
      ref={raiz}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-40 flex touch-manipulation select-none flex-col overflow-y-auto overscroll-none bg-tema-fundo text-tema-texto font-tema"
    >
      <button
        type="button"
        onClick={() => (dispositivo ? setPinAberto(true) : sair())}
        aria-label={TEXTOS_TOTEM.sair}
        title={TEXTOS_TOTEM.sair}
        className="absolute right-3 top-3 z-10 inline-flex size-11 items-center justify-center rounded-full text-tema-texto-suave opacity-40 hover:bg-tema-superficie hover:opacity-100 focus-visible:opacity-100"
      >
        <LogOut aria-hidden className="size-5" />
      </button>

      <main id="conteudo" className="flex flex-1 flex-col">
        {aparelho.carregando ? (
          <p role="status" className="m-auto text-2xl text-tema-texto-suave">
            {TEXTOS_TOTEM.carregando}
          </p>
        ) : aparelho.semConexao ? (
          <>
            <div className="flex justify-center px-6 pt-8">{logo}</div>
            <div role="alert" className="palco-entrada flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
              <span className="flex size-28 items-center justify-center rounded-full bg-tema-superficie text-tema-primaria-texto">
                <WifiOff aria-hidden className="size-14" strokeWidth={1.75} />
              </span>
              <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{TEXTOS_TOTEM.semConexaoTitulo}</h1>
              <p className="max-w-2xl text-xl text-tema-texto-suave sm:text-2xl">{TEXTOS_TOTEM.semConexaoCorpo}</p>
            </div>
          </>
        ) : situacao === "VOTANDO" ? (
          <FluxoTotem
            eventoId={evento.id}
            candidatos={candidatos}
            rotuloCategoria={configApresentacao.rotuloCategoriaInfantil}
            logo={logo}
            logoPequeno={<LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-9 sm:h-10" />}
            aoComecar={pedirTelaCheia}
            aoFalhar={atualizar}
          />
        ) : (
          <>
            <div className="flex justify-center px-6 pt-8">{logo}</div>
            <TotemBloqueado situacao={situacao} rotuloCandidatos={tema.rotuloCandidatos} />
            {situacao === "NAO_PAREADO" && (
              <div className="flex justify-center px-6 pb-12">
                <Link
                  href={`/e/${ativo.slug}/totem/parear`}
                  className="inline-flex min-h-14 items-center rounded-full border-4 border-tema-texto-suave px-8 text-xl font-bold"
                >
                  {TEXTOS_TOTEM.parearAparelho}
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      {dispositivo && (
        <p aria-hidden className="pointer-events-none absolute bottom-2 left-3 text-xs text-tema-texto-suave opacity-60">
          {dispositivo.nome}
        </p>
      )}

      <DialogoPinTotem aberto={pinAberto} pareado={dispositivo !== null} aoFechar={() => setPinAberto(false)} aoSair={sair} />
    </div>
  );
}
