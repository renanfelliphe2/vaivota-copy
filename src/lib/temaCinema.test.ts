import { describe, expect, it } from "vitest";
import { misturar, razaoContraste } from "./contraste";
import { calcularTokens, pontoMaisClaroDaSala, tokensCinema } from "./tema";

// Estilo cinema da página do evento (07/11/2026): o texto sobre a sala escura e sobre o papel dos cartazes passa de
// 4,5:1 com o tema do Festival e com temas de cores escuras ou claras demais.

const TEMAS = {
  festival: { corPrimaria: "#F15A29", corSecundaria: "#8DC63F", corFundo: "#FFFFFF", corTexto: "#18181B", fonte: "Inter" },
  marinho: { corPrimaria: "#054573", corSecundaria: "#FBAA38", corFundo: "#FFFFFF", corTexto: "#0B1F33", fonte: "Inter" },
  vinho: { corPrimaria: "#6B0F1A", corSecundaria: "#1B3A4B", corFundo: "#FFFFFF", corTexto: "#111111", fonte: "Inter" },
  claro: { corPrimaria: "#FFE066", corSecundaria: "#B5F0FF", corFundo: "#FFFFFF", corTexto: "#222222", fonte: "Inter" },
};

describe("tokensCinema", () => {
  for (const [nome, tema] of Object.entries(TEMAS)) {
    it(`${nome}: as cores claras passam de 4,5:1 no ponto mais claro da sala`, () => {
      const fundo = pontoMaisClaroDaSala(tema.corPrimaria);
      const cores = tokensCinema(tema);
      expect(razaoContraste(cores["--cine-primaria-clara"], fundo)).toBeGreaterThanOrEqual(4.5);
      expect(razaoContraste(cores["--cine-secundaria-clara"], fundo)).toBeGreaterThanOrEqual(4.5);
      // Texto branco: na sala (sem luz) e no ponto mais claro.
      expect(razaoContraste("#ffffff", misturar("#0a0807", tema.corPrimaria, 0.09))).toBeGreaterThanOrEqual(15);
      expect(razaoContraste("#ffffff", fundo)).toBeGreaterThanOrEqual(7);
    });

    it(`${nome}: o texto do tema passa de 4,5:1 no papel dos cartazes`, () => {
      const t = calcularTokens(tema).variaveis;
      const papel = misturar(t["--tema-fundo"], t["--tema-primaria"], 0.05);
      expect(razaoContraste(t["--tema-texto"], papel)).toBeGreaterThanOrEqual(4.5);
      expect(razaoContraste(t["--tema-texto-suave"], papel)).toBeGreaterThanOrEqual(4.5);
      expect(razaoContraste(t["--tema-primaria-texto"], papel)).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("as cores do Festival clareiam pouco: o laranja continua laranja e o verde, verde", () => {
    const cores = tokensCinema(TEMAS.festival);
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const [r, g, b] = rgb(cores["--cine-primaria-clara"]);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(b).toBeLessThan(140);
    const [rv, gv, bv] = rgb(cores["--cine-secundaria-clara"]);
    expect(gv).toBeGreaterThan(rv);
    expect(rv).toBeGreaterThan(bv);
    expect(bv).toBeLessThan(120);
  });
});
