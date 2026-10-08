"use client";

import { useEffect, useRef } from "react";

/**
 * Foco no h1 da área principal a cada troca de passo, exceto na primeira renderização da rota
 * (Etapa 5, seção 5.9). O h1 precisa de tabIndex={-1}.
 */
export function useFocoNoTitulo(passo: string): void {
  const anterior = useRef<string | null>(null);
  useEffect(() => {
    if (anterior.current !== null && anterior.current !== passo) {
      document.querySelector<HTMLElement>("#conteudo h1")?.focus();
    }
    anterior.current = passo;
  }, [passo]);
}
