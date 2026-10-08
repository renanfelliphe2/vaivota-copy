"use client";

import { ChevronLeft, ChevronRight, LogOut, Pause, Play, Siren, SkipForward } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import type { ModoAvanco } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { ALTURA_PALCO, LARGURA_PALCO, useEscalaPalco, useHudVisivel } from "./hooks";
import { SeloEnsaio } from "./Pecas";

// Etapa 8 (5.7): canvas lógico 1920×1080 escalado (letterbox), camadas (cena, selo, pausa, HUD, ajuda).
// Nenhum botão no telão: o HUD aparece ao mover o mouse ou com "?" e fica fora do canvas escalado.

export type ControlesHud = {
  pausado: boolean;
  alternarPausa?: () => void;
  voltar?: () => void;
  avancar?: () => void;
  pularTrailer?: () => void;
  emergencia?: () => void;
  modoAvanco?: ModoAvanco;
  alternarModo?: () => void;
  sair: () => void;
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

function BotaoHud({ rotulo, icone, aoClicar, ativo }: { rotulo: string; icone: ReactNode; aoClicar?: () => void; ativo?: boolean }) {
  if (!aoClicar) return null;
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-pressed={ativo}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-tema-borda bg-tema-fundo px-4 text-sm font-semibold hover:bg-tema-superficie"
    >
      {icone}
      {rotulo}
    </button>
  );
}

export function Palco({
  ensaio,
  nomeCena,
  mensagemHud,
  ajudaVisivel,
  avisoPausa,
  controles,
  children,
}: {
  ensaio: boolean;
  nomeCena: string;
  mensagemHud: string | null;
  ajudaVisivel: boolean;
  avisoPausa: boolean;
  controles: ControlesHud;
  children: ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const escala = useEscalaPalco(area);
  const hud = useHudVisivel(DURACOES.hudVisivel, ajudaVisivel || avisoPausa || Boolean(mensagemHud));

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
      {hud && (
        <div role="toolbar" aria-label="Controles da apresentação" className="absolute inset-x-2 bottom-2 z-50 flex flex-col gap-2 rounded-2xl border border-tema-borda bg-tema-fundo/95 p-3 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 text-sm font-semibold">{nomeCena}</span>
            <BotaoHud rotulo="Voltar" icone={<ChevronLeft aria-hidden className="size-4" />} aoClicar={controles.voltar} />
            <BotaoHud
              rotulo={controles.pausado ? "Retomar" : "Pausar"}
              icone={controles.pausado ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
              aoClicar={controles.alternarPausa}
            />
            <BotaoHud rotulo="Avançar" icone={<ChevronRight aria-hidden className="size-4" />} aoClicar={controles.avancar} />
            <BotaoHud rotulo="Pular trailer" icone={<SkipForward aria-hidden className="size-4" />} aoClicar={controles.pularTrailer} />
            <BotaoHud rotulo="Emergência" icone={<Siren aria-hidden className="size-4" />} aoClicar={controles.emergencia} />
            {controles.modoAvanco && (
              <BotaoHud
                rotulo={controles.modoAvanco === "AUTOMATICO" ? "Avanço automático" : "Avanço manual"}
                icone={null}
                aoClicar={controles.alternarModo}
              />
            )}
            <BotaoHud rotulo="Sair" icone={<LogOut aria-hidden className="size-4" />} aoClicar={controles.sair} />
          </div>
          {mensagemHud && (
            <p role="status" className="px-2 text-sm text-tema-aviso">
              {mensagemHud}
            </p>
          )}
          {ajudaVisivel && <ListaAtalhos className="px-2" />}
        </div>
      )}
    </div>
  );
}
