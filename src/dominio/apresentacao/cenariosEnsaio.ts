// Etapa 8 (D20, seção 5.10): cenários do ensaio por evento (todos registrados em mocks/cenarios.ts).

export const CENARIOS_ENSAIO: Record<string, string[]> = {
  "evt-semana-tech": [
    "RESULTADO_PADRAO",
    "RESULTADO_EMPATE_RESOLVIDO",
    "RESULTADO_EMPATE_PERSISTENTE",
    "RESULTADO_CO_VENCEDORES",
    "RESULTADO_DOIS_CANDIDATOS",
  ],
  "evt-ver-e-fazer-filmes": [
    "FESTIVAL_ENCERRADO",
    "RESULTADO_SEM_INFANTIL",
    "FESTIVAL_EMPATE_RESOLVIDO",
    "FESTIVAL_EMPATE_PERSISTENTE",
    "FESTIVAL_CO_VENCEDORES",
  ],
};

export function cenariosDoEnsaio(eventoId: string): string[] {
  return CENARIOS_ENSAIO[eventoId] ?? [];
}
