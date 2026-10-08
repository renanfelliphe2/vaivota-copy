import type { Cenario } from "../cenarios";
import { DISTRIBUICOES_APRESENTACAO } from "../volume/distribuicoesApresentacao";
import { FESTIVAL_BASE, montarResultado, type DefinicaoResultado } from "./resultado";

// Etapa 8 (D20, seção 5.11): três cenários do Festival com empates, pelos mesmos passos da Etapa 7.

function cenario(id: keyof typeof DISTRIBUICOES_APRESENTACAO, nome: string, descricao: string): Cenario {
  const def: DefinicaoResultado = { ...FESTIVAL_BASE, distribuicao: DISTRIBUICOES_APRESENTACAO[id], infantil: true };
  return { id, nome, grupo: "RESULTADO", descricao, aplicar: (atual) => montarResultado(atual, def, id) };
}

export const CENARIOS_FESTIVAL_APRESENTACAO: Cenario[] = [
  cenario("FESTIVAL_EMPATE_RESOLVIDO", "Festival: empate resolvido", "c02 e c03 empatam em 27,68; o júri dá o 2º lugar a c02."),
  cenario("FESTIVAL_EMPATE_PERSISTENTE", "Festival: empate persistente", "c01 e c02 empatam em 33,35 e o critério não separa: 1º compartilhado."),
  cenario("FESTIVAL_CO_VENCEDORES", "Festival: co-vencedores", "c02 e c03 dividem o 2º lugar e a categoria do júri."),
];
