import { describe, expect, it } from "vitest";
import { paraInstante } from "@/lib/tempo";
import { arquivosDisponiveis, nomeArquivoCsv, numeroCsv, redigirEmails, redigirLinhas } from "./exportacao";
import { montarSerie, passoDaSerie } from "./serie";

const AMBOS = { juri: true, infantil: true };

function disponiveis(...args: Parameters<typeof arquivosDisponiveis>) {
  return arquivosDisponiveis(...args)
    .filter((a) => a.disponivel)
    .map((a) => a.id)
    .sort();
}

describe("arquivosDisponiveis (5.1)", () => {
  it("rascunho: só auditoria (C11)", () => {
    expect(disponiveis("RASCUNHO", false, AMBOS)).toEqual(["auditoria"]);
  });

  it("não iniciada e aberta: só os de operação", () => {
    for (const fase of ["ATIVO_NAO_INICIADA", "URNA_ABERTA"] as const)
      expect(disponiveis(fase, false, AMBOS)).toEqual(["auditoria", "dispositivos", "votos_por_minuto"]);
  });

  it("encerrada e concluído com resultado: todos", () => {
    for (const fase of ["URNA_ENCERRADA", "CONCLUIDO"] as const) expect(disponiveis(fase, true, AMBOS)).toHaveLength(6);
  });

  it("sem versão calculada: arquivos de resultado com o motivo", () => {
    const lista = arquivosDisponiveis("CONCLUIDO", false, AMBOS);
    expect(lista.find((a) => a.id === "resumo_evento")).toMatchObject({ disponivel: false, motivo: "O resultado oficial ainda não foi calculado" });
  });

  it("módulo desligado some da lista", () => {
    const ids = arquivosDisponiveis("URNA_ENCERRADA", true, { juri: false, infantil: false }).map((a) => a.id);
    expect(ids).not.toContain("jurados");
    expect(ids).not.toContain("dispositivos");
  });
});

describe("redigirEmails", () => {
  it("troca e-mails por [e-mail omitido]", () => {
    expect(redigirEmails("Jurado ana@x.com.br e b.c@d.io")).toBe("Jurado [e-mail omitido] e [e-mail omitido]");
    expect(redigirEmails("sem arroba")).toBe("sem arroba");
    expect(redigirLinhas([["x@y.com", 3, null]])).toEqual([["[e-mail omitido]", 3, null]]);
  });
});

describe("formato", () => {
  it("vírgula decimal sem milhar e nome do arquivo", () => {
    expect(numeroCsv(1234.5)).toBe("1234,50");
    expect(numeroCsv(28.6182)).toBe("28,62");
    expect(nomeArquivoCsv("maratona-tech-tivit", "auditoria", "2026-10-22T14:00:00-03:00")).toBe("maratona-tech-tivit-auditoria-20261022.csv");
  });
});

describe("montarSerie (D13)", () => {
  const fuso = (ms: number) => paraInstante(ms);
  const aberta = "2026-10-22T13:00:00-03:00";
  const inicio = Date.parse(aberta);

  it("passo adaptativo", () => {
    expect(passoDaSerie(60 * 60_000)).toBe(1);
    expect(passoDaSerie(181 * 60_000)).toBe(10);
    expect(passoDaSerie(25 * 3_600_000)).toBe(60);
  });

  it("60 pontos de 1 minuto, pico no primeiro máximo e voto no fim cai no último balde", () => {
    const serie = montarSerie({
      abertaEm: aberta,
      ateMs: inicio + 60 * 60_000,
      votos: {
        popular: ["2026-10-22T13:40:10-03:00", "2026-10-22T13:40:50-03:00", "2026-10-22T14:00:00-03:00"],
        juri: ["2026-10-22T13:05:00-03:00"],
        infantil: [],
      },
      paraInstante: fuso,
    });
    expect(serie.pontos).toHaveLength(60);
    expect(serie.pico).toEqual({ inicio: "2026-10-22T13:40:00-03:00", votos: 2 });
    expect(serie.pontos[59].popular).toBe(1);
    expect(serie.pontos.reduce((s, p) => s + p.popular + p.juri, 0)).toBe(4);
  });

  it("urna que nunca abriu: série vazia", () => {
    expect(montarSerie({ abertaEm: null, ateMs: inicio, votos: { popular: [], juri: [], infantil: [] }, paraInstante: fuso }).pontos).toEqual([]);
  });
});
