import { describe, expect, it } from "vitest";
import { contar, formatarDecimal, formatarNumero, formatarPercentual } from "./formatar";

describe("formatar", () => {
  it("números em pt-BR", () => {
    expect(formatarNumero(1234567)).toBe("1.234.567");
    expect(formatarDecimal(3.14159)).toBe("3,14");
    expect(formatarPercentual(62.5)).toBe("62,5%");
    expect(formatarPercentual(70)).toBe("70%");
  });

  it("contar", () => {
    expect(contar(1, "voto", "votos")).toBe("1 voto");
    expect(contar(1200, "voto", "votos")).toBe("1.200 votos");
  });
});
