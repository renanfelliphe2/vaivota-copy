// Carrossel infinito das categorias (demanda B1, 25/11/2026). A lista é repetida lado a lado (a do meio é a de verdade, as outras
// só visuais) e a rolagem dá a volta saltando exatamente uma cópia: o salto não aparece, porque a tela mostra a mesma coisa.

/** `n` itens de largura `item`, separados por `gap`, cabem em `largura`? */
export function cabeNaLinha(n: number, item: number, gap: number, largura: number): boolean {
  if (n <= 0) return true;
  // Meio pixel de folga para arredondamentos do navegador.
  return n * item + (n - 1) * gap <= largura + 0.5;
}

/**
 * Quantas cópias da lista (ímpar, a de verdade no meio) para que, normalizada a posição na cópia do meio, ainda sobre uma tela
 * inteira de cada lado (o passo das setas é menor que uma tela). `largura`: a da área visível; `periodo`: a de uma cópia.
 */
export function copiasDoCarrossel(largura: number, periodo: number): number {
  if (periodo <= 0) return 1;
  return 2 * Math.max(1, Math.ceil((2 * largura) / periodo)) + 1;
}

/** A posição equivalente (mesma imagem na tela) dentro de meia cópia em volta do início da cópia do meio. */
export function normalizarPosicao(posicao: number, periodo: number, copias: number): number {
  if (periodo <= 0) return posicao;
  const centro = ((copias - 1) / 2) * periodo;
  const desvio = (((posicao - centro + periodo / 2) % periodo) + periodo) % periodo;
  return centro + desvio - periodo / 2;
}
