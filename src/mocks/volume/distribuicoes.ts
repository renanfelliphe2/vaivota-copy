import type { Grupo } from "@/dominio/tipos";

// Etapa 7 (seção 5.7): distribuições-alvo (votos brutos por candidato), conferíveis à mão.
// As mesmas tabelas estão em dominio/apuracaoAutoteste.ts com os resultados esperados.

export type DistribuicaoAlvo = Partial<Record<Grupo, Record<string, number>>>;

function fv(valores: number[]): Record<string, number> {
  return Object.fromEntries(valores.map((v, i) => [`cand-fv-${String(i + 1).padStart(2, "0")}`, v]));
}

export const DISTRIBUICOES = {
  /** Festival: popular 240, júri 2, infantil 138. */
  FESTIVAL: {
    POPULAR: fv([70, 55, 42, 35, 25, 13]),
    JURI: fv([1, 1, 0, 0, 0, 0]),
    INFANTIL: fv([30, 38, 28, 22, 12, 8]),
  },
  FESTIVAL_SEM_INFANTIL: { POPULAR: fv([70, 55, 42, 35, 25, 13]), JURI: fv([1, 1, 0, 0, 0, 0]) },
} satisfies Record<string, DistribuicaoAlvo>;

/** Totens do Festival: Hall 70, Pátio 41, Oficinas 27 (soma 138). */
export const VOTOS_POR_TOTEM_FESTIVAL: Record<string, number> = {
  "disp-fv-hall": 70,
  "disp-fv-patio": 41,
  "disp-fv-oficinas": 27,
};
