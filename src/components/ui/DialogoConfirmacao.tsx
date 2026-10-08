"use client";

import { useId, useState, type ReactNode } from "react";
import { Botao } from "./Botao";
import { Campo, Input } from "./Campo";
import { Dialogo } from "./Dialogo";

export type DialogoConfirmacaoProps = {
  aberto: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void | Promise<void>;
  titulo: ReactNode;
  /** O que acontece se confirmar. */
  consequencia: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  /** Exige digitar este texto para liberar a confirmação (ações irreversíveis). */
  confirmarDigitando?: string;
  carregando?: boolean;
  perigo?: boolean;
};

export function DialogoConfirmacao({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  consequencia,
  rotuloConfirmar,
  rotuloCancelar = "Cancelar",
  confirmarDigitando,
  carregando,
  perigo = true,
}: DialogoConfirmacaoProps) {
  const [digitado, setDigitado] = useState("");
  const campoId = useId();
  const liberado = !confirmarDigitando || digitado.trim() === confirmarDigitando;

  const fechar = () => {
    setDigitado("");
    aoFechar();
  };

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      titulo={titulo}
      fecharNoFundo={!carregando}
      rodape={
        <>
          <Botao variante="contorno" onClick={fechar} disabled={carregando}>
            {rotuloCancelar}
          </Botao>
          <Botao
            variante={perigo ? "perigo" : "primaria"}
            onClick={() => void aoConfirmar()}
            disabled={!liberado}
            carregando={carregando}
          >
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-sm">{consequencia}</div>
        {confirmarDigitando && (
          <Campo id={campoId} rotulo={`Digite "${confirmarDigitando}" para confirmar`}>
            <Input value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
          </Campo>
        )}
      </div>
    </Dialogo>
  );
}
