import type { Pesos } from "./placar";
import type { Grupo } from "./tipos";

// Etapa 6 (seção 5.5): exemplo numérico fixo do Placar. Os votos NÃO vêm do evento.
// pontuação = Σ peso[g] × (votos[g] ÷ total[g]), cada grupo normalizado antes do peso.

export type LinhaExemplo = { candidato: "A" | "B" | "C"; votos: Record<Grupo, number>; pontuacao: number };

export const VOTOS_EXEMPLO: { totais: Record<Grupo, number>; candidatos: Omit<LinhaExemplo, "pontuacao">[] } = {
  totais: { POPULAR: 200, JURI: 10, INFANTIL: 40 },
  candidatos: [
    { candidato: "A", votos: { POPULAR: 100, JURI: 2, INFANTIL: 10 } },
    { candidato: "B", votos: { POPULAR: 60, JURI: 7, INFANTIL: 10 } },
    { candidato: "C", votos: { POPULAR: 40, JURI: 1, INFANTIL: 20 } },
  ],
};

const GRUPOS: Grupo[] = ["POPULAR", "JURI", "INFANTIL"];

/** Pontuações com uma casa (70/30/0 → A 41,0; B 42,0; C 17,0). */
export function calcularExemploPlacar(pesos: Pesos): LinhaExemplo[] {
  return VOTOS_EXEMPLO.candidatos.map((c) => {
    const bruta = GRUPOS.reduce((soma, g) => soma + pesos[g] * (c.votos[g] / VOTOS_EXEMPLO.totais[g]), 0);
    return { ...c, pontuacao: Math.round(bruta * 10) / 10 };
  });
}

/** Quem lidera o exemplo (ou null em empate no topo). */
export function liderDoExemplo(linhas: readonly LinhaExemplo[]): LinhaExemplo["candidato"] | null {
  const ordenadas = [...linhas].sort((a, b) => b.pontuacao - a.pontuacao);
  if (ordenadas.length > 1 && ordenadas[0].pontuacao === ordenadas[1].pontuacao) return null;
  return ordenadas[0]?.candidato ?? null;
}
