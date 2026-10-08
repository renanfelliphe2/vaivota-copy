import { describe, expect, it } from "vitest";
import { criarGerador } from "./aleatorio";
import {
  ALFABETO_CODIGO,
  formatarCodigo,
  gerarCodigo,
  limparCodigoDigitado,
  normalizarCodigo,
  validarFormatoCodigo,
} from "./codigos";

describe("codigos", () => {
  it("normalizarCodigo ignora caixa, espaço e hífen", () => {
    expect(normalizarCodigo("k7m3 qx9p")).toBe("K7M3QX9P");
    expect(normalizarCodigo("K7M3-QX9P")).toBe("K7M3QX9P");
  });

  it("formatarCodigo", () => {
    expect(formatarCodigo("k7m3qx9p")).toBe("K7M3-QX9P");
    expect(formatarCodigo("K7M")).toBe("K7M");
    expect(formatarCodigo("K7M3Q")).toBe("K7M3-Q");
  });

  it("validarFormatoCodigo", () => {
    expect(validarFormatoCodigo("K7M3-QX9P")).toBe(true);
    expect(validarFormatoCodigo("k7m3qx9p")).toBe(true);
    expect(validarFormatoCodigo("K7M3-QX9")).toBe(false);
    expect(validarFormatoCodigo("O0I1-L234")).toBe(false); // ambíguos
  });

  it("limparCodigoDigitado descarta ambíguos e limita o tamanho", () => {
    expect(limparCodigoDigitado("k7m3-qx9p-extra")).toBe("K7M3QX9P");
    expect(limparCodigoDigitado("O0I1L")).toBe("");
  });

  it("gerarCodigo usa só o alfabeto e é repetível com a mesma semente", () => {
    const a = gerarCodigo(criarGerador(42));
    const b = gerarCodigo(criarGerador(42));
    expect(a).toBe(b);
    expect(a).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect([...normalizarCodigo(a)].every((c) => ALFABETO_CODIGO.includes(c))).toBe(true);
  });
});
