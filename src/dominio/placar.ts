import type { Grupo } from "./tipos";

export type Pesos = Record<Grupo, number>;
export type GruposLigados = Record<Grupo, boolean>;

export const GRUPOS: readonly Grupo[] = ["POPULAR", "JURI", "INFANTIL"];

/**
 * Zera o peso dos grupos desligados e redistribui o restante proporcionalmente entre os ligados,
 * mantendo a soma em 100 com inteiros (maior resto). Se os ligados somarem 0, divide igualmente.
 * O grupo POPULAR é sempre considerado ligado.
 */
export function redistribuirPesos(pesos: Pesos, ligados: GruposLigados): Pesos {
  const ativos = GRUPOS.filter((g) => g === "POPULAR" || ligados[g]);
  const base = ativos.reduce((soma, g) => soma + Math.max(0, pesos[g]), 0);

  const brutos = ativos.map((g) => ({
    grupo: g,
    valor: base > 0 ? (Math.max(0, pesos[g]) * 100) / base : 100 / ativos.length,
  }));

  const resultado: Pesos = { POPULAR: 0, JURI: 0, INFANTIL: 0 };
  let distribuido = 0;
  for (const { grupo, valor } of brutos) {
    resultado[grupo] = Math.floor(valor);
    distribuido += resultado[grupo];
  }

  // Maior resto: entrega as unidades que faltam a quem teve a maior parte fracionária.
  const restos = [...brutos].sort(
    (a, b) => b.valor - Math.floor(b.valor) - (a.valor - Math.floor(a.valor)) || GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo),
  );
  for (let i = 0; distribuido < 100; i = (i + 1) % restos.length) {
    resultado[restos[i].grupo] += 1;
    distribuido += 1;
  }
  return resultado;
}

export function somaPesos(pesos: Pesos): number {
  return pesos.POPULAR + pesos.JURI + pesos.INFANTIL;
}
