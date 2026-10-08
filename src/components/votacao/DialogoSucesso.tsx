"use client";

import { CircleCheck, Gavel } from "lucide-react";
import type { PapelVoto } from "@/dominio/estadoVotar";
import type { ChaveTextoEstado, ResultadoEnvioVoto } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { Selo } from "@/components/ui/Selo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

export type DialogoSucessoProps = {
  /** null = fechado. */
  resultado: ResultadoEnvioVoto | null;
  papelVoto: PapelVoto;
  /** Só para o jurado (o público nunca vê o nome do candidato; rev. 3 E8). */
  tituloEscolhido: string | null;
  aoFechar: () => void;
  aoAlterar: () => void;
  /** Foco ao fechar: quem abriu ("Confirmar voto") já saiu da tela. */
  focoAoFechar?: () => HTMLElement | null;
};

/** Sucesso (Etapa 5, seção 5.7; 08/10/2026: modal na entrada do evento). Animação discreta só em CSS. */
export function DialogoSucesso({ resultado, papelVoto, tituloEscolhido, aoFechar, aoAlterar, focoAoFechar }: DialogoSucessoProps) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const jurado = papelVoto === "JURADO";
  const chave: ChaveTextoEstado = !jurado ? "SUCESSO" : resultado === "ATUALIZADO" ? "VOTO_ATUALIZADO" : "JURADO_JA_VOTOU";
  const texto = textoDoEstado(chave, ativo.tema);

  return (
    <Dialogo
      aberto={resultado !== null}
      aoFechar={aoFechar}
      focoAoFechar={focoAoFechar}
      titulo={texto.titulo}
      rodape={
        <>
          <Botao variante={jurado ? "contorno" : "primaria"} onClick={aoFechar}>
            Fechar
          </Botao>
          {jurado && (
            <Botao onClick={aoAlterar} icone={<Gavel aria-hidden className="size-4" />}>
              Alterar meu voto
            </Botao>
          )}
        </>
      }
    >
      <div role="status" className="flex flex-col items-start gap-4">
        <div className="motion-safe:animate-[pulse_1.2s_ease-out_1]">
          <Selo variante="sucesso" icone={CircleCheck}>
            {jurado && resultado === "ATUALIZADO" ? "Voto atualizado" : "Voto registrado"}
          </Selo>
        </div>
        <p className="text-lg text-tema-texto-suave">{texto.corpo}</p>
        {jurado && tituloEscolhido && (
          <p className="w-full rounded-xl border border-tema-borda bg-tema-superficie px-4 py-3">
            <span className="text-tema-texto-suave">Sua escolha: </span>
            <strong>{tituloEscolhido}</strong>
          </p>
        )}
        {jurado && <p className="text-sm text-tema-texto-suave">O resultado será divulgado pela organização.</p>}
      </div>
    </Dialogo>
  );
}
