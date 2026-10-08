"use client";

import { ArrowLeft, CircleCheck, Gavel } from "lucide-react";
import type { PapelVoto } from "@/dominio/estadoVotar";
import type { ChaveTextoEstado, ResultadoEnvioVoto } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

export type TelaSucessoProps = {
  papelVoto: PapelVoto;
  resultado: ResultadoEnvioVoto;
  /** Só para o jurado (o público nunca vê o nome do candidato; rev. 3 E8). */
  tituloEscolhido: string | null;
  aoAlterar: () => void;
};

/** Sucesso (Etapa 5, seção 5.7). Animação discreta só em CSS, desligada por prefers-reduced-motion. */
export function TelaSucesso({ papelVoto, resultado, tituloEscolhido, aoAlterar }: TelaSucessoProps) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const jurado = papelVoto === "JURADO";
  const chave: ChaveTextoEstado = !jurado ? "SUCESSO" : resultado === "ATUALIZADO" ? "VOTO_ATUALIZADO" : "JURADO_JA_VOTOU";
  const texto = textoDoEstado(chave, ativo.tema);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-5 px-4 py-12 sm:px-6">
      <div className="motion-safe:animate-[pulse_1.2s_ease-out_1]">
        <Selo variante="sucesso" icone={CircleCheck}>
          {jurado && resultado === "ATUALIZADO" ? "Voto atualizado" : "Voto registrado"}
        </Selo>
      </div>
      <div role="status" className="flex flex-col gap-2">
        <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight">
          {texto.titulo}
        </h1>
        <p className="text-lg text-tema-texto-suave">{texto.corpo}</p>
      </div>
      {jurado && tituloEscolhido && (
        <p className="rounded-xl border border-tema-borda bg-tema-superficie px-4 py-3">
          <span className="text-tema-texto-suave">Sua escolha: </span>
          <strong>{tituloEscolhido}</strong>
        </p>
      )}
      {jurado && <p className="text-sm text-tema-texto-suave">O resultado será divulgado pela organização.</p>}
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Botao href={`/e/${ativo.slug}`} variante={jurado ? "contorno" : "primaria"} icone={<ArrowLeft aria-hidden className="size-4" />}>
          Voltar ao evento
        </Botao>
        {jurado && (
          <Botao onClick={aoAlterar} icone={<Gavel aria-hidden className="size-4" />}>
            Alterar meu voto
          </Botao>
        )}
      </div>
    </section>
  );
}
