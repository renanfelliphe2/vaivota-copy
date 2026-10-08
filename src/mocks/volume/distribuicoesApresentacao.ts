import type { DistribuicaoAlvo } from "./distribuicoes";

// Etapa 8 (seção 5.11): três distribuições do Festival com empates (mesma configuração do FESTIVAL_ENCERRADO).

function fv(valores: number[]): Record<string, number> {
  return Object.fromEntries(valores.map((v, i) => [`cand-fv-${String(i + 1).padStart(2, "0")}`, v]));
}

export const DISTRIBUICOES_APRESENTACAO = {
  FESTIVAL_EMPATE_RESOLVIDO: {
    POPULAR: fv([40, 40, 112, 22, 16, 10]),
    JURI: fv([1, 1, 0, 0, 0, 0]),
    INFANTIL: fv([60, 30, 30, 8, 6, 4]),
  },
  FESTIVAL_EMPATE_PERSISTENTE: {
    POPULAR: fv([70, 70, 40, 30, 20, 10]),
    JURI: fv([1, 1, 0, 0, 0, 0]),
    INFANTIL: fv([26, 26, 40, 22, 14, 10]),
  },
  FESTIVAL_CO_VENCEDORES: {
    POPULAR: fv([150, 35, 35, 10, 6, 4]),
    JURI: fv([0, 1, 1, 0, 0, 0]),
    INFANTIL: fv([60, 26, 26, 14, 8, 4]),
  },
} satisfies Record<string, DistribuicaoAlvo>;
