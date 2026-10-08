import { describe, expect, it } from "vitest";
import { redistribuirPesos, somaPesos } from "./placar";

describe("redistribuirPesos", () => {
  it("desligar o júri zera o peso e mantém a soma em 100", () => {
    const r = redistribuirPesos({ POPULAR: 70, JURI: 30, INFANTIL: 0 }, { POPULAR: true, JURI: false, INFANTIL: false });
    expect(r).toEqual({ POPULAR: 100, JURI: 0, INFANTIL: 0 });
  });

  it("redistribui proporcionalmente com inteiros", () => {
    const r = redistribuirPesos({ POPULAR: 50, JURI: 30, INFANTIL: 20 }, { POPULAR: true, JURI: true, INFANTIL: false });
    expect(r.INFANTIL).toBe(0);
    expect(somaPesos(r)).toBe(100);
    expect(r).toEqual({ POPULAR: 63, JURI: 37, INFANTIL: 0 }); // 62,5 / 37,5
  });

  it("ligar um módulo mantém o peso dele (0) e a soma", () => {
    const r = redistribuirPesos({ POPULAR: 70, JURI: 30, INFANTIL: 0 }, { POPULAR: true, JURI: true, INFANTIL: true });
    expect(r).toEqual({ POPULAR: 70, JURI: 30, INFANTIL: 0 });
  });

  it("soma sempre 100 em casos com resto", () => {
    const r = redistribuirPesos({ POPULAR: 33, JURI: 33, INFANTIL: 34 }, { POPULAR: true, JURI: true, INFANTIL: false });
    expect(somaPesos(r)).toBe(100);
  });

  it("divide igualmente quando os ligados somam 0", () => {
    const r = redistribuirPesos({ POPULAR: 0, JURI: 0, INFANTIL: 100 }, { POPULAR: true, JURI: true, INFANTIL: false });
    expect(r).toEqual({ POPULAR: 50, JURI: 50, INFANTIL: 0 });
  });
});
