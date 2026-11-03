// Cenários do ensaio da cerimônia. O ensaio nunca toca no resultado oficial: o servidor monta um resultado inventado, em cima dos
// itens e dos módulos do evento, só para o admin treinar o telão (ao vivo simulado, categorias, desempates, pódio, final).
// Os votos de cada cenário saem de `montarDadosEnsaio` (ensaio.ts); aqui fica só o catálogo.

export type CenarioEnsaio = {
  id: string;
  nome: string;
  descricao: string;
  /** Quantos grupos de voto (público, júri, infantil) o evento precisa ter ligados. */
  gruposMinimos: number;
};

export const CENARIOS_ENSAIO: readonly CenarioEnsaio[] = [
  {
    id: "SEM_EMPATE",
    nome: "Sem empate",
    descricao: "Um pódio sem empates, com um vencedor diferente em cada categoria.",
    gruposMinimos: 1,
  },
  {
    id: "EMPATE_RESOLVIDO",
    nome: "Empate resolvido",
    descricao: "O 2º e o 3º lugares empatam na pontuação final e o critério de desempate separa os dois.",
    gruposMinimos: 2,
  },
  {
    id: "EMPATE_PERSISTENTE",
    nome: "Empate persistente",
    descricao: "O 1º lugar empata e o critério de desempate não separa: o 1º lugar é dividido.",
    gruposMinimos: 1,
  },
  {
    id: "CO_VENCEDORES",
    nome: "Co-vencedores",
    descricao: "Dois itens dividem o 2º lugar e a categoria de um dos módulos.",
    gruposMinimos: 1,
  },
];

export type ModulosEvento = { juri: boolean; infantil: boolean };

/** Grupos de voto ligados: o público sempre, o júri e o infantil conforme os módulos. */
export function gruposLigados(modulos: ModulosEvento): number {
  return 1 + Number(modulos.juri) + Number(modulos.infantil);
}

/** Cenários que valem para o evento (o empate resolvido precisa de um segundo grupo de voto para desempatar). */
export function cenariosDoEnsaio(modulos: ModulosEvento): string[] {
  const grupos = gruposLigados(modulos);
  return CENARIOS_ENSAIO.filter((c) => c.gruposMinimos <= grupos).map((c) => c.id);
}
