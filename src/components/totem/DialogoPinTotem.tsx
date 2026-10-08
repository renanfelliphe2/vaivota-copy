"use client";

import { useState, type FormEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { conferirPinTotem } from "@/servicos/totem";

// Totem (§6): sair do modo quiosque só com o PIN do totem. Sem aparelho pareado, sai direto.

export function DialogoPinTotem({
  aberto,
  dispositivoId,
  aoFechar,
  aoSair,
}: {
  aberto: boolean;
  dispositivoId: string | null;
  aoFechar: () => void;
  aoSair: () => void;
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
    if (!dispositivoId) return aoSair();
    setConferindo(true);
    const r = await conferirPinTotem({ dispositivoId, pin });
    setConferindo(false);
    if (!r.ok) {
      setPin("");
      return setErro(r.erro.mensagem);
    }
    setPin("");
    setErro(null);
    aoSair();
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
