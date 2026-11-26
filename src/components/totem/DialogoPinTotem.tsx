"use client";

import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { conferirPinTotem } from "@/servicos/totem";

// Totem (§6): o menu do totem (Analisar votos, Encerrar sessão, Sair; logTotem.md) só abre com o PIN do totem, conferido no
// servidor (cinco erros bloqueiam por 60 s). O PIN conferido segue para o menu, que o usa nas chamadas dele.
// Sem aparelho pareado não há PIN: confirma direto.

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

  function fechar() {
    setPin("");
    setErro(null);
    aoFechar();
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (conferindo) return;
    if (!pareado) return aoConfirmar("");
    setConferindo(true);
    const r = await conferirPinTotem({ pin });
    setConferindo(false);
    if (!r.ok) {
      setPin("");
      return setErro(r.erro.mensagem);
    }
    const conferido = pin;
    setPin("");
    setErro(null);
    aoConfirmar(conferido);
  }

  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo={TEXTOS_TOTEM.pinTitulo} descricao={TEXTOS_TOTEM.pinDescricao}>
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4">
        <Campo id="totem-pin" rotulo={TEXTOS_TOTEM.pinCampo} erro={erro}>
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="text-center text-2xl tracking-[0.5em]"
          />
        </Campo>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
