// Grade de cartazes do totem (26/11/2026): o totem fica parado, então a escolha cabe inteira na tela, sem rolagem, em qualquer
// tamanho. Para cada número de colunas possível calcula a largura que o cartão teria (limitada pela largura e pela altura
// disponíveis) e fica com a maior. Com mais de uma categoria, cada uma começa numa linha nova e tem o nome em cima.

/** Altura do cartão do totem dividida pela largura (cartaz 5:7 e duas linhas de título; ver CartaoTotem), com folga. */
export const RAZAO_CARTAO_TOTEM = 1.7;

/** Abaixo disso o cartão fica pequeno demais para o dedo e o olho: a área passa a rolar. */
export const LARGURA_MINIMA_CARTAO_TOTEM = 96;

export type EntradaGradeTotem = {
  /** Área disponível, em px. */
  largura: number;
  altura: number;
  /** Quantos itens cada categoria tem, na ordem em que aparecem. */
  grupos: readonly number[];
  /** Espaço entre cartões, entre linhas e entre categorias, em px. */
  espaco: number;
  /** Altura do nome da categoria (só aparece com mais de uma). */
  alturaTitulo: number;
};

/** `cabe`: a grade inteira cabe na área com cartões de pelo menos o mínimo. Sem isso, a área rola na vertical. */
export type ArranjoGradeTotem = { colunas: number; larguraCartao: number; cabe: boolean };

export function arranjarGradeTotem({ largura, altura, grupos, espaco, alturaTitulo }: EntradaGradeTotem): ArranjoGradeTotem {
  const cheios = grupos.filter((n) => n > 0);
  const maior = Math.max(1, ...cheios);
  // Cada categoria: nome + espaço + linhas; entre categorias, o espaço. Somado: títulos + L linhas + (L - 1) espaços.
  const titulos = cheios.length > 1 ? cheios.length * (alturaTitulo + espaco) : 0;
  let melhor = { colunas: 1, larguraCartao: 0 };
  for (let colunas = 1; colunas <= maior; colunas++) {
    const linhas = Math.max(1, cheios.reduce((soma, n) => soma + Math.ceil(n / colunas), 0));
    const pelaLargura = (largura - (colunas - 1) * espaco) / colunas;
    const pelaAltura = (altura - titulos - (linhas - 1) * espaco) / linhas / RAZAO_CARTAO_TOTEM;
    const larguraCartao = Math.floor(Math.min(pelaLargura, pelaAltura));
    if (larguraCartao > melhor.larguraCartao) melhor = { colunas, larguraCartao };
  }
  return {
    colunas: melhor.colunas,
    larguraCartao: Math.max(melhor.larguraCartao, LARGURA_MINIMA_CARTAO_TOTEM),
    cabe: melhor.larguraCartao >= LARGURA_MINIMA_CARTAO_TOTEM,
  };
}
