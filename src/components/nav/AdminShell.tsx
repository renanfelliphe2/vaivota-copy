"use client";

import type { ReactNode } from "react";

/**
 * Casca mínima do painel (Etapa 0). As Etapas 6 e 7 só preenchem o conteúdo.
 * 08/10/2026: navegação no cabeçalho fixo e estado do evento no título de cada tela (TituloPainel).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col">{children}</div>;
}
