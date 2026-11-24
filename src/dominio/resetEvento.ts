// Resetar o evento (demanda E1, 25/11/2026): volta para rascunho com a urna não iniciada, em qualquer estado (inclusive concluído).
// A configuração fica. O admin escolhe o que zerar; a auditoria nunca é apagada.
//
// Dependência entre as opções: apagar contas do público, jurados ou totens exige zerar os votos. Sem isso, o banco recusa (o voto do
// júri e o do totem apontam para a participação e o aparelho), ou o público voltaria a votar com o voto antigo ainda contando (a
// marca de "já votou" sai junto com a participação).

export type OpcoesReset = {
  /** Votos do público, do júri e do totem, as marcas de "já votou" e os resultados oficiais. */
  votos: boolean;
  /** Participações do público no evento. As contas e as da organização ficam. */
  contasPublico: boolean;
  /** Participações de jurado e convites. */
  jurados: boolean;
  /** Totens e códigos de pareamento. */
  totens: boolean;
};

export type ChaveReset = keyof OpcoesReset;

export const OPCOES_RESET_VAZIAS: OpcoesReset = { votos: false, contasPublico: false, jurados: false, totens: false };

export const OPCOES_RESET: readonly { chave: ChaveReset; rotulo: string; descricao: string }[] = [
  {
    chave: "votos",
    rotulo: "Votos",
    descricao: "Do público, do júri (votos, notas, escolhas por critério e histórico) e do totem, as marcas de \"já votou\" e os resultados oficiais.",
  },
  {
    chave: "contasPublico",
    rotulo: "Contas do público",
    descricao: "As participações do público no evento: as pessoas precisam entrar de novo. As contas e as da organização não são apagadas.",
  },
  {
    chave: "jurados",
    rotulo: "Jurados",
    descricao: "As participações de jurado e os convites: os convites precisam ser enviados de novo.",
  },
  {
    chave: "totens",
    rotulo: "Totens pareados",
    descricao: "Os totens e os códigos de pareamento: os totens precisam ser pareados de novo.",
  },
];

/** Opções que obrigam a zerar os votos. */
export const EXIGEM_VOTOS: readonly ChaveReset[] = ["contasPublico", "jurados", "totens"];

/** Votos exigidos por alguma outra opção marcada. */
export function votosObrigatorios(opcoes: OpcoesReset): boolean {
  return EXIGEM_VOTOS.some((c) => opcoes[c]);
}

/** Aplica a dependência: qualquer opção que exige os votos marca os votos. */
export function normalizarOpcoesReset(opcoes: OpcoesReset): OpcoesReset {
  return { ...opcoes, votos: opcoes.votos || votosObrigatorios(opcoes) };
}

/** Rótulos das opções marcadas, na ordem do modal (para a auditoria e o aviso). */
export function rotulosMarcados(opcoes: Partial<OpcoesReset> | null | undefined): string[] {
  if (!opcoes) return [];
  return OPCOES_RESET.filter((o) => opcoes[o.chave] === true).map((o) => o.rotulo.toLowerCase());
}

/** "Evento resetado: votos e jurados zerados" / "Evento resetado (configuração mantida)". */
export function descreverReset(opcoes: Partial<OpcoesReset> | null | undefined): string {
  const rotulos = rotulosMarcados(opcoes);
  if (rotulos.length === 0) return "Evento resetado para rascunho (nada zerado)";
  const lista = rotulos.length === 1 ? rotulos[0] : `${rotulos.slice(0, -1).join(", ")} e ${rotulos[rotulos.length - 1]}`;
  return `Evento resetado para rascunho: ${lista} zerados`;
}
