"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Hand,
  Minus,
  MousePointerClick,
  Pause,
  Play,
  Power,
  PowerOff,
  RotateCcw,
  Siren,
  Timer,
  TriangleAlert,
  Tv,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { TemaEvento } from "@/components/evento/TemaEvento";
import { classesBotao, type VarianteBotao } from "@/components/ui/Botao";
import { Selo, type VarianteSelo } from "@/components/ui/Selo";
import { cx } from "@/lib/classes";
import { enviarComandoTelao, useEstadoTelao, type ComandoTelao, type EstadoTelao } from "@/store/canalTelao";
import { useUi } from "@/store/seletores/dev";
import { useSessao } from "@/store/seletores/sessao";

// Controle remoto do telão (08/10/2026): flutua em todas as telas do admin enquanto o telão estiver aberto (como a
// toolbar), para comandar a apresentação de qualquer página. Some na própria aba do telão.
// Só clique: nada de atalhos e os botões nem recebem foco. Com o controle em várias abas, uma tecla digitada noutra
// tela (Espaço, Enter) nunca pode avançar a cerimônia. Emergência, Reiniciar e Desligar pedem um segundo clique.
// Visual (08/10/2026): o mesmo das outras telas do admin (cartão, Selo para a situação, botões do Botao), nas cores do
// evento ativo. Fica fora do TemaEvento do layout (flutua sobre tudo), por isso aplica o próprio; o cabeçalho vai na
// cor primária do evento.

const CONFIRMAR_MS = 4000;
type Confirmavel = Extract<ComandoTelao, "EMERGENCIA" | "REINICIAR" | "DESLIGAR">;

function rotuloAndamento(telao: EstadoTelao): string {
  if (telao.situacao === "AGUARDANDO_CLIQUE") return "Aguardando o clique no telão";
  if (telao.situacao === "DESLIGADO") return "Desligado";
  return { APRESENTANDO: "Apresentando", PAUSADO: "Pausado", PARADO: "Ligado" }[telao.andamento];
}

function varianteSituacao(telao: EstadoTelao): VarianteSelo {
  if (telao.situacao === "DESLIGADO") return "neutro";
  if (telao.situacao === "AGUARDANDO_CLIQUE" || telao.andamento === "PAUSADO") return "aviso";
  return telao.andamento === "APRESENTANDO" ? "sucesso" : "info";
}

function iconeSituacao(telao: EstadoTelao): LucideIcon {
  if (telao.situacao === "DESLIGADO") return PowerOff;
  if (telao.situacao === "AGUARDANDO_CLIQUE") return MousePointerClick;
  return { APRESENTANDO: CircleDot, PAUSADO: Pause, PARADO: Tv }[telao.andamento];
}

const COR_INDICADOR: Record<VarianteSelo, string> = {
  neutro: "bg-tema-texto-suave",
  primaria: "bg-tema-primaria",
  info: "bg-tema-info",
  sucesso: "bg-tema-sucesso",
  aviso: "bg-tema-aviso",
  erro: "bg-tema-erro",
};

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
  const variante = varianteSituacao(telao);
  const pausado = ligado?.andamento === "PAUSADO";
  const manual = ligado?.modoAvanco === "MANUAL";

  if (recolhido)
    return (
      <TemaEvento data-print="ocultar" className="fixed bottom-3 left-3 z-50 rounded-full shadow-lg">
        <button
          type="button"
          onClick={() => setRecolhido(false)}
          aria-expanded={false}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tema-primaria px-4 text-sm font-semibold text-tema-sobre-primaria hover:opacity-90"
        >
          <Tv aria-hidden className="size-4" />
          Telão
          <span aria-hidden className={cx("size-2 rounded-full ring-2 ring-tema-sobre-primaria", COR_INDICADOR[variante])} />
          <span className="font-normal">{andamento}</span>
        </button>
      </TemaEvento>
    );

  return (
    <TemaEvento
      data-print="ocultar"
      className="fixed bottom-3 left-3 z-50 w-72 overflow-hidden rounded-2xl border border-tema-borda shadow-xl"
    >
      <aside aria-label="Controle remoto do telão" className="flex flex-col">
        <header className="flex items-center justify-between gap-2 bg-tema-primaria py-2 pl-4 pr-2 text-tema-sobre-primaria">
          <span className="flex items-center gap-2 font-bold">
            <Tv aria-hidden className="size-5" /> Telão
            {telao.ensaio && <span className="rounded-full border border-current px-2 py-0.5 text-xs font-semibold">Ensaio</span>}
          </span>
          <button
            type="button"
            onClick={() => setRecolhido(true)}
            aria-label="Recolher controle remoto"
            className="inline-flex size-9 items-center justify-center rounded-full hover:bg-tema-sobre-primaria/15"
          >
            <Minus aria-hidden className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4">
          {/* Situação */}
          <div role="status" className="flex flex-col gap-1.5 rounded-xl border border-tema-borda bg-tema-superficie p-3">
            <Selo variante={variante} icone={iconeSituacao(telao)} pulsar={ligado?.andamento === "APRESENTANDO"} className="self-start">
              {andamento}
            </Selo>
            {ligado && (
              <p className="text-sm">
                {ligado.progresso && (
                  <span className="font-bold tabular-nums">
                    Cena {ligado.progresso.cena} de {ligado.progresso.total}
                    {ligado.nomeCena && " · "}
                  </span>
                )}
                <span className={ligado.progresso ? "text-tema-texto-suave" : "font-semibold"}>{ligado.nomeCena}</span>
              </p>
            )}
            {ligado?.proximoAvancoEm && <ContagemAvanco em={ligado.proximoAvancoEm} />}
          </div>

          {ligado && !ligado.telaCheia && <Aviso>Fora da tela cheia: clique no telão e aperte F.</Aviso>}
          {ligado?.mensagem && <Aviso>{ligado.mensagem}</Aviso>}
          {telao.situacao === "AGUARDANDO_CLIQUE" && <Aviso>Clique em “Entrar em tela cheia” no telão (ou ligue sem tela cheia).</Aviso>}

          {/* Navegação */}
          <div className="grid grid-cols-2 gap-2">
            <BotaoRemoto
              rotulo="Voltar"
              variante="contorno"
              aoClicar={() => enviar("VOLTAR")}
              disabled={!pode("VOLTAR")}
              icone={<ChevronLeft aria-hidden className="size-5" />}
            />
            <BotaoRemoto
              rotulo="Avançar"
              aoClicar={() => enviar("AVANCAR")}
              disabled={!pode("AVANCAR")}
              icone={<ChevronRight aria-hidden className="size-5" />}
              iconeDepois
            />
            <BotaoRemoto
              rotulo={pausado ? "Retomar" : "Pausar"}
              variante="contorno"
              aoClicar={() => enviar("ALTERNAR_PAUSA")}
              disabled={!pode("ALTERNAR_PAUSA")}
              icone={pausado ? <Play aria-hidden className="size-4" /> : <Pause aria-hidden className="size-4" />}
            />
            <BotaoRemoto
              rotulo={manual ? "Manual" : "Automático"}
              dica={`Avanço ${manual ? "manual" : "automático"}. Clique para alternar.`}
              variante="contorno"
              aoClicar={() => enviar("ALTERNAR_MODO")}
              disabled={!pode("ALTERNAR_MODO")}
              icone={manual ? <Hand aria-hidden className="size-4" /> : <Zap aria-hidden className="size-4" />}
            />
          </div>

          {/* Ações com confirmação */}
          <div className="grid grid-cols-2 gap-2 border-t border-tema-borda pt-3">
            <BotaoRemoto
              rotulo={armado === "REINICIAR" ? "Confirmar" : "Reiniciar"}
              variante="contorno"
              aoClicar={confirmando("REINICIAR")}
              disabled={!pode("REINICIAR")}
              className={cx(armado === "REINICIAR" && "border-tema-aviso! text-tema-aviso! motion-safe:animate-pulse")}
              icone={<RotateCcw aria-hidden className="size-4" />}
            />
            <BotaoRemoto
              rotulo={armado === "EMERGENCIA" ? "Confirmar" : "Emergência"}
              variante="perigo"
              aoClicar={confirmando("EMERGENCIA")}
              disabled={!pode("EMERGENCIA")}
              className={cx(armado === "EMERGENCIA" && "ring-2 ring-tema-erro ring-offset-2 ring-offset-tema-fundo motion-safe:animate-pulse")}
              icone={<Siren aria-hidden className="size-4" />}
            />
            <BotaoRemoto
              rotulo={ligado ? (armado === "DESLIGAR" ? "Confirmar desligar" : "Desligar telão") : "Ligar telão"}
              variante={ligado ? "fantasma" : "primaria"}
              aoClicar={ligado ? confirmando("DESLIGAR") : () => enviar("LIGAR")}
              className={cx("col-span-2", ligado && "text-tema-erro!", armado === "DESLIGAR" && "bg-tema-superficie motion-safe:animate-pulse")}
              icone={<Power aria-hidden className="size-4" />}
            />
          </div>

          {armado && (
            <p role="alert" className="text-center text-xs font-semibold text-tema-texto-suave">
              {armado === "EMERGENCIA"
                ? "Clique de novo para ir direto ao resultado final."
                : armado === "REINICIAR"
                  ? "Clique de novo para voltar à tela de votação encerrada."
                  : "Clique de novo para desligar o telão."}
            </p>
          )}
        </div>
      </aside>
    </TemaEvento>
  );
}

/** Segundos até a tela avançar sozinha (relógio real, o mesmo do setTimeout do palco). Fora do anúncio do visor. */
function ContagemAvanco({ em }: { em: number }) {
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    const tique = () => setAgora(Date.now());
    const primeiro = setTimeout(tique, 0);
    const t = setInterval(tique, 250);
    return () => {
      clearTimeout(primeiro);
      clearInterval(t);
    };
  }, []);
  if (agora === null) return null;
  const segundos = Math.max(0, Math.ceil((em - agora) / 1000));
  return (
    <p aria-live="off" className="flex items-center gap-1.5 text-sm text-tema-texto-suave">
      <Timer aria-hidden className="size-4" />
      Próxima tela em <span className="font-bold tabular-nums text-tema-texto">{segundos} s</span>
    </p>
  );
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-xl border border-l-4 border-tema-borda border-l-tema-aviso bg-tema-superficie px-3 py-2 text-xs">
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0 text-tema-aviso" />
      <span>{children}</span>
    </p>
  );
}

/** Botão só de clique, no visual do Botao: ignora a ativação por teclado (detail 0) e não fica com o foco. */
function BotaoRemoto({
  rotulo,
  dica,
  aoClicar,
  disabled,
  variante = "primaria",
  icone,
  iconeDepois,
  className,
}: {
  rotulo: string;
  /** Dica ao passar o mouse; sem ela, o próprio rótulo. */
  dica?: string;
  aoClicar: () => void;
  disabled?: boolean;
  variante?: VarianteBotao;
  icone: ReactNode;
  iconeDepois?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title={dica ?? rotulo}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        if (e.detail === 0) return;
        aoClicar();
      }}
      className={classesBotao({
        variante,
        tamanho: "pequeno",
        className: cx("gap-1.5 px-3 active:scale-95 disabled:active:scale-100", className),
      })}
    >
      {!iconeDepois && icone}
      <span>{rotulo}</span>
      {iconeDepois && icone}
    </button>
  );
}
