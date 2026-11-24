import { describe, expect, it } from "vitest";
import { modoVotoCategoria } from "./modoVotoCategoria";

const base = { urnaAberta: true, logado: true, emailVerificado: true, papel: "PUBLICO" as const, soTotem: false, votou: false };

describe("modo de voto da categoria", () => {
  it("público com a urna aberta escolhe; depois do voto, já votou", () => {
    expect(modoVotoCategoria(base)).toBe("ESCOLHA");
    expect(modoVotoCategoria({ ...base, votou: true })).toBe("JA_VOTOU");
  });

  it("categoria do totem e urna fechada: só leitura, para todos", () => {
    expect(modoVotoCategoria({ ...base, soTotem: true })).toBe("LEITURA");
    expect(modoVotoCategoria({ ...base, logado: false, soTotem: true })).toBe("LEITURA");
    expect(modoVotoCategoria({ ...base, urnaAberta: false })).toBe("LEITURA");
  });

  it("visitante, sem e-mail verificado, sem participação, admin e jurado", () => {
    expect(modoVotoCategoria({ ...base, logado: false, papel: null })).toBe("VISITANTE");
    expect(modoVotoCategoria({ ...base, emailVerificado: false })).toBe("VISITANTE");
    expect(modoVotoCategoria({ ...base, papel: null })).toBe("AGUARDANDO");
    expect(modoVotoCategoria({ ...base, papel: "ADMIN" })).toBe("LEITURA");
    expect(modoVotoCategoria({ ...base, papel: "JURADO" })).toBe("LEITURA");
  });
});
