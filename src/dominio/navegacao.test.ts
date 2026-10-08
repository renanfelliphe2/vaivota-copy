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
