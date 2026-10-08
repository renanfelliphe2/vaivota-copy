"use client";

import { Gavel, Users } from "lucide-react";
import { useId } from "react";
import { cx } from "@/lib/classes";

export type PapelRegistro = "PUBLICO" | "JURADO";

const OPCOES: { valor: PapelRegistro; rotulo: string; icone: typeof Users }[] = [
  { valor: "PUBLICO", rotulo: "Público", icone: Users },
  { valor: "JURADO", rotulo: "Jurado", icone: Gavel },
];

/** role="radiogroup" com rádios nativos (setas alternam). Só aparece com moduloJuri ligado (D9). */
export function SeletorPapel({ valor, aoMudar }: { valor: PapelRegistro; aoMudar: (v: PapelRegistro) => void }) {
  const nome = useId();
  const rotuloId = useId();
  return (
    <div role="radiogroup" aria-labelledby={rotuloId} className="flex flex-col gap-1.5">
      <span id={rotuloId} className="text-sm font-semibold">
        Vou participar como
      </span>
      <div className="grid grid-cols-2 gap-1 rounded-full bg-tema-superficie p-1">
        {OPCOES.map(({ valor: opcao, rotulo, icone: Icone }) => {
          const marcado = valor === opcao;
          return (
            <label
              key={opcao}
              className={cx(
                "relative flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition",
                "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-tema-foco",
                marcado ? "bg-tema-fundo text-tema-texto shadow-sm" : "text-tema-texto-suave hover:text-tema-texto",
              )}
            >
              <input
                type="radio"
                name={nome}
                value={opcao}
                checked={marcado}
                onChange={() => aoMudar(opcao)}
                className="sr-only"
              />
              <Icone aria-hidden className="size-4" />
              {rotulo}
            </label>
          );
        })}
      </div>
    </div>
  );
}
