import { describe, expect, it } from "vitest";
import { atalhoAtual, atalhosDoPapel } from "./navegacao";

describe("atalhos do cabeçalho", () => {
  it("admin: Dashboard, Configurações e Apresentação", () => {
    expect(atalhosDoPapel("fv", "ADMIN", true).map((a) => [a.rotulo, a.href])).toEqual([
      ["Dashboard", "/e/fv/admin"],
      ["Configurações", "/e/fv/admin/configuracao"],
      ["Apresentação", "/e/fv/admin/apresentar"],
    ]);
  });

  it("admin com votação infantil: Totens por último", () => {
    expect(atalhosDoPapel("fv", "ADMIN", true, { totens: true }).map((a) => [a.rotulo, a.href])).toEqual([
      ["Dashboard", "/e/fv/admin"],
      ["Configurações", "/e/fv/admin/configuracao"],
      ["Apresentação", "/e/fv/admin/apresentar"],
      ["Totens", "/e/fv/admin/totens"],
    ]);
    expect(atalhosDoPapel("fv", "PUBLICO", true, { totens: true }).map((a) => a.rotulo)).toEqual(["Votar"]);
  });

  it("público e jurado: Votar; visitante ou sem participação: nada", () => {
    for (const papel of ["PUBLICO", "JURADO"] as const) expect(atalhosDoPapel("fv", papel, true).map((a) => a.href)).toEqual(["/e/fv#candidatos"]);
    expect(atalhosDoPapel("fv", null, true)).toEqual([]);
  });

  it("página atual", () => {
    const [dashboard, config] = atalhosDoPapel("fv", "ADMIN", true);
    expect(atalhoAtual(dashboard, "/e/fv/admin")).toBe(true);
    expect(atalhoAtual(dashboard, "/e/fv/admin/configuracao")).toBe(false);
    expect(atalhoAtual(config, "/e/fv/admin/configuracao")).toBe(true);
    expect(atalhoAtual(config, "/e/fv/admin/configuracaox")).toBe(false);
  });
});

describe("atalho Votar", () => {
  it("é a página atual só na entrada do evento", () => {
    const [votar] = atalhosDoPapel("fv", "PUBLICO", true);
    expect(atalhoAtual(votar, "/e/fv")).toBe(true);
    expect(atalhoAtual(votar, "/e/fv/convite")).toBe(false);
  });
});

describe("Votar só com a votação aberta", () => {
  it("sem evento ativo e urna aberta, público e jurado ficam sem atalho", () => {
    for (const papel of ["PUBLICO", "JURADO"] as const) expect(atalhosDoPapel("fv", papel, false)).toEqual([]);
    expect(atalhosDoPapel("fv", "ADMIN", false)).toHaveLength(3);
  });
});

describe("Votar some depois do voto (25/11/2026)", () => {
  it("o público que já votou fica sem o atalho; o jurado segue com ele (pode trocar o voto)", () => {
    expect(atalhosDoPapel("fv", "PUBLICO", true, { jaVotou: true })).toEqual([]);
    expect(atalhosDoPapel("fv", "JURADO", true, { jaVotou: true }).map((a) => a.rotulo)).toEqual(["Votar"]);
    expect(atalhosDoPapel("fv", "PUBLICO", true, { jaVotou: false }).map((a) => a.rotulo)).toEqual(["Votar"]);
  });
});
