import { describe, expect, it } from "vitest";
import { cabeNaLinha, copiasDoCarrossel, normalizarPosicao } from "./carrossel";

describe("carrossel infinito (B1)", () => {
  it("cabe quando a soma das larguras e dos espaços não passa da área", () => {
    expect(cabeNaLinha(5, 200, 20, 1080)).toBe(true); // 1000 + 80
    expect(cabeNaLinha(6, 200, 20, 1080)).toBe(false);
    expect(cabeNaLinha(0, 200, 20, 10)).toBe(true);
  });

  it("cópias: ímpar, ao menos três, mais quando a lista é pouco maior que a tela", () => {
    expect(copiasDoCarrossel(1000, 5000)).toBe(3);
    expect(copiasDoCarrossel(1000, 1100)).toBe(5);
    expect(copiasDoCarrossel(1000, 0)).toBe(1);
  });

  it("normaliza para meia cópia em volta da cópia do meio, sem mudar a imagem", () => {
    const P = 1000;
    const copias = 3; // centro em 1000
    expect(normalizarPosicao(1000, P, copias)).toBe(1000);
    expect(normalizarPosicao(1600, P, copias)).toBe(600 + 0); // 1600 ≡ 600 (dentro de [500, 1500))
    expect(normalizarPosicao(300, P, copias)).toBe(1300);
    expect(normalizarPosicao(2499, P, copias)).toBe(1499);
    for (const s of [0, 123, 999, 1777, 2600]) {
      const n = normalizarPosicao(s, P, copias);
      expect(n).toBeGreaterThanOrEqual(500);
      expect(n).toBeLessThan(1500);
      expect((((n - s) % P) + P) % P).toBeCloseTo(0);
    }
  });

  it("com as cópias calculadas, sobra uma tela de cada lado depois de normalizar", () => {
    for (const [W, P] of [
      [1000, 1010],
      [1000, 1590],
      [1000, 1700],
      [400, 5000],
    ]) {
      const copias = copiasDoCarrossel(W, P);
      for (const s of [0, P / 3, P, 2.7 * P]) {
        const n = normalizarPosicao(s, P, copias);
        expect(n - 0.8 * W).toBeGreaterThanOrEqual(0);
        expect(n + 0.8 * W + W).toBeLessThanOrEqual(copias * P);
      }
    }
  });
});
