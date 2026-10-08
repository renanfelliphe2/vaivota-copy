"use client";

import { CalendarDays } from "lucide-react";
import { votaveis } from "@/dominio/candidatos";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { textoContador } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Primeira dobra (Etapa 2). D8: a faixa decorativa não tem texto em cima; o texto fica sobre o fundo. */
export function EventoHero() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, tema, candidatos } = ativo;
  const n = votaveis(candidatos).length;

  return (
    <section aria-labelledby="titulo-evento" className="w-full">
      <div aria-hidden className="h-28 w-full overflow-hidden sm:h-40">
        {tema.capaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- capa decorativa, pode ser blob: na prévia
          <img src={tema.capaUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="size-full bg-gradient-to-r from-tema-primaria to-tema-secundaria" />
        )}
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pt-8 sm:px-6">
        <h1 id="titulo-evento" className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          {tema.nomeExibicao ?? evento.nome}
        </h1>
        {evento.descricao && <p className="text-lg leading-8 text-tema-texto-suave">{evento.descricao}</p>}
        {(evento.janelaInicio || evento.janelaFim) && (
          <dl className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-6">
            {evento.janelaInicio && (
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden className="size-4 text-tema-primaria-texto" />
                <dt className="text-tema-texto-suave">Abertura</dt>
                <dd className="font-semibold">{formatarDataHora(paraMs(evento.janelaInicio), evento.fusoHorario)}</dd>
              </div>
            )}
            {evento.janelaFim && (
              <div className="flex items-center gap-2">
                <CalendarDays aria-hidden className="size-4 text-tema-primaria-texto" />
                <dt className="text-tema-texto-suave">Encerramento</dt>
                <dd className="font-semibold">{formatarDataHora(paraMs(evento.janelaFim), evento.fusoHorario)}</dd>
              </div>
            )}
          </dl>
        )}
        <p className="text-base font-semibold text-tema-primaria-texto">
          {textoContador(n, tema)}
        </p>
      </div>
    </section>
  );
}
