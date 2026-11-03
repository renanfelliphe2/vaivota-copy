"use client";

import { useId, useState } from "react";
import { validarPinTotem } from "@/dominio/validacoesConfig";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";

/** Novo PIN de saída do quiosque de um totem. Remonte com `key` para limpar o campo. O PIN nunca é mostrado nem guardado em claro. */
export function AlterarPinDialog({
  nome,
  aberto,
  carregando,
  erro,
  aoFechar,
  aoConfirmar,
}: {
  nome: string | null;
  aberto: boolean;
  carregando: boolean;
  /** Erro do servidor para o campo. */
  erro: string | null;
  aoFechar: () => void;
  aoConfirmar: (pin: string) => void;
}) {
  const id = useId();
  const [pin, setPin] = useState("");
  const [tentou, setTentou] = useState(false);
  const erroLocal = validarPinTotem(pin);

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`PIN de saída: ${nome ?? "totem"}`}
      fecharNoFundo={!carregando}
      rodape={
        <>
          <Botao variante="contorno" onClick={aoFechar} disabled={carregando}>
            Cancelar
          </Botao>
          <Botao
            carregando={carregando}
            onClick={() => {
              setTentou(true);
              if (!erroLocal) aoConfirmar(pin);
            }}
          >
            Salvar PIN
          </Botao>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTentou(true);
          if (!erroLocal) aoConfirmar(pin);
        }}
      >
        <p className="text-sm">O PIN novo vale na hora. Quem tiver o PIN sai do modo totem; guarde-o só com a organização.</p>
        <Campo id={id} rotulo="Novo PIN" erro={erro ?? (tentou ? erroLocal : null)} dica="De 4 a 8 números.">
          <Input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </Campo>
      </form>
    </Dialogo>
  );
}
