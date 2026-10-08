import type { Grupo } from "@/dominio/tipos";

// Etapa 7 (seção 5.7): distribuições-alvo (votos brutos por candidato), conferíveis à mão.
// As mesmas tabelas estão em dominio/apuracaoAutoteste.ts com os resultados esperados.

export type DistribuicaoAlvo = Partial<Record<Grupo, Record<string, number>>>;

function st(valores: number[]): Record<string, number> {
  return Object.fromEntries(valores.map((v, i) => [`cand-st-${String(i + 1).padStart(2, "0")}`, v]));
}

function fv(valores: number[]): Record<string, number> {
  return Object.fromEntries(valores.map((v, i) => [`cand-fv-${String(i + 1).padStart(2, "0")}`, v]));
}

export const DISTRIBUICOES = {
  /** Semana Tech: popular 412, júri 7 (conta o voto de Eva em c02 e o de Fábio em c04). */
  PADRAO: { POPULAR: st([118, 96, 61, 52, 41, 24, 15, 5]), JURI: st([2, 2, 1, 1, 1, 0, 0, 0]) },
  EMPATE_RESOLVIDO: { POPULAR: st([100, 60, 85, 45, 30, 20, 10, 0]), JURI: st([2, 1, 0, 1, 1, 1, 0, 0]) },
  EMPATE_PERSISTENTE: { POPULAR: st([90, 90, 50, 40, 30, 25, 15, 10]), JURI: st([2, 2, 1, 1, 0, 0, 0, 0]) },
  CO_VENCEDORES: { POPULAR: st([100, 70, 70, 50, 30, 20, 10, 0]), JURI: st([1, 2, 2, 1, 0, 0, 0, 0]) },
  DOIS_CANDIDATOS: { POPULAR: st([260, 152]), JURI: st([4, 3]) },
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
