import { describe, expect, it } from "vitest";
import { corLegivelSobre, corTextoSobre, razaoContraste } from "./contraste";
import { calcularTokens, paresDeContraste } from "./tema";

// Cores dos dois temas seed (cópia local para o teste; o seed é a fonte).
const festival = { corPrimaria: "#F15A29", corSecundaria: "#8DC63F", corFundo: "#FFFFFF", corTexto: "#18181B", fonte: "Inter" };
const maratonaTechTIVIT = {
  corPrimaria: "#38BDF8",
  corSecundaria: "#A78BFA",
  corFundo: "#0F172A",
  corTexto: "#E2E8F0",
  fonte: "Space Grotesk",
};

describe("razaoContraste", () => {
  it("preto × branco = 21:1 e cor consigo = 1:1", () => {
    expect(razaoContraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(razaoContraste("#F15A29", "#F15A29")).toBeCloseTo(1, 5);
  });

  it("laranja do Festival: branco ≈ 3,4:1, texto escuro ≈ 5,3:1", () => {
    expect(razaoContraste("#ffffff", "#F15A29")).toBeCloseTo(3.37, 1);
    expect(razaoContraste("#18181B", "#F15A29")).toBeCloseTo(5.27, 1);
  });
});

describe("corTextoSobre", () => {
  it("Festival: texto escuro sobre o laranja (D15, rev. 4 E1)", () => {
    const sobre = corTextoSobre(festival.corPrimaria, [festival.corFundo, festival.corTexto]);
    expect(sobre).toBe(festival.corTexto);
    expect(razaoContraste(sobre, festival.corPrimaria)).toBeGreaterThanOrEqual(4.5);
  });

  it("Maratona Tech Tivit: texto escuro sobre o azul-claro", () => {
    const sobre = corTextoSobre(maratonaTechTIVIT.corPrimaria, [maratonaTechTIVIT.corFundo, maratonaTechTIVIT.corTexto]);
    expect(sobre).toBe(maratonaTechTIVIT.corFundo);
    expect(razaoContraste(sobre, maratonaTechTIVIT.corPrimaria)).toBeGreaterThanOrEqual(4.5);
  });

  it("cai para branco ou preto quando as candidatas não bastam", () => {
    expect(corTextoSobre("#777777", ["#888888"])).toMatch(/^#(000000|ffffff)$/);
  });
});

describe("corLegivelSobre", () => {
  it("sempre atinge 4,5:1", () => {
    const casos: [string, string, string][] = [
      ["#8DC63F", "#FFFFFF", "#18181B"],
      ["#F15A29", "#FFFFFF", "#18181B"],
      ["#38BDF8", "#0F172A", "#E2E8F0"],
      ["#A78BFA", "#0F172A", "#E2E8F0"],
      ["#FFFF00", "#FFFFFF", "#000000"],
    ];
    for (const [cor, fundo, texto] of casos) {
      expect(razaoContraste(corLegivelSobre(cor, fundo, texto), fundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("verde do Festival é ajustado quando vira texto", () => {
    expect(corLegivelSobre("#8DC63F", "#FFFFFF", "#18181B").toLowerCase()).not.toBe("#8dc63f");
  });
});

describe("calcularTokens", () => {
  it.each([
    ["Festival", festival],
    ["Maratona Tech Tivit", maratonaTechTIVIT],
  ])("%s: todos os pares atendem a política", (_, tema) => {
    const tokens = calcularTokens(tema);
    for (const p of paresDeContraste(tokens)) {
      expect(p.razao, p.par).toBeGreaterThanOrEqual(p.minimo);
    }
  });

  it("esquema de cor segue o fundo", () => {
    expect(calcularTokens(festival).esquemaCor).toBe("light");
    expect(calcularTokens(maratonaTechTIVIT).esquemaCor).toBe("dark");
  });

  it("fonte vira variável CSS", () => {
    expect(calcularTokens(maratonaTechTIVIT).variaveis["--tema-fonte"]).toContain("--fonte-space-grotesk");
  });
});
