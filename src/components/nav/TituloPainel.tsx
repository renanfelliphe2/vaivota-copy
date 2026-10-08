"use client";

import { ROTULO_ESTADO_EVENTO } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Título das telas do painel com o estado do evento em texto simples à direita (08/10/2026). */
export function TituloPainel({ titulo }: { titulo: string }) {
  const estado = useEventoAtivo()?.evento.estado;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
      {estado && <p className="text-sm text-tema-texto-suave">Evento {ROTULO_ESTADO_EVENTO[estado].toLocaleLowerCase("pt-BR")}</p>}
    </div>
  );
}
