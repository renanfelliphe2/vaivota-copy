"use client";

import { ArrowLeft, Check, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { PapelVoto } from "@/dominio/estadoVotar";
import type { EstadoUiVotacao } from "@/dominio/tipos";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Checkbox } from "@/components/ui/Campo";
import { Carregando } from "@/components/ui/Carregando";
import { Dialogo } from "@/components/ui/Dialogo";
import { mensagemDe } from "@/servicos/mensagens";
import type { ItemLista } from "@/store/seletores/candidatos";

export type DialogoRevisaoProps = {
  /** null = fechado. */
  item: ItemLista | null;
  papelVoto: PapelVoto;
  /** Jurado sem voto ainda: caixa de ciência obrigatória (D11, rev. 3 E10). */
  primeiroVotoJurado: boolean;
  /** A escolha é o voto atual do jurado. */
  ehVotoAtual: boolean;
  envio: EstadoUiVotacao["envio"];
  falhaEnvio: EstadoUiVotacao["falhaEnvio"];
  aoConfirmar: () => void;
  aoTrocar: () => void;
  aoVerificar: () => void;
};

/**
 * Revisão (Etapa 5, seção 5.5; 08/10/2026: modal na entrada do evento). O aviso de voto identificado aparece só
 * aqui, só para o jurado. Fechar é "Trocar escolha", bloqueado durante o envio.
 */
export function DialogoRevisao(props: DialogoRevisaoProps) {
  const { item, envio, falhaEnvio } = props;
  const travado = envio !== "OCIOSO" || falhaEnvio === "NAO_CONFIRMADO";

  return (
    <Dialogo
      aberto={item !== null}
      aoFechar={() => {
        if (!travado) props.aoTrocar();
      }}
      fecharNoFundo={false}
      titulo="Revise seu voto"
      className="sm:max-w-xl!"
    >
      {/* key: a caixa de ciência recomeça desmarcada a cada candidato. */}
      {item && <ConteudoRevisao key={item.candidato.id} {...props} item={item} />}
    </Dialogo>
  );
}

function ConteudoRevisao(props: DialogoRevisaoProps & { item: ItemLista }) {
  const { item, papelVoto, primeiroVotoJurado, ehVotoAtual, envio, falhaEnvio } = props;
  const [ciente, setCiente] = useState(false);
  const jurado = papelVoto === "JURADO";
  const ocupado = envio !== "OCIOSO";
  const naoConfirmado = falhaEnvio === "NAO_CONFIRMADO";
  const exigeCiencia = jurado && primeiroVotoJurado;
  const podeConfirmar = !ocupado && !naoConfirmado && !ehVotoAtual && (!exigeCiencia || ciente);
  const { candidato } = item;

  return (
    <div aria-busy={ocupado || undefined} className="flex flex-col gap-5">
      {/* 19/10/2026: miniatura quadrada inteira ao lado do nome (o 16:9 cortava os logos 1:1). */}
      <div className="flex items-center gap-4 rounded-2xl border border-tema-borda bg-tema-superficie p-3">
        <ImagemCandidato
          titulo={candidato.titulo}
          imagemUrl={candidato.imagemUrl}
          proporcao="1/1"
          className="w-24 shrink-0 rounded-xl sm:w-28"
          sizes="7rem"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-sm text-tema-texto-suave">Você está votando em</p>
          <p className="font-display text-xl font-extrabold leading-tight wrap-anywhere">{candidato.titulo}</p>
        </div>
      </div>

      {jurado ? (
        <Alerta variante="informacao">
          Seu voto é identificado para a organização e pode ser alterado até o encerramento da votação.
        </Alerta>
      ) : (
        <>
          <Alerta variante="informacao">Seu voto é secreto: ele não fica ligado ao seu nome.</Alerta>
          <p className="text-sm font-medium">Depois de confirmar, não será possível alterar nem desfazer o voto.</p>
        </>
      )}

      {exigeCiencia && (
        <Checkbox
          id="ciencia-voto-identificado"
          rotulo="Sei que meu voto é identificado para a organização"
          checked={ciente}
          disabled={ocupado}
          onChange={(e) => setCiente(e.target.checked)}
        />
      )}

      {ehVotoAtual && <p className="text-sm font-medium">Esse já é o seu voto. Escolha outra opção para alterar.</p>}

      {falhaEnvio === "REDE" && <Alerta variante="erro">Seu voto ainda não foi registrado.</Alerta>}
      {falhaEnvio === "ERRO_INTERNO" && <Alerta variante="erro">{mensagemDe("ERRO_INTERNO")}</Alerta>}
      {naoConfirmado && (
        <Alerta variante="erro">Não foi possível confirmar se seu voto foi registrado. Verifique antes de tentar de novo.</Alerta>
      )}
      {envio === "VERIFICANDO" && <Carregando texto="Verificando seu voto…" />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Botao variante="contorno" onClick={props.aoTrocar} disabled={ocupado || naoConfirmado} icone={<ArrowLeft aria-hidden className="size-4" />}>
          Trocar escolha
        </Botao>
        {naoConfirmado ? (
          <Botao onClick={props.aoVerificar} icone={<RefreshCw aria-hidden className="size-4" />}>
            Verificar novamente
          </Botao>
        ) : (
          <Botao
            onClick={props.aoConfirmar}
            disabled={!podeConfirmar && envio !== "ENVIANDO"}
            carregando={envio === "ENVIANDO"}
            icone={<Check aria-hidden className="size-4" />}
          >
            {envio === "ENVIANDO"
              ? "Enviando seu voto…"
              : falhaEnvio === "REDE" || falhaEnvio === "ERRO_INTERNO"
                ? "Tentar novamente"
                : "Confirmar voto"}
          </Botao>
        )}
      </div>
    </div>
  );
}
