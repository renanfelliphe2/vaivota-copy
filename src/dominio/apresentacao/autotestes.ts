import { apurar, type EntradaApuracao } from "../apuracao";
import { FIXTURES_APURACAO } from "../apuracaoAutoteste";
import type { DadosResultado } from "../tipos";
import { estadoInicialMotor, reduzirMotor } from "./motor";
import { codigoDaCena, montarRoteiro } from "./roteiro";
import type { AcaoMotor, Cena } from "./tipos";

// Etapa 8 (seção 5.4, 5.5, 5.11): autotestes puros. Lista vazia = ok. Também viram testes Vitest.

const IDS_FV = ["c01", "c02", "c03", "c04", "c05", "c06"];

function mapa(ids: string[], valores: number[]): Record<string, number> {
  return Object.fromEntries(ids.map((id, i) => [id, valores[i]]));
}

function festival(popular: number[], juri: number[], infantil: number[] | null): EntradaApuracao {
  return {
    candidatos: IDS_FV.map((id, i) => ({ id, ordem: i + 1, desqualificado: false })),
    votos: { POPULAR: mapa(IDS_FV, popular), JURI: mapa(IDS_FV, juri), INFANTIL: infantil ? mapa(IDS_FV, infantil) : {} },
    pesos: infantil ? { POPULAR: 50, JURI: 30, INFANTIL: 20 } : { POPULAR: 63, JURI: 37, INFANTIL: 0 },
    gruposAtivos: infantil ? ["POPULAR", "JURI", "INFANTIL"] : ["POPULAR", "JURI"],
    criterio: "JURI",
  };
}

export const FIXTURES_FESTIVAL: Record<string, { entrada: EntradaApuracao; pontuacoes: number[]; posicoes: number[]; categorias: Record<string, string[]> }> = {
  FESTIVAL_EMPATE_RESOLVIDO: {
    entrada: festival([40, 40, 112, 22, 16, 10], [1, 1, 0, 0, 0, 0], [60, 30, 30, 8, 6, 4]),
    pontuacoes: [32.03, 27.68, 27.68, 5.74, 4.2, 2.66],
    posicoes: [1, 2, 3, 4, 5, 6],
    categorias: { POPULAR: ["c03"], INFANTIL: ["c01"], JURI: ["c01"] },
  },
  FESTIVAL_EMPATE_PERSISTENTE: {
    entrada: festival([70, 70, 40, 30, 20, 10], [1, 1, 0, 0, 0, 0], [26, 26, 40, 22, 14, 10]),
    pontuacoes: [33.35, 33.35, 14.13, 9.44, 6.2, 3.53],
    posicoes: [1, 1, 3, 4, 5, 6],
    categorias: { POPULAR: ["c01", "c02"], INFANTIL: ["c03"], JURI: ["c01", "c02"] },
  },
  FESTIVAL_CO_VENCEDORES: {
    entrada: festival([150, 35, 35, 10, 6, 4], [0, 1, 1, 0, 0, 0], [60, 26, 26, 14, 8, 4]),
    pontuacoes: [39.95, 26.06, 26.06, 4.11, 2.41, 1.41],
    posicoes: [1, 2, 2, 4, 5, 6],
    categorias: { POPULAR: ["c01"], INFANTIL: ["c01"], JURI: ["c02", "c03"] },
  },
};

export function conferirFixturesFestival(): string[] {
  const erros: string[] = [];
  for (const [nome, f] of Object.entries(FIXTURES_FESTIVAL)) {
    const dados = apurar(f.entrada);
    for (const item of dados.ranking) {
      const i = IDS_FV.indexOf(item.candidatoId);
      const pontos = Math.round(item.pontuacao * 100) / 100;
      if (pontos !== f.pontuacoes[i]) erros.push(`${nome}: ${item.candidatoId} com ${pontos}, esperado ${f.pontuacoes[i]}`);
      if (item.posicao !== f.posicoes[i]) erros.push(`${nome}: ${item.candidatoId} na posição ${item.posicao}`);
    }
    for (const c of dados.categorias) {
      const ids = c.vencedores.map((v) => v.candidatoId).join(",");
      if (ids !== f.categorias[c.grupo].join(",")) erros.push(`${nome}: categoria ${c.grupo} com ${ids}`);
    }
    const soma = dados.ranking.reduce((s, r) => s + r.pontuacao, 0);
    if (Math.abs(soma - 100) > 1e-4) erros.push(`${nome}: soma ${soma}`);
    if (dados.pesosEfetivos.POPULAR !== 50 || dados.pesosEfetivos.JURI !== 30 || dados.pesosEfetivos.INFANTIL !== 20)
      erros.push(`${nome}: pesos efetivos ${JSON.stringify(dados.pesosEfetivos)}`);
  }
  return erros;
}

function dadosDaFixture(nome: string): DadosResultado {
  const etapa7 = FIXTURES_APURACAO.find((f) => f.nome === nome);
  if (etapa7) return apurar(etapa7.entrada);
  return apurar(FIXTURES_FESTIVAL[nome].entrada);
}

/** Roteiros esperados da seção 5.4 (modo real). */
export const ROTEIROS_ESPERADOS: Record<string, string> = {
  RESULTADO_PADRAO: "TRAILER, CAT:POPULAR, CAT:JURI, P:3, P:2, P:1, FINAL",
  RESULTADO_EMPATE_RESOLVIDO: "TRAILER, CAT:POPULAR, CAT:JURI, D:0, P:3, P:2, P:1, FINAL",
  RESULTADO_EMPATE_PERSISTENTE: "TRAILER, CAT:POPULAR, CAT:JURI, P:3, D:0, P:1, FINAL",
  RESULTADO_CO_VENCEDORES: "TRAILER, CAT:POPULAR, CAT:JURI, D:0, P:2, P:1, FINAL",
  RESULTADO_DOIS_CANDIDATOS: "TRAILER, CAT:POPULAR, CAT:JURI, P:2, P:1, FINAL",
  FESTIVAL_ENCERRADO: "TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, P:3, P:2, P:1, FINAL",
  RESULTADO_SEM_INFANTIL: "TRAILER, CAT:POPULAR, CAT:JURI, P:3, P:2, P:1, FINAL",
  FESTIVAL_EMPATE_RESOLVIDO: "TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, D:0, P:3, P:2, P:1, FINAL",
  FESTIVAL_EMPATE_PERSISTENTE: "TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, P:3, D:0, P:1, FINAL",
  FESTIVAL_CO_VENCEDORES: "TRAILER, CAT:POPULAR, CAT:INFANTIL, CAT:JURI, D:0, P:2, P:1, FINAL",
};

function dadosCenario(nome: string): DadosResultado {
  if (nome === "RESULTADO_PADRAO") return dadosDaFixture("PADRAO");
  if (nome === "RESULTADO_SEM_INFANTIL") {
    const base = FIXTURES_APURACAO.find((f) => f.nome === "FESTIVAL_ENCERRADO")!.entrada;
    return apurar({ ...base, votos: { ...base.votos, INFANTIL: {} }, pesos: { POPULAR: 63, JURI: 37, INFANTIL: 0 }, gruposAtivos: ["POPULAR", "JURI"] });
  }
  return dadosDaFixture(nome);
}

function texto(roteiro: Cena[]): string {
  return roteiro.map(codigoDaCena).join(", ");
}

function sintetico(n: number, popular: number[], juri: number[] = []): DadosResultado {
  const ids = Array.from({ length: n }, (_, i) => `x${i + 1}`);
  return apurar({
    candidatos: ids.map((id, i) => ({ id, ordem: i + 1, desqualificado: false })),
    votos: { POPULAR: mapa(ids, popular), JURI: mapa(ids, juri), INFANTIL: {} },
    pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
    gruposAtivos: ["POPULAR", "JURI"],
    criterio: "JURI",
  });
}

/** Casos extremos (seção 5.4): [nome, dados, roteiro esperado]. */
export const CASOS_EXTREMOS_ROTEIRO: [string, DadosResultado, string][] = [
  ["24 sem votos", sintetico(24, []), "TRAILER, D:0, P:1, FINAL"],
  ["1 candidato", sintetico(1, [5]), "TRAILER, CAT:POPULAR, P:1, FINAL"],
  ["0 candidatos", sintetico(0, []), "TRAILER, FINAL"],
  ["empate fora do pódio", sintetico(6, [60, 50, 40, 10, 10, 5]), "TRAILER, CAT:POPULAR, P:3, P:2, P:1, FINAL"],
  ["empate [3, 4] resolvido", sintetico(5, [60, 50, 20, 20, 5], [0, 0, 2, 1, 0]), "TRAILER, CAT:POPULAR, CAT:JURI, D:0, P:3, P:2, P:1, FINAL"],
  ["empate [3, 4] persistente", sintetico(5, [60, 50, 20, 20, 5]), "TRAILER, CAT:POPULAR, D:0, P:3, P:2, P:1, FINAL"],
  ["três empatados em 1º (1-1-1-4)", sintetico(4, [30, 30, 30, 10]), "TRAILER, CAT:POPULAR, D:0, P:1, FINAL"],
  ["três empatados em 2º (1-2-2-2)", sintetico(4, [40, 20, 20, 20]), "TRAILER, CAT:POPULAR, D:0, P:2, P:1, FINAL"],
];

export function conferirRoteiro(): string[] {
  const erros: string[] = [];
  const opcoes = { classificacaoCompleta: false, modo: "REAL" as const, candidatosNaDisputa: 8 };
  for (const [nome, esperado] of Object.entries(ROTEIROS_ESPERADOS)) {
    const dados = dadosCenario(nome);
    const real = texto(montarRoteiro(dados, opcoes));
    if (real !== esperado) erros.push(`${nome}: ${real}`);
    const ensaio = texto(montarRoteiro(dados, { ...opcoes, modo: "ENSAIO" }));
    if (ensaio !== `AO_VIVO_ENSAIO, ENCERRADA_ENSAIO, ${esperado}`) erros.push(`${nome} (ensaio): ${ensaio}`);
    const completo = texto(montarRoteiro(dados, { ...opcoes, classificacaoCompleta: true }));
    if (completo !== esperado.replace(", FINAL", ", CLASSIFICACAO, FINAL")) erros.push(`${nome} (classificação): ${completo}`);
  }
  for (const [nome, dados, esperado] of CASOS_EXTREMOS_ROTEIRO) {
    const real = texto(montarRoteiro(dados, { ...opcoes, candidatosNaDisputa: dados.ranking.length }));
    if (real !== esperado) erros.push(`${nome}: ${real}`);
  }
  return erros;
}

export function conferirMotor(): string[] {
  const erros: string[] = [];
  const roteiro = montarRoteiro(dadosCenario("RESULTADO_EMPATE_RESOLVIDO"), { classificacaoCompleta: false, modo: "REAL", candidatosNaDisputa: 8 });
  const aplicar = (acoes: AcaoMotor[], inicial = estadoInicialMotor("MANUAL")) => acoes.reduce((e, a) => reduzirMotor(e, a, roteiro), inicial);
  const esperar = (nome: string, real: unknown, esperado: unknown) => {
    if (JSON.stringify(real) !== JSON.stringify(esperado)) erros.push(`${nome}: ${JSON.stringify(real)}`);
  };

  // Trailer (2 passos: vídeo e chamada) → CAT:POPULAR (3 passos).
  let e = aplicar([{ tipo: "AVANCAR" }, { tipo: "AVANCAR" }, { tipo: "AVANCAR" }, { tipo: "AVANCAR" }]);
  esperar("avançar", [e.cena, e.passo], [1, 2]);
  e = reduzirMotor(e, { tipo: "AVANCAR" }, roteiro);
  esperar("troca de cena", [e.cena, e.passo], [2, 0]);
  e = reduzirMotor(e, { tipo: "VOLTAR" }, roteiro);
  esperar("voltar do passo 0", [e.cena, e.passo], [1, 2]);
  esperar("voltar no início", [aplicar([{ tipo: "VOLTAR" }]).cena], [0]);
  const atrasado = aplicar([{ tipo: "AVANCAR" }, { tipo: "AVANCO_AUTOMATICO", cena: 0, passo: 0 }]);
  esperar("automático atrasado ignorado", [atrasado.cena, atrasado.passo], [0, 1]);
  esperar("pausado ignora automático", aplicar([{ tipo: "PAUSAR" }, { tipo: "AVANCO_AUTOMATICO", cena: 0, passo: 0 }]).cena, 0);
  const fim = aplicar([{ tipo: "IR_PARA_FINAL" }]);
  esperar("emergência", [fim.cena, fim.situacao, fim.emergencia], [roteiro.length - 1, "CONCLUIDA", true]);
  esperar("avançar no final", reduzirMotor(fim, { tipo: "AVANCAR" }, roteiro), fim);
  esperar("modo", aplicar([{ tipo: "DEFINIR_MODO", modo: "AUTOMATICO" }]).modoAvanco, "AUTOMATICO");
  esperar("reiniciar", aplicar([{ tipo: "AVANCAR" }, { tipo: "REINICIAR" }]), estadoInicialMotor("MANUAL"));
  esperar("trailer pronto", aplicar([{ tipo: "TRAILER_PRONTO" }]).trailer, "LINK");
  esperar("trailer falhou", aplicar([{ tipo: "TRAILER_FALHOU" }]).trailer, "GERADO");
  esperar("pular trailer", aplicar([{ tipo: "PULAR_TRAILER" }]).cena, 1);
  esperar("pular trailer na chamada", [aplicar([{ tipo: "AVANCAR" }, { tipo: "PULAR_TRAILER" }])].map((x) => [x.cena, x.passo])[0], [1, 0]);
  esperar("voltar da categoria cai na chamada", [aplicar([{ tipo: "AVANCAR" }, { tipo: "AVANCAR" }, { tipo: "VOLTAR" }])].map((x) => [x.cena, x.passo])[0], [0, 1]);
  let ate = estadoInicialMotor("MANUAL");
  for (let i = 0; i < 100; i++) ate = reduzirMotor(ate, { tipo: "AVANCAR" }, roteiro);
  esperar("chega ao final concluída", [ate.cena, ate.situacao, ate.emergencia], [roteiro.length - 1, "CONCLUIDA", false]);
  return erros;
}
