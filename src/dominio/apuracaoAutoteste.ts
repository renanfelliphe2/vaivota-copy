import { apurar, type EntradaApuracao } from "./apuracao";
import type { DadosResultado, Grupo } from "./tipos";

// Etapa 7 (seção 5.2, autoteste puro): as fixtures da seção 5.7 com os resultados escritos à mão.
// As mesmas fixtures alimentam dominio/apuracao.test.ts (D19 rev. 3).

export type FixtureApuracao = {
  nome: string;
  entrada: EntradaApuracao;
  esperado: {
    /** Pontuação (2 casas) por candidato, na ordem dos ids. */
    pontuacoes: Record<string, number>;
    posicoes: Record<string, number>;
    empates: Pick<DadosResultado["empates"][number], "posicoes" | "resolvido" | "vencedorId">[];
    categorias: Partial<Record<Grupo, { vencedores: string[]; desempatadoPorPontuacao?: boolean }>>;
  };
};

const IDS_ST = ["c01", "c02", "c03", "c04", "c05", "c06", "c07", "c08"];
const IDS_FV = ["c01", "c02", "c03", "c04", "c05", "c06"];

function mapa(ids: string[], valores: number[]): Record<string, number> {
  return Object.fromEntries(ids.map((id, i) => [id, valores[i]]));
}

function candidatos(ids: string[]) {
  return ids.map((id, i) => ({ id, ordem: i + 1, desqualificado: false }));
}

function semanaTech(popular: number[], juri: number[], ids = IDS_ST): EntradaApuracao {
  return {
    candidatos: candidatos(ids),
    votos: { POPULAR: mapa(ids, popular), JURI: mapa(ids, juri), INFANTIL: {} },
    pesos: { POPULAR: 70, JURI: 30, INFANTIL: 0 },
    gruposAtivos: ["POPULAR", "JURI"],
    criterio: "JURI",
  };
}

export const FIXTURES_APURACAO: FixtureApuracao[] = [
  {
    nome: "PADRAO",
    entrada: semanaTech([118, 96, 61, 52, 41, 24, 15, 5], [2, 2, 1, 1, 1, 0, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [28.62, 24.88, 14.65, 13.12, 11.25, 4.08, 2.55, 0.85]),
      posicoes: mapa(IDS_ST, [1, 2, 3, 4, 5, 6, 7, 8]),
      empates: [],
      categorias: { POPULAR: { vencedores: ["c01"] }, JURI: { vencedores: ["c01"], desempatadoPorPontuacao: true } },
    },
  },
  {
    nome: "RESULTADO_EMPATE_RESOLVIDO",
    entrada: semanaTech([100, 60, 85, 45, 30, 20, 10, 0], [2, 1, 0, 1, 1, 1, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [30, 17, 17, 14, 11, 9, 2, 0]),
      posicoes: mapa(IDS_ST, [1, 2, 3, 4, 5, 6, 7, 8]),
      empates: [{ posicoes: [2, 3], resolvido: true, vencedorId: "c02" }],
      categorias: { POPULAR: { vencedores: ["c01"] }, JURI: { vencedores: ["c01"] } },
    },
  },
  {
    nome: "RESULTADO_EMPATE_PERSISTENTE",
    entrada: semanaTech([90, 90, 50, 40, 30, 25, 15, 10], [2, 2, 1, 1, 0, 0, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [28, 28, 15, 13, 6, 5, 3, 2]),
      posicoes: mapa(IDS_ST, [1, 1, 3, 4, 5, 6, 7, 8]),
      empates: [{ posicoes: [1, 2], resolvido: false }],
      categorias: { POPULAR: { vencedores: ["c01", "c02"] }, JURI: { vencedores: ["c01", "c02"] } },
    },
  },
  {
    nome: "RESULTADO_CO_VENCEDORES",
    entrada: semanaTech([100, 70, 70, 50, 30, 20, 10, 0], [1, 2, 2, 1, 0, 0, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [25, 24, 24, 15, 6, 4, 2, 0]),
      posicoes: mapa(IDS_ST, [1, 2, 2, 4, 5, 6, 7, 8]),
      empates: [{ posicoes: [2, 3], resolvido: false }],
      categorias: { POPULAR: { vencedores: ["c01"] }, JURI: { vencedores: ["c02", "c03"] } },
    },
  },
  {
    nome: "RESULTADO_DOIS_CANDIDATOS",
    entrada: semanaTech([260, 152], [4, 3], ["c01", "c02"]),
    esperado: {
      pontuacoes: { c01: 61.32, c02: 38.68 },
      posicoes: { c01: 1, c02: 2 },
      empates: [],
      categorias: { POPULAR: { vencedores: ["c01"] }, JURI: { vencedores: ["c01"] } },
    },
  },
  {
    nome: "FESTIVAL_ENCERRADO",
    entrada: {
      candidatos: candidatos(IDS_FV),
      votos: {
        POPULAR: mapa(IDS_FV, [70, 55, 42, 35, 25, 13]),
        JURI: mapa(IDS_FV, [1, 1, 0, 0, 0, 0]),
        INFANTIL: mapa(IDS_FV, [30, 38, 28, 22, 12, 8]),
      },
      pesos: { POPULAR: 50, JURI: 30, INFANTIL: 20 },
      gruposAtivos: ["POPULAR", "JURI", "INFANTIL"],
      criterio: "JURI",
    },
    esperado: {
      pontuacoes: mapa(IDS_FV, [33.93, 31.97, 12.81, 10.48, 6.95, 3.87]),
      posicoes: mapa(IDS_FV, [1, 2, 3, 4, 5, 6]),
      empates: [],
      categorias: {
        POPULAR: { vencedores: ["c01"] },
        INFANTIL: { vencedores: ["c02"] },
        JURI: { vencedores: ["c01"], desempatadoPorPontuacao: true },
      },
    },
  },
  {
    nome: "GRUPO_SEM_VOTOS (júri ligado com base 0: peso redistribuído)",
    entrada: semanaTech([3, 1, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [75, 25, 0, 0, 0, 0, 0, 0]),
      posicoes: mapa(IDS_ST, [1, 2, 3, 3, 3, 3, 3, 3]),
      empates: [{ posicoes: [3, 4, 5, 6, 7, 8], resolvido: false }],
      categorias: { POPULAR: { vencedores: ["c01"] }, JURI: { vencedores: [] } },
    },
  },
  {
    nome: "TODOS_SEM_VOTOS (pontuações 0)",
    entrada: semanaTech([0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]),
    esperado: {
      pontuacoes: mapa(IDS_ST, [0, 0, 0, 0, 0, 0, 0, 0]),
      posicoes: mapa(IDS_ST, [1, 1, 1, 1, 1, 1, 1, 1]),
      empates: [{ posicoes: [1, 2, 3, 4, 5, 6, 7, 8], resolvido: false }],
      categorias: { POPULAR: { vencedores: [] }, JURI: { vencedores: [] } },
    },
  },
  {
    nome: "JURI_DESLIGADO (critério JURI vira PUBLICO)",
    entrada: {
      candidatos: candidatos(["c01", "c02", "c03"]),
      votos: { POPULAR: { c01: 50, c02: 50, c03: 0 }, JURI: { c02: 3 }, INFANTIL: {} },
      pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
      gruposAtivos: ["POPULAR"],
      criterio: "JURI",
    },
    esperado: {
      pontuacoes: { c01: 50, c02: 50, c03: 0 },
      posicoes: { c01: 1, c02: 1, c03: 3 },
      empates: [{ posicoes: [1, 2], resolvido: false }],
      categorias: { POPULAR: { vencedores: ["c01", "c02"] } },
    },
  },
];

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Divergências de uma fixture (vazio = ok). */
export function conferirFixture(f: FixtureApuracao): string[] {
  const dados = apurar(f.entrada);
  const erros: string[] = [];
  for (const item of dados.ranking) {
    const pontos = Math.round(item.pontuacao * 100) / 100;
    if (pontos !== f.esperado.pontuacoes[item.candidatoId])
      erros.push(`${f.nome}: ${item.candidatoId} com ${pontos}, esperado ${f.esperado.pontuacoes[item.candidatoId]}`);
    if (item.posicao !== f.esperado.posicoes[item.candidatoId])
      erros.push(`${f.nome}: ${item.candidatoId} na posição ${item.posicao}, esperada ${f.esperado.posicoes[item.candidatoId]}`);
  }
  const empates = dados.empates.map((e) => ({
    posicoes: e.posicoes,
    resolvido: e.resolvido,
    ...(e.vencedorId ? { vencedorId: e.vencedorId } : {}),
  }));
  if (!igual(empates, f.esperado.empates)) erros.push(`${f.nome}: empates ${JSON.stringify(empates)}`);
  for (const c of dados.categorias) {
    const esperada = f.esperado.categorias[c.grupo];
    if (!esperada) {
      erros.push(`${f.nome}: categoria ${c.grupo} inesperada`);
      continue;
    }
    const ids = c.vencedores.map((v) => v.candidatoId);
    if (!igual(ids, esperada.vencedores)) erros.push(`${f.nome}: categoria ${c.grupo} com ${ids.join(", ") || "nenhum"}`);
    if (esperada.desempatadoPorPontuacao !== undefined && esperada.desempatadoPorPontuacao !== c.desempatadoPorPontuacao)
      erros.push(`${f.nome}: categoria ${c.grupo} desempatadoPorPontuacao = ${c.desempatadoPorPontuacao}`);
  }
  return erros;
}

/** Roda `apurar` sobre todas as fixtures e devolve as divergências (vazia = ok). Botão da toolbar. */
export function conferirApuracao(): string[] {
  return FIXTURES_APURACAO.flatMap(conferirFixture);
}
