"use client";

import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * Parceiros do evento (08/10/2026), no fim da página do evento. Sem parceiros, nada. 19/10/2026: faixa branca com o
 * rótulo em caixa-alta, como a de patrocínio nas placas da Maratona Tech Tivit.
 */
export function Parceiros() {
  const ativo = useEventoAtivo();
  if (!ativo || ativo.parceiros.length === 0) return null;
  return (
    <section aria-labelledby="parceiros" className="w-full bg-tema-fundo">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-14 sm:px-6 sm:py-16">
        <h2 id="parceiros" className="text-xs font-bold uppercase tracking-[0.22em] text-tema-primaria-texto">
          Parceiros
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
          {ativo.parceiros.map((p) => (
            <li key={p.id} className="flex h-16 items-center justify-center">
              <LogoParceiro parceiro={p} className="max-h-14 max-w-40 sm:max-h-16 sm:max-w-44" classeNome="font-display text-lg font-extrabold text-tema-texto-suave" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
