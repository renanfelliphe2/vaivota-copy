"use client";

import type { Pesos } from "@/dominio/placar";
import type { Grupo } from "@/dominio/tipos";
import { Input } from "@/components/ui/Campo";
import { DicaTrava } from "../DicaTrava";

const ROTULOS: Record<Grupo, string> = { POPULAR: "Popular", JURI: "Júri", INFANTIL: "Infantil" };

/** Slider sincronizado com campo numérico por grupo; módulo desligado em 0, desabilitado e com o motivo. */
export function EditorPesos({
  pesos,
  ligados,
  disabled,
  motivoDesligado,
  aoMudar,
}: {
  pesos: Pesos;
  ligados: Record<Grupo, boolean>;
  disabled: boolean;
  motivoDesligado: Partial<Record<Grupo, string>>;
  aoMudar: (grupo: Grupo, valor: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(ROTULOS) as Grupo[]).map((g) => {
        const ligado = ligados[g];
        const bloqueado = disabled || !ligado;
        const id = `peso-${g}`;
        const valor = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
        return (
          <div key={g} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-semibold">
              {ROTULOS[g]}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={pesos[g]}
                disabled={bloqueado}
                aria-label={`Peso ${ROTULOS[g]} (controle deslizante)`}
                onChange={(e) => aoMudar(g, valor(e.target.value))}
                className="h-11 flex-1 accent-tema-primaria disabled:opacity-50"
              />
              <Input
                id={id}
                type="number"
                min={0}
                max={100}
                step={1}
                inputMode="numeric"
                value={pesos[g]}
                disabled={bloqueado}
                onChange={(e) => aoMudar(g, valor(e.target.value))}
                className="w-20 text-right"
                aria-describedby={!ligado ? `${id}-motivo` : undefined}
              />
              <span aria-hidden className="text-sm text-tema-texto-suave">%</span>
            </div>
            {!ligado && <DicaTrava id={`${id}-motivo`} motivo={motivoDesligado[g] ?? "Módulo desligado: peso 0."} />}
          </div>
        );
      })}
    </div>
  );
}
