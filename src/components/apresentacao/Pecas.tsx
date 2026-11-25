"use client";

import { FlaskConical } from "lucide-react";

// Etapa 8 (5.7, 5.9): peças do palco. As da cerimônia (25/11/2026) ficam em telao/Sala.tsx.

/** D5: o selo ENSAIO é parte do canvas e não pode ser ocultado. */
export function SeloEnsaio() {
  return (
    <div className="absolute right-10 top-10 z-10 inline-flex items-center gap-3 rounded-full border-4 border-tema-aviso bg-tema-fundo px-8 py-3 text-[40px] font-black uppercase tracking-widest text-tema-aviso">
      <FlaskConical aria-hidden className="size-10" /> Ensaio
    </div>
  );
}

/** Nomes até o limite visual, com "+N" (D12). */
export function MaisNomes({ mais }: { mais: number }) {
  if (mais <= 0) return null;
  return <p className="text-[40px] font-semibold text-tema-texto-suave">+{mais}</p>;
}
