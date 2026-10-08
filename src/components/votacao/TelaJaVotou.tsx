"use client";

import { ArrowLeft, CircleCheck } from "lucide-react";
import type { AvisoVotacao as TipoAviso } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { Selo } from "@/components/ui/Selo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";
import { AvisoVotacao } from "./AvisoVotacao";

/** Público que já votou (Etapa 5, seção 5.7). Nunca mostra em quem a pessoa votou. */
export function TelaJaVotou({ aviso }: { aviso: TipoAviso | null }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const texto = textoDoEstado("JA_VOTOU", ativo.tema);

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-10 sm:px-6">
      <AvisoVotacao aviso={aviso === "JA_VOTOU_ANTES" ? aviso : null} />
      <Cartao role="status" className="flex flex-col items-start gap-3">
        <Selo variante="sucesso" icone={CircleCheck}>
          Voto registrado
        </Selo>
        <h1 tabIndex={-1} className="text-2xl font-bold">
          {texto.titulo}
        </h1>
        <p className="text-tema-texto-suave">{texto.corpo}</p>
      </Cartao>
      <Botao href={`/e/${ativo.slug}`} variante="contorno" className="self-start" icone={<ArrowLeft aria-hidden className="size-4" />}>
        Voltar ao evento
      </Botao>
    </section>
  );
}
