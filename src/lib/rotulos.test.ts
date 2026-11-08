import { describe, expect, it } from "vitest";
import { dividirNome, dividirTitulo } from "./rotulos";

describe("dividirTitulo (estilo cinema)", () => {
  it("a edição vira a chamada e o resto, o título", () => {
    expect(dividirTitulo("9º Festival Ver e Fazer Filmes")).toEqual({ chamada: "9º Festival", principal: "Ver e Fazer Filmes" });
    expect(dividirTitulo("  10ª   Mostra de Curtas ")).toEqual({ chamada: "10ª Mostra", principal: "de Curtas" });
  });

  it("sem número de edição no começo, o nome fica inteiro", () => {
    expect(dividirTitulo("Maratona Tech Tivit")).toEqual({ chamada: null, principal: "Maratona Tech Tivit" });
    expect(dividirTitulo("Festival de 2026")).toEqual({ chamada: null, principal: "Festival de 2026" });
  });

  it("só a edição, sem nome depois: não sobra título vazio", () => {
    expect(dividirTitulo("9º Festival")).toEqual({ chamada: null, principal: "9º Festival" });
  });
});

describe("dividirNome", () => {
  it("a primeira palavra e o resto", () => {
    expect(dividirNome("Maratona Tech Tivit")).toEqual({ primeira: "Maratona", resto: "Tech Tivit" });
    expect(dividirNome("Bienal")).toEqual({ primeira: "Bienal", resto: null });
  });
});
