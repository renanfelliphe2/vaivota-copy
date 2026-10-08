// Aleatoriedade determinística (por semente). Usada para ordem dos candidatos e geração de códigos.

/** Hash FNV-1a de 32 bits (inteiro sem sinal). */
export function hashDeTexto(texto: string, semente = 0x811c9dc5): number {
  let h = semente >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Gerador = () => number;

/** mulberry32: devolve números em [0, 1), repetíveis para a mesma semente. */
export function criarGerador(semente: number | string): Gerador {
  let a = typeof semente === "string" ? hashDeTexto(semente) : semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates com semente. Devolve uma lista nova; a original não muda. */
export function embaralharComSemente<T>(lista: readonly T[], semente: number | string): T[] {
  const copia = [...lista];
  const gerador = criarGerador(semente);
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(gerador() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
