import { describe, expect, it } from "vitest";
import {
  estatisticaIntervalos,
  formatarDuracao,
  funilVazio,
  lerFunil,
  percentualEsperadas,
  resumirSessoes,
  totalDeErros,
  variacaoPercentual,
  votosPorFaixa,
} from "./sessaoTotem";

const s = (segundos: number) => segundos * 1000;

describe("intervalos entre votos", () => {
  it("menos de 2 votos não tem intervalo", () => {
    expect(estatisticaIntervalos([])).toBeNull();
    expect(estatisticaIntervalos([s(10)])).toBeNull();
  });

  it("mediana, média, extremos e faixas, em qualquer ordem", () => {
    // intervalos: 3, 10, 20, 100, 400
    const e = estatisticaIntervalos([s(533), s(0), s(3), s(13), s(33), s(133)])!;
    expect(e).toMatchObject({ quantidade: 5, medianaS: 20, mediaS: 106.6, menorS: 3, maiorS: 400 });
    expect(e.faixas).toEqual({ ate5s: 1, de5a15s: 1, de15a60s: 1, de1a5min: 1, mais5min: 1 });
  });

  it("mediana de quantidade par é a média dos dois do meio", () => {
    expect(estatisticaIntervalos([0, s(10), s(30), s(60), s(100)])!.medianaS).toBe(25);
  });
});

describe("comparações", () => {
  it("variação sobre a sessão anterior", () => {
    expect(variacaoPercentual(110, 100)).toBe(10);
    expect(variacaoPercentual(1, 3)).toBe(-66.7);
    expect(variacaoPercentual(5, 0)).toBeNull();
    expect(variacaoPercentual(5, null)).toBeNull();
  });

  it("percentual das crianças esperadas", () => {
    expect(percentualEsperadas(96, 144)).toBe(66.7);
    expect(percentualEsperadas(10, null)).toBeNull();
  });
});

describe("votos por faixa de 10 min", () => {
  it("inclui as faixas vazias entre o primeiro e o último voto", () => {
    const base = Date.UTC(2026, 10, 26, 12, 30);
    const faixas = votosPorFaixa([base + 60_000, base + 2 * 60_000, base + 25 * 60_000]);
    expect(faixas.map((f) => f.votos)).toEqual([2, 0, 1]);
    expect(faixas[0]!.inicioMs).toBe(base);
  });

  it("sem votos, sem faixas", () => {
    expect(votosPorFaixa([])).toEqual([]);
  });
});

describe("funil", () => {
  it("lerFunil aceita só números e códigos de erro válidos", () => {
    expect(lerFunil(null)).toBeNull();
    const f = lerFunil({ comecou: 10, escolheu: "x", registrado: -1, erros: { REDE: 2, "<script>": 3, ZERO: 0 } })!;
    expect(f).toEqual({ ...funilVazio(), comecou: 10, erros: { REDE: 2 } });
    expect(totalDeErros({ ...funilVazio(), erros: { REDE: 2, ERRO_INTERNO: 1 } })).toBe(3);
  });
});

describe("resumo das sessões", () => {
  it("votos antes, variação sobre a anterior e mais nova primeiro", () => {
    const d = (min: number) => new Date(Date.UTC(2026, 10, 26, 12, min));
    const sessoes = [
      { id: "s2", numero: 2, abertaEm: d(30), encerradaEm: null, motivo: null, criancasEsperadas: 4, funil: null, funilEm: null },
      { id: "s1", numero: 1, abertaEm: d(0), encerradaEm: d(10), motivo: "MANUAL" as const, criancasEsperadas: null, funil: { comecou: 3 }, funilEm: d(9) },
    ];
    const votos = new Map([
      ["s1", [d(1).getTime(), d(2).getTime()]],
      ["s2", [d(31).getTime(), d(32).getTime(), d(33).getTime()]],
    ]);
    const [atual, anterior] = resumirSessoes(sessoes, votos, 5);
    expect(anterior).toMatchObject({ numero: 1, votos: 2, votosAntes: 5, variacaoAnterior: null, motivo: "MANUAL" });
    expect(anterior!.funil?.comecou).toBe(3);
    expect(atual).toMatchObject({ numero: 2, votos: 3, votosAntes: 7, variacaoAnterior: 50, percentualEsperadas: 75, encerradaEm: null });
    expect(atual!.intervalos?.medianaS).toBe(60);
  });
});

describe("duração", () => {
  it("formata segundos, minutos e horas", () => {
    expect(formatarDuracao(45)).toBe("45 s");
    expect(formatarDuracao(12 * 60)).toBe("12 min");
    expect(formatarDuracao(65 * 60)).toBe("1 h 05 min");
    expect(formatarDuracao(120 * 60)).toBe("2 h");
  });
});
