"use client";

import { Delete, Keyboard } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { cx } from "@/lib/classes";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { conferirPinTotem } from "@/servicos/totem";

// Totem (§6): o menu do totem (Analisar votos, Encerrar sessão, Sair; logTotem.md) só abre com o PIN do totem, conferido no
// servidor (cinco erros bloqueiam por 60 s). O PIN conferido segue para o menu, que o usa nas chamadas dele.
// Sem aparelho pareado não há PIN: confirma direto.
// 26/11/2026: o totem pode não ter teclado físico. "Teclado na tela" abre um teclado numérico só para o PIN; ele se fecha sozinho
// quando o PIN confere (o diálogo fecha) ou quando o diálogo é fechado.

/** Tamanho máximo do PIN (o mesmo do cadastro na página Totens). */
const MAXIMO_PIN = 8;

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function DialogoPinTotem({
  aberto,
  pareado,
  aoFechar,
  aoConfirmar,
}: {
  aberto: boolean;
  pareado: boolean;
  aoFechar: () => void;
  aoConfirmar: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [teclado, setTeclado] = useState(false);

  function limpar() {
    setPin("");
    setErro(null);
    setTeclado(false);
  }

  function fechar() {
    limpar();
    aoFechar();
  }

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    if (conferindo) return;
    if (!pareado) return aoConfirmar("");
    if (pin.length === 0) return;
    setConferindo(true);
    const r = await conferirPinTotem({ pin });
    setConferindo(false);
    if (!r.ok) {
      setPin("");
      return setErro(r.erro.mensagem);
    }
    const conferido = pin;
    limpar();
    aoConfirmar(conferido);
  }

  const digitar = (tecla: string) => {
    setErro(null);
    setPin((atual) => (atual.length >= MAXIMO_PIN ? atual : atual + tecla));
  };

  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo={TEXTOS_TOTEM.pinTitulo} descricao={TEXTOS_TOTEM.pinDescricao} className="sm:max-w-md!">
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        <Campo id="totem-pin" rotulo={TEXTOS_TOTEM.pinCampo} erro={erro}>
          <Input
            type="password"
            // Com o teclado na tela, o do sistema não sobe por cima dele.
            inputMode={teclado ? "none" : "numeric"}
            autoComplete="off"
            maxLength={MAXIMO_PIN}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, MAXIMO_PIN))}
            className="min-h-14 text-center text-2xl tracking-[0.5em]"
          />
        </Campo>

        {teclado ? (
          <div role="group" aria-label="Teclado numérico" className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              {TECLAS.map((t) => (
                <TeclaPin key={t} onClick={() => digitar(t)}>
                  {t}
                </TeclaPin>
              ))}
              <TeclaPin onClick={() => setPin("")} pequena>
                {TEXTOS_TOTEM.pinLimpar}
              </TeclaPin>
              <TeclaPin onClick={() => digitar("0")}>0</TeclaPin>
              <TeclaPin onClick={() => setPin((atual) => atual.slice(0, -1))} rotulo={TEXTOS_TOTEM.pinApagar}>
                <Delete aria-hidden className="size-6" />
              </TeclaPin>
            </div>
            <Botao type="button" variante="fantasma" tamanho="pequeno" onClick={() => setTeclado(false)} className="self-center">
              {TEXTOS_TOTEM.pinTecladoFechar}
            </Botao>
          </div>
        ) : (
          <Botao
            type="button"
            variante="contorno"
            larguraTotal
            onClick={() => setTeclado(true)}
            icone={<Keyboard aria-hidden className="size-5" />}
          >
            {TEXTOS_TOTEM.pinTecladoAbrir}
          </Botao>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-tema-borda pt-4 sm:flex-row sm:justify-end">
          <Botao type="button" variante="contorno" onClick={fechar}>
            {TEXTOS_TOTEM.pinCancelar}
          </Botao>
          <Botao type="submit" carregando={conferindo} disabled={pin.length === 0}>
            {TEXTOS_TOTEM.pinConfirmar}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}

/** Tecla do teclado na tela: alvo grande para o dedo. */
function TeclaPin({ children, onClick, rotulo, pequena = false }: { children: ReactNode; onClick: () => void; rotulo?: string; pequena?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      title={rotulo}
      className={cx(
        "inline-flex min-h-14 items-center justify-center rounded-xl border border-tema-borda bg-tema-superficie font-semibold tabular-nums text-tema-texto transition active:scale-95 active:bg-tema-borda/60",
        pequena ? "text-sm" : "text-2xl",
      )}
    >
      {children}
    </button>
  );
}
