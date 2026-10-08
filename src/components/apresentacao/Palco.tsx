"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ModoAvanco } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { useTelaoPublicado, type ComandoDoPalco } from "@/store/canalTelao";
import { ALTURA_PALCO, LARGURA_PALCO, useEscalaPalco } from "./hooks";
import { SeloEnsaio } from "./Pecas";

// Etapa 8 (5.7): canvas lógico 1920×1080 escalado (letterbox), camadas (cena, selo, pausa, ajuda).
// 08/10/2026: nada de HUD no telão. O palco é comandado pelo controle remoto (ControleRemoto, em qualquer aba do
// admin) pelos mesmos controles do teclado, e conta ao controle o que está mostrando (canalTelao). Na própria
// janela do telão, os atalhos de teclado continuam valendo.

export type ControlesPalco = {
  pausado: boolean;
  alternarPausa?: () => void;
  voltar?: () => void;
  avancar?: () => void;
  emergencia?: () => void;
  reiniciar?: () => void;
  modoAvanco?: ModoAvanco;
  alternarModo?: () => void;
};

const ATALHOS: [string, string][] = [
  ["Espaço", "Pausar / retomar"],
  ["→ ou Enter", "Avançar (inicia a revelação na tela de votação encerrada)"],
  ["←", "Voltar"],
  ["T", "Pular trailer"],
  ["F", "Entrar / sair da tela cheia"],
  ["Shift+E", "Emergência: ir direto ao resultado final"],
  ["Q", "Sair da apresentação"],
  ["?", "Mostrar / esconder esta ajuda"],
];

export function ListaAtalhos({ className }: { className?: string }) {
  return (
    <dl className={cx("grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm", className)}>
      {ATALHOS.map(([tecla, acao]) => (
        <div key={tecla} className="contents">
          <dt>
            <kbd className="rounded border border-tema-borda bg-tema-superficie px-1.5 py-0.5 font-mono text-xs">{tecla}</kbd>
          </dt>
          <dd>{acao}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Palco({
  ensaio,
  nomeCena,
  mensagem,
  ajudaVisivel,
  avisoPausa,
  controles,
  progresso = null,
  aoDesligar,
  children,
}: {
  ensaio: boolean;
  nomeCena: string;
  /** Aviso técnico (falha de leitura, auditoria): vai só para o controle remoto, nunca para o telão. */
  mensagem: string | null;
  ajudaVisivel: boolean;
  avisoPausa: boolean;
  controles: ControlesPalco;
  /** Cena atual (1…) e total, só durante a revelação. */
  progresso?: { cena: number; total: number } | null;
  /** "Desligar" do controle remoto. */
  aoDesligar: () => void;
  children: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const escala = useEscalaPalco(area);
  const [telaCheia, setTelaCheia] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const aoMudar = () => setTelaCheia(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  const acoes: Record<ComandoDoPalco, (() => void) | undefined> = {
    AVANCAR: controles.avancar,
    VOLTAR: controles.voltar,
    ALTERNAR_PAUSA: controles.alternarPausa,
    ALTERNAR_MODO: controles.modoAvanco ? controles.alternarModo : undefined,
    EMERGENCIA: controles.emergencia,
    REINICIAR: controles.reiniciar,
  };
  useTelaoPublicado(
    {
      situacao: "LIGADO",
      ensaio,
      nomeCena,
      progresso,
      andamento: !controles.alternarPausa ? "PARADO" : controles.pausado ? "PAUSADO" : "APRESENTANDO",
      modoAvanco: controles.modoAvanco ?? null,
      telaCheia,
      mensagem,
      pode: {
        AVANCAR: Boolean(acoes.AVANCAR),
        VOLTAR: Boolean(acoes.VOLTAR),
        ALTERNAR_PAUSA: Boolean(acoes.ALTERNAR_PAUSA),
        ALTERNAR_MODO: Boolean(acoes.ALTERNAR_MODO),
        EMERGENCIA: Boolean(acoes.EMERGENCIA),
        REINICIAR: Boolean(acoes.REINICIAR),
      },
    },
    (comando) => {
      if (comando === "DESLIGAR") aoDesligar();
      else if (comando !== "LIGAR") acoes[comando]?.();
    },
  );

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-tema-fundo text-tema-texto font-tema">
      <div ref={area} className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div
          className="relative shrink-0 overflow-hidden bg-tema-fundo"
          style={{ width: LARGURA_PALCO, height: ALTURA_PALCO, transform: `scale(${escala})` }}
        >
          {children}
          {ensaio && <SeloEnsaio />}
          {avisoPausa && (
            <div className="absolute inset-x-0 bottom-16 mx-auto w-fit rounded-3xl bg-tema-superficie px-10 py-6 text-[40px] font-semibold shadow-xl">
              {TEXTOS_PALCO.pausada}
            </div>
          )}
        </div>
      </div>
      {ajudaVisivel && (
        <div role="note" aria-label="Atalhos do telão" className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-tema-borda bg-tema-fundo/95 p-4 shadow-2xl">
          <ListaAtalhos />
        </div>
      )}
    </div>
  );
}
