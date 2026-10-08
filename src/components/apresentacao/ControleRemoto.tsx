"use client";

import { ChevronLeft, ChevronRight, Hand, Minus, Pause, Play, Power, RotateCcw, Siren, Tv, Zap } from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { cx } from "@/lib/classes";
import { enviarComandoTelao, useEstadoTelao, type ComandoTelao, type EstadoTelao } from "@/store/canalTelao";
import { useUi } from "@/store/seletores/dev";
import { useSessao } from "@/store/seletores/sessao";

// Controle remoto do telão (08/10/2026): flutua em todas as telas do admin enquanto o telão estiver aberto (como a
// toolbar), para comandar a apresentação de qualquer página. Some na própria aba do telão.
// Só clique: nada de atalhos e os botões nem recebem foco. Com o controle em várias abas, uma tecla digitada noutra
// tela (Espaço, Enter) nunca pode avançar a cerimônia. Emergência, Reiniciar e Desligar pedem um segundo clique.
// Carcaça com os tokens do tema invertidos (fundo na cor do texto): segue o tema do evento sem cor fixa.

const CONFIRMAR_MS = 4000;
type Confirmavel = Extract<ComandoTelao, "EMERGENCIA" | "REINICIAR" | "DESLIGAR">;

function rotuloAndamento(telao: EstadoTelao): string {
  if (telao.situacao === "AGUARDANDO_CLIQUE") return "Aguardando o clique no telão";
  if (telao.situacao === "DESLIGADO") return "Desligado";
  return { APRESENTANDO: "Apresentando", PAUSADO: "Pausado", PARADO: "Ligado" }[telao.andamento];
}

export function ControleRemoto() {
  const telao = useEstadoTelao();
  const sessao = useSessao();
  const ui = useUi();
  const [recolhido, setRecolhido] = useState(false);
  const [armado, setArmado] = useState<Confirmavel | null>(null);

  // O segundo clique só vale por alguns segundos.
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(null), CONFIRMAR_MS);
    return () => clearTimeout(t);
  }, [armado]);

  // Só o admin, fora da aba do telão (palco no ar) e do totem, com um telão aberto.
  if (!telao || sessao.papel !== "ADMIN" || ui.palcoAtivo || ui.totem.quiosqueAtivo) return null;

  const ligado = telao.situacao === "LIGADO" ? telao : null;
  const pode = (c: Exclude<ComandoTelao, "DESLIGAR" | "LIGAR">) => Boolean(ligado?.pode[c]);
  const enviar = (c: ComandoTelao) => {
    setArmado(null);
    enviarComandoTelao(c);
  };
  const confirmando = (c: Confirmavel) => () => (armado === c ? enviar(c) : setArmado(c));
  const andamento = rotuloAndamento(telao);

  if (recolhido)
    return (
      <div data-print="ocultar" className="fixed bottom-3 left-3 z-50">
        <button
          type="button"
          onClick={() => setRecolhido(false)}
          aria-expanded={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tema-texto px-4 text-sm font-semibold text-tema-fundo shadow-lg ring-1 ring-tema-borda"
        >
          <Tv aria-hidden className="size-4" />
          Telão · {andamento}
        </button>
      </div>
    );

  return (
    <aside
      data-print="ocultar"
      aria-label="Controle remoto do telão"
      className="fixed bottom-3 left-3 z-50 flex w-60 flex-col gap-3 rounded-[2rem] bg-tema-texto p-4 text-tema-fundo shadow-2xl ring-1 ring-tema-borda"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-80">
          <Tv aria-hidden className="size-4" /> Telão
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRecolhido(true)}
            aria-label="Recolher controle remoto"
            className="inline-flex size-8 items-center justify-center rounded-full hover:bg-tema-fundo/15"
          >
            <Minus aria-hidden className="size-4" />
          </button>
          <BotaoRemoto
            rotulo={ligado ? (armado === "DESLIGAR" ? "Confirmar desligar" : "Desligar") : "Ligar"}
            aoClicar={ligado ? confirmando("DESLIGAR") : () => enviar("LIGAR")}
            className={cx(
              "size-11 rounded-full",
              ligado ? "bg-tema-erro text-tema-fundo" : "bg-tema-sucesso text-tema-fundo",
              armado === "DESLIGAR" && "animate-pulse ring-4 ring-tema-fundo",
            )}
          >
            <Power aria-hidden className="size-5" />
          </BotaoRemoto>
        </div>
      </div>

      {/* Visor */}
      <div role="status" className="flex flex-col gap-1 rounded-2xl bg-tema-fundo/10 px-3 py-2.5 font-mono text-xs ring-1 ring-tema-fundo/20">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold">
            <span
              aria-hidden
              className={cx(
                "size-2 rounded-full",
                telao.situacao === "DESLIGADO" ? "bg-tema-erro" : ligado?.andamento === "PAUSADO" || !ligado ? "bg-tema-aviso" : "bg-tema-sucesso",
              )}
            />
            {andamento}
          </span>
          {telao.ensaio && <span className="rounded bg-tema-fundo/20 px-1.5">ENSAIO</span>}
        </div>
        <span className="text-base font-bold tabular-nums">
          {ligado?.progresso ? `Cena ${ligado.progresso.cena}/${ligado.progresso.total}` : "Cena —"}
        </span>
        {ligado && <span className="truncate opacity-80">{ligado.nomeCena}</span>}
        {ligado && !ligado.telaCheia && <span className="text-tema-aviso">Fora da tela cheia: clique no telão e aperte F.</span>}
        {ligado?.mensagem && <span className="text-tema-aviso">{ligado.mensagem}</span>}
        {telao.situacao === "AGUARDANDO_CLIQUE" && <span className="opacity-80">Clique em “Entrar em tela cheia” no telão (ou Ligar sem tela cheia).</span>}
      </div>

      {/* Navegação */}
      <div className="grid grid-cols-2 gap-2">
        <BotaoRemoto rotulo="Voltar" aoClicar={() => enviar("VOLTAR")} disabled={!pode("VOLTAR")} className="h-14 rounded-2xl bg-tema-fundo/15">
          <ChevronLeft aria-hidden className="size-6" />
        </BotaoRemoto>
        <BotaoRemoto rotulo="Avançar" aoClicar={() => enviar("AVANCAR")} disabled={!pode("AVANCAR")} className="h-14 rounded-2xl bg-tema-primaria text-tema-sobre-primaria">
          <ChevronRight aria-hidden className="size-6" />
        </BotaoRemoto>
      </div>

      <BotaoRemoto
        rotulo={ligado?.andamento === "PAUSADO" ? "Retomar" : "Pausar"}
        aoClicar={() => enviar("ALTERNAR_PAUSA")}
        disabled={!pode("ALTERNAR_PAUSA")}
        className="h-12 rounded-2xl bg-tema-fundo/15"
        comTexto
      >
        {ligado?.andamento === "PAUSADO" ? <Play aria-hidden className="size-5" /> : <Pause aria-hidden className="size-5" />}
      </BotaoRemoto>

      <BotaoRemoto
        rotulo={`Controle: ${ligado?.modoAvanco === "MANUAL" ? "manual" : "automático"}`}
        aoClicar={() => enviar("ALTERNAR_MODO")}
        disabled={!pode("ALTERNAR_MODO")}
        className="h-11 rounded-2xl bg-tema-fundo/15"
        comTexto
      >
        {ligado?.modoAvanco === "MANUAL" ? <Hand aria-hidden className="size-4" /> : <Zap aria-hidden className="size-4" />}
      </BotaoRemoto>

      <div className="grid grid-cols-2 gap-2">
        <BotaoRemoto
          rotulo={armado === "REINICIAR" ? "Confirmar" : "Reiniciar"}
          aoClicar={confirmando("REINICIAR")}
          disabled={!pode("REINICIAR")}
          className={cx("h-11 rounded-2xl bg-tema-fundo/15", armado === "REINICIAR" && "animate-pulse ring-2 ring-tema-aviso")}
          comTexto
        >
          <RotateCcw aria-hidden className="size-4" />
        </BotaoRemoto>
        <BotaoRemoto
          rotulo={armado === "EMERGENCIA" ? "Confirmar" : "Emergência"}
          aoClicar={confirmando("EMERGENCIA")}
          disabled={!pode("EMERGENCIA")}
          className={cx("h-11 rounded-2xl bg-tema-erro text-tema-fundo", armado === "EMERGENCIA" && "animate-pulse ring-2 ring-tema-fundo")}
          comTexto
        >
          <Siren aria-hidden className="size-4" />
        </BotaoRemoto>
      </div>
      {armado && (
        <p role="alert" className="text-center text-xs font-semibold">
          {armado === "EMERGENCIA" ? "Clique de novo para ir direto ao resultado final." : armado === "REINICIAR" ? "Clique de novo para voltar à tela de votação encerrada." : "Clique de novo para desligar o telão."}
        </p>
      )}
    </aside>
  );
}

/** Botão só de clique: ignora a ativação por teclado (detail 0) e não fica com o foco. */
function BotaoRemoto({
  rotulo,
  aoClicar,
  disabled,
  className,
  comTexto,
  children,
}: {
  rotulo: string;
  aoClicar: () => void;
  disabled?: boolean;
  className?: string;
  /** Mostra o rótulo ao lado do ícone; sem ele, o rótulo vai só para o leitor de tela e a dica. */
  comTexto?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title={rotulo}
      aria-label={comTexto ? undefined : rotulo}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (e.detail === 0) return;
        aoClicar();
      }}
      className={cx(
        "inline-flex items-center justify-center gap-2 text-sm font-semibold transition hover:brightness-110 active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:active:scale-100",
        className,
      )}
    >
      {children}
      {comTexto && <span>{rotulo}</span>}
    </button>
  );
}
