"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { definirQuiosqueAtivo } from "@/store/acoesTotem";
import { useVisaoTotem } from "@/store/seletores/totem";
import { DialogoPinTotem } from "./DialogoPinTotem";
import { FluxoTotem } from "./FluxoTotem";
import { TotemBloqueado } from "./TotemBloqueado";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6): modo quiosque. Sem login: a identidade é o aparelho pareado.
// Tela cheia no primeiro toque, sem seleção de texto, sem menu de contexto; sair só com o PIN.
// Fora de VOTANDO mostra uma tela neutra; o fluxo desmonta e volta ao início quando a situação muda.

export function TelaTotem() {
  const visao = useVisaoTotem();
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
        {situacao === "VOTANDO" ? (
          <FluxoTotem
            eventoId={evento.id}
            dispositivoId={dispositivo!.id}
            candidatos={candidatos}
            rotuloCategoria={configApresentacao.rotuloCategoriaInfantil}
            logo={<LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-12 sm:h-16" prioridade />}
            logoPequeno={<LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-9 sm:h-10" />}
            aoComecar={pedirTelaCheia}
          />
        ) : (
          <>
            <div className="flex justify-center px-6 pt-8">
              <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-12 sm:h-16" prioridade />
            </div>
            <TotemBloqueado situacao={situacao} rotuloCandidatos={tema.rotuloCandidatos} />
          </>
        )}
      </main>

      {dispositivo && (
        <p aria-hidden className="pointer-events-none absolute bottom-2 left-3 text-xs text-tema-texto-suave opacity-60">
          {dispositivo.nome}
        </p>
      )}

      <DialogoPinTotem aberto={pinAberto} dispositivoId={dispositivo?.id ?? null} aoFechar={() => setPinAberto(false)} aoSair={sair} />
    </div>
  );
}
