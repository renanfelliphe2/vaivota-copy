// Números e percentuais em pt-BR (vírgula decimal).

export function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatarDecimal(n: number, casas = 2): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
}

/** `valor` já em pontos percentuais: 62.5 → "62,5%". */
export function formatarPercentual(valor: number, casas = 1): string {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas }).format(valor)}%`;
}

/** Plural simples: (1, "voto", "votos") → "1 voto". */
export function contar(n: number, singular: string, plural: string): string {
  return `${formatarNumero(n)} ${n === 1 ? singular : plural}`;
}
