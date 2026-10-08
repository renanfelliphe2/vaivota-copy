// Contraste WCAG 2.x. Política D15: nenhum texto abaixo de 4,5:1; texto sobre cor de marca é sempre derivado.

export const CONTRASTE_TEXTO = 4.5;
export const CONTRASTE_UI = 3;

// Neutros absolutos (não são cores de marca): último recurso quando as cores do tema não atingem 4,5:1.
const BRANCO = "#ffffff";
const PRETO = "#000000";

type Rgb = [number, number, number];

export function hexParaRgb(hex: string): Rgb {
  const limpo = hex.replace("#", "").trim();
  const cheio =
    limpo.length === 3
      ? limpo
          .split("")
          .map((c) => c + c)
          .join("")
      : limpo;
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) throw new Error(`Cor inválida: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16)) as Rgb;
}

export function rgbParaHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

function canalLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa (0 = preto, 1 = branco). */
export function luminancia(hex: string): number {
  const [r, g, b] = hexParaRgb(hex).map(canalLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function razaoContraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  const [claro, escuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (escuro + 0.05);
}

/** Mistura em sRGB: `proporcao` = quanto de `b` entra (0 = só `a`, 1 = só `b`). */
export function misturar(a: string, b: string, proporcao: number): string {
  const ra = hexParaRgb(a);
  const rb = hexParaRgb(b);
  return rgbParaHex(ra.map((v, i) => v + (rb[i] - v) * proporcao) as Rgb);
}

/**
 * Cor de texto sobre `cor` (claro ou escuro, o de maior contraste). Tenta primeiro as `candidatas`
 * (em geral o fundo e o texto do tema); se nenhuma atingir 4,5:1, usa branco ou preto.
 */
export function corTextoSobre(cor: string, candidatas: readonly string[] = []): string {
  const melhor = (lista: readonly string[]) =>
    lista.reduce((a, b) => (razaoContraste(b, cor) > razaoContraste(a, cor) ? b : a));
  if (candidatas.length > 0) {
    const escolhida = melhor(candidatas);
    if (razaoContraste(escolhida, cor) >= CONTRASTE_TEXTO) return escolhida;
  }
  return melhor([BRANCO, PRETO]);
}

/**
 * A `cor` ajustada para uso como texto, link ou ícone sobre `fundo`: mistura gradual com `texto`
 * até atingir 4,5:1. Se já atinge, devolve a própria cor.
 */
export function corLegivelSobre(cor: string, fundo: string, texto: string, minimo = CONTRASTE_TEXTO): string {
  for (let passo = 0; passo <= 20; passo++) {
    const candidata = misturar(cor, texto, passo / 20);
    if (razaoContraste(candidata, fundo) >= minimo) return candidata;
  }
  return corTextoSobre(fundo, [texto]);
}
