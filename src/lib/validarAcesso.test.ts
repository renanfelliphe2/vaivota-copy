import { describe, expect, it } from "vitest";
import { limparCodigoLogin, normalizarEmail, validarCodigoLogin, validarEmail, validarNome } from "./validarAcesso";

describe("validarAcesso", () => {
  it("e-mail", () => {
    expect(validarEmail("publico@demo.com")).toBeNull();
    expect(validarEmail("  publico@demo.com ")).toBeNull();
    expect(validarEmail("")).toBe("Informe seu e-mail.");
    expect(validarEmail("publico@demo")).not.toBeNull();
    expect(validarEmail("publico demo@x.com")).not.toBeNull();
  });

  it("normalizarEmail", () => {
    expect(normalizarEmail("  Publico@Demo.COM ")).toBe("publico@demo.com");
  });

  it("nome", () => {
    expect(validarNome("Ana")).toBeNull();
    expect(validarNome("  ")).toBe("Informe seu nome.");
    expect(validarNome("A")).not.toBeNull();
    expect(validarNome("x".repeat(121))).not.toBeNull();
  });

  it("código de login: 6 dígitos", () => {
    expect(validarCodigoLogin("123456")).toBeNull();
    expect(validarCodigoLogin("12345")).not.toBeNull();
    expect(validarCodigoLogin("12a456")).not.toBeNull();
    expect(limparCodigoLogin("12-34 56 78")).toBe("123456");
  });
});
