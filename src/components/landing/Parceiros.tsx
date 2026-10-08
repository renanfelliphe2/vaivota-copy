"use client";

import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Parceiros do evento (08/10/2026), no fim da página do evento. Sem parceiros, nada. */
export function Parceiros() {
  const ativo = useEventoAtivo();
  if (!ativo || ativo.parceiros.length === 0) return null;
  return (
    <section aria-labelledby="parceiros" className="w-full border-t border-tema-borda">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 id="parceiros" className="text-center text-2xl font-bold sm:text-3xl">
          Parceiros
        </h2>
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-8">
          {ativo.parceiros.map((p) => (
            <li key={p.id} className="flex h-16 items-center justify-center">
              <LogoParceiro parceiro={p} className="max-h-16 max-w-40" classeNome="text-lg font-semibold text-tema-texto-suave" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
