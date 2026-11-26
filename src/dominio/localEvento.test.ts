import { describe, expect, it } from "vitest";
import { partesDoLocal } from "./localEvento";

describe("partesDoLocal", () => {
  it("separa o lugar do endereço e monta a busca do mapa com tudo", () => {
    const p = partesDoLocal("Anfiteatro Ivan Muller Botelho · Av. Astolfo Dutra, 41 – Centro · Cataguases (MG)");
    expect(p).toEqual({
      lugar: "Anfiteatro Ivan Muller Botelho",
      endereco: "Av. Astolfo Dutra, 41 – Centro · Cataguases (MG)",
      completo: "Anfiteatro Ivan Muller Botelho · Av. Astolfo Dutra, 41 – Centro · Cataguases (MG)",
      mapaUrl:
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent("Anfiteatro Ivan Muller Botelho, Av. Astolfo Dutra, 41 – Centro, Cataguases (MG)"),
    });
  });

  it("uma parte só: é o lugar, sem endereço", () => {
    expect(partesDoLocal("  Teatro Municipal ")).toMatchObject({ lugar: "Teatro Municipal", endereco: null, completo: "Teatro Municipal" });
  });

  it("vazio ou nulo: sem local", () => {
    expect(partesDoLocal(null)).toBeNull();
    expect(partesDoLocal(undefined)).toBeNull();
    expect(partesDoLocal("   ")).toBeNull();
    expect(partesDoLocal(" · ")).toBeNull();
  });

  it("o ponto do meio sem espaços não separa (pode fazer parte de um nome)", () => {
    expect(partesDoLocal("Sala·1")).toMatchObject({ lugar: "Sala·1", endereco: null });
  });
});
