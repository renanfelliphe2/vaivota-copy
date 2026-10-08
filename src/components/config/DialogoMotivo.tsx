"use client";

import { useId, useState, type ReactNode } from "react";
import { validarMotivo } from "@/dominio/validacoesConfig";
import { Botao } from "@/components/ui/Botao";
import { Campo, Textarea } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";

export type DialogoMotivoProps = {
  aberto: boolean;
  titulo: ReactNode;
  /** Consequência em texto claro. */
  consequencia: ReactNode;
  /** "Excepcional": motivo obrigatório (≥ 10 caracteres). */
  obrigatorio?: boolean;
  rotuloConfirmar: string;
  perigo?: boolean;
  carregando?: boolean;
  /** Conteúdo extra (ex.: "Gerar um convite substituto"). */
  children?: ReactNode;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => void;
};

/** Etapa 6: ações Auditado, Estender e Excepcional (seção 5.1). Remonte com `key` para limpar o motivo. */
export function DialogoMotivo(props: DialogoMotivoProps) {
  const { aberto, titulo, consequencia, obrigatorio = false, rotuloConfirmar, perigo, carregando, children } = props;
  const [motivo, setMotivo] = useState("");
  const [tentou, setTentou] = useState(false);
  const id = useId();
  const erro = validarMotivo(motivo, obrigatorio);

  const confirmar = () => {
    setTentou(true);
    if (erro) return;
    props.aoConfirmar(motivo.trim());
  };

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={props.aoFechar}
      titulo={titulo}
      fecharNoFundo={!carregando}
      rodape={
        <>
          <Botao variante="contorno" onClick={props.aoFechar} disabled={carregando}>
            Cancelar
          </Botao>
          <Botao variante={perigo ? "perigo" : "primaria"} onClick={confirmar} carregando={carregando}>
            {rotuloConfirmar}
          </Botao>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-sm">{consequencia}</div>
        {children}
        <Campo
          id={id}
          rotulo={obrigatorio ? "Motivo" : "Motivo (opcional)"}
          obrigatorio={obrigatorio}
          erro={tentou ? erro : null}
          dica={obrigatorio ? "Mínimo de 10 caracteres. Fica registrado na auditoria." : "Fica registrado na auditoria."}
        >
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
        </Campo>
      </div>
    </Dialogo>
  );
}
