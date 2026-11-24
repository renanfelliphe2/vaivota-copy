import { describe, expect, it } from "vitest";
import { filtrarPorTitulo, normalizarBusca } from "./busca";

const filmes = ["A Ação do Tempo", "Sertão", "Cidade Luz", "O tempo e o vento"];
const buscar = (termo: string) => filtrarPorTitulo(filmes, termo, (t) => t);

describe("busca pelo título (B1)", () => {
  it("ignora maiúsculas, acentos e espaços sobrando", () => {
    expect(normalizarBusca("  Ação   do  TEMPO ")).toBe("acao do tempo");
    expect(buscar("acao")).toEqual(["A Ação do Tempo"]);
    expect(buscar("SERTAO")).toEqual(["Sertão"]);
  });

  it("acha por trecho, na ordem original", () => {
    expect(buscar("tempo")).toEqual(["A Ação do Tempo", "O tempo e o vento"]);
  });

  it("termo vazio devolve todos; sem resultado devolve vazio", () => {
    expect(buscar("   ")).toEqual(filmes);
    expect(buscar("xyz")).toEqual([]);
  });
});
