import { describe, expect, it } from "vitest";
import { criarGerador, embaralharComSemente, hashDeTexto } from "./aleatorio";

describe("aleatorio", () => {
  it("hashDeTexto é determinístico", () => {
    expect(hashDeTexto("usr-ana:evt-maratona-tech-tivit")).toBe(hashDeTexto("usr-ana:evt-maratona-tech-tivit"));
    expect(hashDeTexto("a")).not.toBe(hashDeTexto("b"));
  });

  it("criarGerador repete a sequência para a mesma semente e fica em [0, 1)", () => {
    const a = criarGerador("semente");
    const b = criarGerador("semente");
    for (let i = 0; i < 50; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("embaralharComSemente: mesma semente, mesma ordem; lista original intacta", () => {
    const lista = Array.from({ length: 20 }, (_, i) => i);
    const original = [...lista];
    const x = embaralharComSemente(lista, "usr-ana:evt-maratona-tech-tivit");
    const y = embaralharComSemente(lista, "usr-ana:evt-maratona-tech-tivit");
    expect(x).toEqual(y);
    expect(lista).toEqual(original);
    expect([...x].sort((p, q) => p - q)).toEqual(original);
    expect(embaralharComSemente(lista, "outra")).not.toEqual(x);
  });
});
