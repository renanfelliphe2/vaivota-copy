import { describe, expect, it } from "vitest";
import { categoriasDoCanal, itensDoCanal, nomeCategoriaUnica, validarCategorias } from "./categorias";
import { avaliarChecklist, contarCategoriasTotem, type EntradaChecklist } from "./checklistAtivacao";
import { itensDoTotem, validarCategoriasTotem } from "./totem";
import type { CanalCategoria } from "./tipos";

// Canal da categoria e categorias do totem (25/11/2026): cada categoria é votada na página do evento OU no totem, e cada totem
// exibe uma ou mais categorias do totem.

const cat = (id: string, canal: CanalCategoria) => ({ id, canal });
const item = (id: string, categoriaId: string | null) => ({ id, categoriaId });

const CATEGORIAS = [cat("pagina", "ONLINE"), cat("infantil", "TOTEM"), cat("escolas", "TOTEM")];
const ITENS = [item("a", "pagina"), item("b", "infantil"), item("c", "escolas"), item("d", "pagina"), item("e", null), item("f", "sumiu")];

describe("itensDoCanal", () => {
  it("a página vê só os itens das categorias ONLINE; o totem, só os das TOTEM", () => {
    expect(itensDoCanal(ITENS, CATEGORIAS, "ONLINE").map((i) => i.id)).toEqual(["a", "d"]);
    expect(itensDoCanal(ITENS, CATEGORIAS, "TOTEM").map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("item sem categoria ou numa categoria que não existe fica fora dos dois canais", () => {
    const todos = [...itensDoCanal(ITENS, CATEGORIAS, "ONLINE"), ...itensDoCanal(ITENS, CATEGORIAS, "TOTEM")].map((i) => i.id);
    expect(todos).not.toContain("e");
    expect(todos).not.toContain("f");
  });

  it("dado antigo sem nenhuma categoria: tudo é da página, nada do totem", () => {
    expect(itensDoCanal(ITENS, [], "ONLINE")).toHaveLength(ITENS.length);
    expect(itensDoCanal(ITENS, [], "TOTEM")).toEqual([]);
  });

  it("categoriasDoCanal mantém a ordem", () => {
    expect(categoriasDoCanal(CATEGORIAS, "TOTEM").map((c) => c.id)).toEqual(["infantil", "escolas"]);
  });
});

describe("itensDoTotem", () => {
  it("só as categorias que o totem exibe, na ordem das categorias", () => {
    expect(itensDoTotem(ITENS, CATEGORIAS, ["escolas", "infantil"]).map((i) => i.id)).toEqual(["b", "c"]);
    expect(itensDoTotem(ITENS, CATEGORIAS, ["escolas"]).map((i) => i.id)).toEqual(["c"]);
  });

  it("uma categoria que foi para a página some do totem, mesmo ainda ligada a ele", () => {
    expect(itensDoTotem(ITENS, CATEGORIAS, ["pagina", "infantil"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("totem sem categoria não mostra nada", () => {
    expect(itensDoTotem(ITENS, CATEGORIAS, [])).toEqual([]);
  });
});

describe("validarCategoriasTotem", () => {
  it("exige ao menos uma, e só categorias do totem", () => {
    expect(validarCategoriasTotem([], CATEGORIAS)).toMatch(/ao menos uma/);
    expect(validarCategoriasTotem(["pagina"], CATEGORIAS)).toMatch(/só categorias votadas no totem/);
    expect(validarCategoriasTotem(["inexistente"], CATEGORIAS)).not.toBeNull();
    expect(validarCategoriasTotem(["infantil", "escolas"], CATEGORIAS)).toBeNull();
  });
});

describe("categoria única", () => {
  it("evento novo nasce com Melhor <item>", () => {
    expect(nomeCategoriaUnica("Projeto")).toBe("Melhor Projeto");
    expect(nomeCategoriaUnica("Curta")).toBe("Melhor Curta");
    expect(nomeCategoriaUnica("  ")).toBe("Melhor Candidato");
  });

  it("a lista de categorias não pode ficar vazia", () => {
    expect(validarCategorias([])).toHaveProperty("categorias");
    expect(validarCategorias([{ nome: "Melhor Projeto", premio: "" }])).toEqual({});
  });
});

describe("checklist: categorias do totem", () => {
  const base: EntradaChecklist = {
    agoraMs: 0,
    qtdVotaveis: 4,
    pesos: { POPULAR: 70, JURI: 0, INFANTIL: 30 },
    moduloJuri: false,
    moduloInfantil: true,
    janelaInicioMs: 1,
    janelaFimMs: 10,
    convitesUtilizaveis: 0,
    temaAprovado: true,
    dispositivosAtivos: 1,
    trailerConfigurado: true,
    categorias: { total: 3, semItens: 0, itensSemCategoria: 0 },
  };
  const totem = (e: EntradaChecklist) => avaliarChecklist(e).find((i) => i.id === "TOTEM")!;

  it("conta as categorias do totem que nenhum totem ATIVO exibe", () => {
    const dispositivos = [
      { estado: "ATIVO", categoriaIds: ["infantil"] },
      { estado: "PAUSADO", categoriaIds: ["escolas"] },
    ];
    expect(contarCategoriasTotem(CATEGORIAS, dispositivos)).toEqual({ categorias: 2, semTotemAtivo: 1 });
    expect(contarCategoriasTotem(CATEGORIAS, [{ estado: "ATIVO", categoriaIds: ["infantil", "escolas"] }])).toEqual({ categorias: 2, semTotemAtivo: 0 });
  });

  it("avisa a categoria sem totem, o módulo desligado e o totem sem categoria; OK quando tudo é coberto", () => {
    expect(totem({ ...base, totem: { categorias: 2, semTotemAtivo: 1 } }).estado).toBe("AVISO");
    expect(totem({ ...base, moduloInfantil: false, totem: { categorias: 1, semTotemAtivo: 1 } }).estado).toBe("AVISO");
    expect(totem({ ...base, totem: { categorias: 0, semTotemAtivo: 0 } }).estado).toBe("AVISO");
    expect(totem({ ...base, totem: { categorias: 2, semTotemAtivo: 0 } }).estado).toBe("OK");
    expect(totem({ ...base, moduloInfantil: false }).estado).toBe("NAO_SE_APLICA");
  });
});
