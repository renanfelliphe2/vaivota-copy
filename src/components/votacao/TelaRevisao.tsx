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
import { mensagemDe } from "@/servicos/mensagens";
import type { ItemLista } from "@/store/seletores/candidatos";

export type TelaRevisaoProps = {
  item: ItemLista;
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

/** Revisão (Etapa 5, seção 5.5). O aviso de voto identificado aparece só aqui, só para o jurado. */
export function TelaRevisao(props: TelaRevisaoProps) {
  const { item, papelVoto, primeiroVotoJurado, ehVotoAtual, envio, falhaEnvio } = props;
  const [ciente, setCiente] = useState(false);
  const jurado = papelVoto === "JURADO";
  const ocupado = envio !== "OCIOSO";
  const naoConfirmado = falhaEnvio === "NAO_CONFIRMADO";
  const exigeCiencia = jurado && primeiroVotoJurado;
  const podeConfirmar = !ocupado && !naoConfirmado && !ehVotoAtual && (!exigeCiencia || ciente);
  const { candidato } = item;

  return (
    <section aria-busy={ocupado || undefined} aria-labelledby="titulo-revisao" className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
      <h1 id="titulo-revisao" tabIndex={-1} className="text-3xl font-bold tracking-tight">
        Revise seu voto
      </h1>

      <div className="overflow-hidden rounded-2xl border border-tema-borda bg-tema-superficie">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="16/9" sizes="(min-width: 672px) 672px, 100vw" />
        <div className="flex flex-col gap-1 p-5">
          <p className="text-sm text-tema-texto-suave">Você está votando em</p>
          <p className="text-2xl font-bold leading-tight">{candidato.titulo}</p>
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
    </section>
  );
}
