import { describe, expect, it } from "vitest";
import { celulaCsv, montarCsv, neutralizarFormula } from "./csv";

describe("csv", () => {
  it("BOM, ponto e vírgula e CRLF", () => {
    const csv = montarCsv(["rotulo", "codigo", "validade"], [["Jurado 1", "K7M3-QX9P", ""]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toBe("﻿rotulo;codigo;validade\r\nJurado 1;K7M3-QX9P;\r\n");
  });

  it("aspas escapadas e células com separador", () => {
    expect(celulaCsv('Diz "oi"')).toBe('"Diz ""oi"""');
    expect(celulaCsv("a;b")).toBe('"a;b"');
    expect(celulaCsv("linha\nnova")).toBe('"linha\nnova"');
    expect(celulaCsv(null)).toBe("");
    expect(celulaCsv(-3)).toBe("-3");
  });

  it("neutraliza fórmulas em texto", () => {
    for (const perigoso of ["=SOMA(A1)", "+1", "-1", "@cmd"]) expect(neutralizarFormula(perigoso)).toBe(`'${perigoso}`);
    expect(neutralizarFormula("Jurado")).toBe("Jurado");
    expect(celulaCsv("=1+1")).toBe("'=1+1");
  });
});
