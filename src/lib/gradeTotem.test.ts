import { describe, expect, it } from "vitest";
import { arranjarGradeTotem, LARGURA_MINIMA_CARTAO_TOTEM, RAZAO_CARTAO_TOTEM } from "./gradeTotem";

const base = { espaco: 16, alturaTitulo: 32 };

/** Altura que a grade ocupa com o arranjo escolhido. */
function alturaOcupada(grupos: number[], colunas: number, largura: number) {
  const linhas = grupos.reduce((s, n) => s + Math.ceil(n / colunas), 0);
  const titulos = grupos.length > 1 ? grupos.length * (base.alturaTitulo + base.espaco) : 0;
  return titulos + linhas * largura * RAZAO_CARTAO_TOTEM + (linhas - 1) * base.espaco;
}

describe("arranjarGradeTotem", () => {
  it("tablet deitado com cinco filmes: uma linha só, limitada pela altura", () => {
    const r = arranjarGradeTotem({ ...base, largura: 1000, altura: 560, grupos: [5] });
    expect(r.colunas).toBe(5);
    expect(r.cabe).toBe(true);
    expect(alturaOcupada([5], r.colunas, r.larguraCartao)).toBeLessThanOrEqual(560);
    expect(r.colunas * r.larguraCartao + (r.colunas - 1) * base.espaco).toBeLessThanOrEqual(1000);
  });

  it("celular em pé com cinco filmes: duas colunas e cabe na altura", () => {
    const r = arranjarGradeTotem({ ...base, largura: 360, altura: 700, grupos: [5] });
    expect(r.colunas).toBeGreaterThanOrEqual(2);
    expect(alturaOcupada([5], r.colunas, r.larguraCartao)).toBeLessThanOrEqual(700);
    expect(r.colunas * r.larguraCartao + (r.colunas - 1) * base.espaco).toBeLessThanOrEqual(360);
  });

  it("duas categorias: conta os nomes e as linhas de cada uma", () => {
    const grupos = [4, 3];
    const r = arranjarGradeTotem({ ...base, largura: 1000, altura: 700, grupos });
    expect(alturaOcupada(grupos, r.colunas, r.larguraCartao)).toBeLessThanOrEqual(700);
    expect(r.larguraCartao).toBeGreaterThan(LARGURA_MINIMA_CARTAO_TOTEM);
  });

  it("área minúscula: não desce do mínimo (a área rola)", () => {
    const r = arranjarGradeTotem({ ...base, largura: 200, altura: 120, grupos: [12] });
    expect(r.larguraCartao).toBe(LARGURA_MINIMA_CARTAO_TOTEM);
    expect(r.cabe).toBe(false);
  });

  it("sem itens não quebra", () => {
    expect(arranjarGradeTotem({ ...base, largura: 800, altura: 600, grupos: [] }).colunas).toBe(1);
  });
});
