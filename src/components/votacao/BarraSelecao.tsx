"use client";

import { ArrowRight, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";

export type BarraSelecaoProps = {
  titulo: string;
  /** Jurado com voto atual: "Revisar alteração". */
  alteracao: boolean;
  aoLimpar: () => void;
  aoRevisar: () => void;
};

/** Etapa 5 (seção 5.4): fixa no rodapé, só com seleção válida; respeita a safe area. */
export function BarraSelecao({ titulo, alteracao, aoLimpar, aoRevisar }: BarraSelecaoProps) {
  return (
    <div
      role="region"
      aria-label="Sua escolha"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-tema-borda bg-tema-fundo/95 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="text-tema-texto-suave">Sua escolha: </span>
          <strong className="font-semibold">{titulo}</strong>
        </p>
        <div className="flex gap-2">
          <Botao variante="contorno" tamanho="pequeno" onClick={aoLimpar} icone={<X aria-hidden className="size-4" />}>
            Limpar
          </Botao>
          <Botao tamanho="pequeno" onClick={aoRevisar} className="flex-1 sm:flex-none" icone={<ArrowRight aria-hidden className="size-4" />}>
            {alteracao ? "Revisar alteração" : "Revisar voto"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
