import type { Candidato } from "./tipos";

// Etapa 6 (D13): campos extras do evento. A `chave` nasce do rótulo e é imutável; remover o campo
// apaga os valores nos candidatos na mesma operação.

/** "Direção de Arte" → "direcao_de_arte"; sufixo numérico em caso de colisão ("elenco_2"). */
export function gerarChave(rotulo: string, existentes: readonly string[]): string {
  const base =
    rotulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "campo";
  if (!existentes.includes(base)) return base;
  let n = 2;
  while (existentes.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

function temValor(candidato: Candidato, chave: string): boolean {
  return Boolean(candidato.camposExtras?.[chave]?.trim());
}

/** Quantos candidatos do evento têm valor no campo (para a confirmação da remoção). */
export function contarValores(candidatos: readonly Candidato[], eventoId: string, chave: string): number {
  return candidatos.filter((c) => c.eventoId === eventoId && temValor(c, chave)).length;
}

/** Apaga os valores das chaves removidas nos candidatos do evento. */
export function removerValores(candidatos: readonly Candidato[], eventoId: string, chaves: readonly string[]): Candidato[] {
  if (chaves.length === 0) return [...candidatos];
  return candidatos.map((c) => {
    if (c.eventoId !== eventoId || !c.camposExtras) return c;
    if (!chaves.some((k) => k in c.camposExtras!)) return c;
    const camposExtras = Object.fromEntries(Object.entries(c.camposExtras).filter(([k]) => !chaves.includes(k)));
    return { ...c, camposExtras };
  });
}
