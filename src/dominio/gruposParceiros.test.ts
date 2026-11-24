import { describe, expect, it } from "vitest";
import { parceirosPorGrupo, validarGrupos } from "./gruposParceiros";
import { paragrafosDoSobre, temSobre, validarSobre } from "./sobreEvento";
import type { GrupoParceiro, Parceiro } from "./tipos";

const parceiro = (id: string, ordem: number): Parceiro => ({ id, eventoId: "e", nome: id, logoUrl: null, ordem });
const grupo = (id: string, ordem: number, parceiroIds: string[]): GrupoParceiro => ({ id, eventoId: "e", nome: id, ordem, parceiroIds });

describe("grupos de parceiros (C1)", () => {
  it("um bloco por grupo, na ordem dos grupos; parceiro em dois grupos aparece nos dois", () => {
    const ps = [parceiro("a", 1), parceiro("b", 2), parceiro("c", 3)];
    const blocos = parceirosPorGrupo([grupo("realizacao", 2, ["c", "a"]), grupo("patrocinio", 1, ["a", "b"])], ps);
    expect(blocos.map((b) => [b.grupo?.id, b.parceiros.map((p) => p.id)])).toEqual([
      ["patrocinio", ["a", "b"]],
      ["realizacao", ["a", "c"]],
    ]);
  });

  it("grupo vazio some; parceiro sem grupo vai num bloco final sem título", () => {
    const blocos = parceirosPorGrupo([grupo("vazio", 1, []), grupo("g", 2, ["a"])], [parceiro("a", 1), parceiro("solto", 2)]);
    expect(blocos.map((b) => [b.grupo?.id ?? null, b.parceiros.map((p) => p.id)])).toEqual([
      ["g", ["a"]],
      [null, ["solto"]],
    ]);
    expect(parceirosPorGrupo([grupo("g", 1, [])], [])).toEqual([]);
  });

  it("nome obrigatório, de 2 a 40 caracteres, sem repetir (sem diferença de maiúsculas)", () => {
    expect(validarGrupos(["Patrocínio", "Realização"])).toEqual({});
    expect(validarGrupos(["", "A", "x".repeat(41), "Apoio", "apoio "])).toEqual({
      "grupo-0": "Informe o nome do grupo.",
      "grupo-1": "Use de 2 a 40 caracteres.",
      "grupo-2": "Use de 2 a 40 caracteres.",
      "grupo-4": "Já existe um grupo com este nome.",
    });
    expect(validarGrupos(Array.from({ length: 11 }, (_, i) => `Grupo ${i}`)).grupos).toBeTruthy();
  });
});

describe("sobre o evento (C2)", () => {
  it("parágrafos pela linha em branco; quebra simples vira espaço", () => {
    expect(paragrafosDoSobre("Um\ncontinua\n\n\nDois\r\n\r\nTrês").map((p) => p.map((t) => t.texto).join(""))).toEqual(["Um continua", "Dois", "Três"]);
    expect(paragrafosDoSobre("   ")).toEqual([]);
    expect(paragrafosDoSobre(null)).toEqual([]);
  });

  it("**negrito** vira trecho em negrito; asterisco sem par fica como texto", () => {
    expect(paragrafosDoSobre("Para quem quer **Ver Filmes** e **Fazer Filmes**.")[0]).toEqual([
      { texto: "Para quem quer ", negrito: false },
      { texto: "Ver Filmes", negrito: true },
      { texto: " e ", negrito: false },
      { texto: "Fazer Filmes", negrito: true },
      { texto: ".", negrito: false },
    ]);
    expect(paragrafosDoSobre("a **b** c **d")[0]).toEqual([
      { texto: "a ", negrito: false },
      { texto: "b", negrito: true },
      { texto: " c **d", negrito: false },
    ]);
    expect(paragrafosDoSobre("<b>x</b>")[0]).toEqual([{ texto: "<b>x</b>", negrito: false }]);
  });

  it("aparece com título ou texto; só a imagem não basta", () => {
    expect(temSobre({ sobreTitulo: "T" })).toBe(true);
    expect(temSobre({ sobreTexto: "x" })).toBe(true);
    expect(temSobre({ sobreTitulo: " ", sobreTexto: null })).toBe(false);
  });

  it("limites de tamanho", () => {
    expect(validarSobre({ titulo: "x".repeat(121), texto: "x".repeat(3001) })).toEqual({
      sobreTitulo: "Use até 120 caracteres.",
      sobreTexto: "Use até 3000 caracteres.",
    });
    expect(validarSobre({ titulo: "", texto: "" })).toEqual({});
  });
});
