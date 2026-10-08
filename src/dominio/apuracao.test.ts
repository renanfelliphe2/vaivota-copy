import { describe, expect, it } from "vitest";
import { apurar } from "./apuracao";
import { conferirApuracao, conferirFixture, FIXTURES_APURACAO } from "./apuracaoAutoteste";
import { conferirDadosResultado } from "./invariantes";
import { resumirApuracao } from "./resultado";

// Etapa 7 (D19 rev. 3, E24): fixtures da seção 5.7 e casos extras da apuração.

describe("apurar: fixtures da seção 5.7", () => {
  for (const fixture of FIXTURES_APURACAO) {
    it(fixture.nome, () => {
      expect(conferirFixture(fixture)).toEqual([]);
      expect(conferirDadosResultado(apurar(fixture.entrada))).toEqual([]);
    });
  }

  it("conferirApuracao fica vazio", () => {
    expect(conferirApuracao()).toEqual([]);
  });
});

describe("apurar: regras", () => {
  const base = FIXTURES_APURACAO[0].entrada;

  it("pesos efetivos = pesos quando nenhum grupo ativo tem base 0", () => {
    const dados = apurar(base);
    expect(dados.pesosEfetivos).toEqual({ POPULAR: 70, JURI: 30, INFANTIL: 0 });
    expect(dados.ranking.reduce((s, r) => s + r.pontuacao, 0)).toBeCloseTo(100, 5);
  });

  it("grupo ligado sem votos redistribui o peso (C3)", () => {
    const dados = apurar(FIXTURES_APURACAO.find((f) => f.nome.startsWith("GRUPO_SEM_VOTOS"))!.entrada);
    expect(dados.pesosEfetivos).toEqual({ POPULAR: 100, JURI: 0, INFANTIL: 0 });
    const resumo = resumirApuracao(dados, { POPULAR: 70, JURI: 30, INFANTIL: 0 });
    expect(resumo.gruposSemBase).toEqual(["JURI"]);
    expect(resumo.pesoRedistribuido).toBe(30);
  });

  it("Festival com júri e infantil sem votos: popular fica com 100 (V27 b)", () => {
    const dados = apurar({
      candidatos: [
        { id: "a", ordem: 1, desqualificado: false },
        { id: "b", ordem: 2, desqualificado: false },
      ],
      votos: { POPULAR: { a: 7, b: 3 }, JURI: {}, INFANTIL: {} },
      pesos: { POPULAR: 50, JURI: 30, INFANTIL: 20 },
      gruposAtivos: ["POPULAR", "JURI", "INFANTIL"],
      criterio: "JURI",
    });
    expect(dados.pesosEfetivos).toEqual({ POPULAR: 100, JURI: 0, INFANTIL: 0 });
    expect(dados.ranking.map((r) => r.pontuacao)).toEqual([70, 30]);
  });

  it("todos os grupos sem votos: tudo 0, sem divisão por zero", () => {
    const dados = apurar(FIXTURES_APURACAO.find((f) => f.nome.startsWith("TODOS_SEM_VOTOS"))!.entrada);
    expect(dados.pesosEfetivos).toEqual({ POPULAR: 0, JURI: 0, INFANTIL: 0 });
    expect(dados.ranking.every((r) => r.pontuacao === 0 && r.posicao === 1)).toBe(true);
    expect(dados.categorias.every((c) => c.vencedores.length === 0)).toBe(true);
  });

  it("critério JURI com júri desligado aplica PUBLICO", () => {
    const dados = apurar(FIXTURES_APURACAO.find((f) => f.nome.startsWith("JURI_DESLIGADO"))!.entrada);
    expect(dados.criterioDesempate).toBe("JURI");
    expect(dados.empates[0].criterioAplicado).toBe("PUBLICO");
    expect(resumirApuracao(dados, { POPULAR: 100, JURI: 0, INFANTIL: 0 }).criterioEfetivo).toBe("PUBLICO");
    expect(dados.categorias.map((c) => c.grupo)).toEqual(["POPULAR"]);
    expect(dados.totais.JURI).toBe(0);
  });

  it("empate de 3 candidatos que o critério separa em parte (E24)", () => {
    const ids = ["a", "b", "c", "d"];
    const dados = apurar({
      candidatos: ids.map((id, i) => ({ id, ordem: i + 1, desqualificado: false })),
      votos: { POPULAR: { a: 10, b: 10, c: 10, d: 5 }, JURI: { a: 1, b: 3, c: 1 }, INFANTIL: {} },
      pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
      gruposAtivos: ["POPULAR", "JURI"],
      criterio: "JURI",
    });
    expect(dados.ranking.map((r) => [r.candidatoId, r.posicao])).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 2],
      ["d", 4],
    ]);
    expect(dados.empates).toEqual([
      { posicoes: [1, 2, 3], candidatoIds: ["b", "a", "c"], criterioAplicado: "JURI", resolvido: false, vencedorId: "b" },
    ]);
    expect(conferirDadosResultado(dados)).toEqual([]);
  });

  it("desqualificado fica nos placares, fora da base, do ranking e das categorias", () => {
    const dados = apurar({
      candidatos: [
        { id: "a", ordem: 1, desqualificado: true },
        { id: "b", ordem: 2, desqualificado: false },
        { id: "c", ordem: 3, desqualificado: false },
      ],
      votos: { POPULAR: { a: 50, b: 30, c: 20 }, JURI: {}, INFANTIL: {} },
      pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
      gruposAtivos: ["POPULAR"],
      criterio: "PUBLICO",
    });
    expect(dados.totais.POPULAR).toBe(100);
    expect(dados.placares.POPULAR[0]).toEqual({ candidatoId: "a", votos: 50 });
    expect(dados.desqualificados).toEqual(["a"]);
    expect(dados.ranking.map((r) => [r.candidatoId, r.pontuacao])).toEqual([
      ["b", 60],
      ["c", 40],
    ]);
    expect(dados.categorias[0].vencedores).toEqual([{ candidatoId: "b", votos: 30 }]);
  });

  it("pontosPorGrupo somam a pontuação", () => {
    const dados = apurar(FIXTURES_APURACAO.find((f) => f.nome === "FESTIVAL_ENCERRADO")!.entrada);
    for (const r of dados.ranking) {
      expect(r.pontosPorGrupo.POPULAR + r.pontosPorGrupo.JURI + r.pontosPorGrupo.INFANTIL).toBeCloseTo(r.pontuacao, 6);
    }
  });
});
