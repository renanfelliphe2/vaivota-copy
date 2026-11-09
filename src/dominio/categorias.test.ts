import { describe, expect, it } from "vitest";
import { apurarComCategorias } from "./apuracao";
import { categoriaApresentada, categoriasDoEvento, gerarSlugCategoria, rotaCategoria, validarCategorias, votouNaCategoria } from "./categorias";
import { avaliarChecklist, contarCategorias, type EntradaChecklist } from "./checklistAtivacao";
import { visaoDaCategoria, type ResultadoVisao } from "./painel";
import { planilhaResultadoCandidatos } from "./exportacao";
import type { Categoria } from "./tipos";
import { idsDosVencedoresPorCategoria } from "./votacoesEncerradas";

// Categorias do evento (09/11/2026, organograma do Festival Ver e Fazer Filmes).

describe("gerarSlugCategoria", () => {
  it("tira acentos e símbolos e usa hífen", () => {
    expect(gerarSlugCategoria("Mostra Infantil", [])).toBe("mostra-infantil");
    expect(gerarSlugCategoria("Vídeo-escola", [])).toBe("video-escola");
    expect(gerarSlugCategoria("  Usina Criativa de Cinema!  ", [])).toBe("usina-criativa-de-cinema");
    expect(gerarSlugCategoria("???", [])).toBe("categoria");
  });

  it("acrescenta um número quando o endereço já existe", () => {
    expect(gerarSlugCategoria("Mostra", ["mostra"])).toBe("mostra-2");
    expect(gerarSlugCategoria("Mostra", ["mostra", "mostra-2"])).toBe("mostra-3");
  });

  it("nunca passa do limite de 40 caracteres, mesmo com o sufixo", () => {
    const slug = gerarSlugCategoria("Uma categoria com um nome muito, muito comprido demais", []);
    expect(slug.length).toBeLessThanOrEqual(37);
    expect(gerarSlugCategoria("Uma categoria com um nome muito, muito comprido demais", [slug]).length).toBeLessThanOrEqual(40);
  });
});

describe("validarCategorias", () => {
  const ok = { nome: "Mostra Infantil", premio: "Melhor filme", slug: "mostra-infantil" };

  it("aceita a lista do Festival", () => {
    expect(
      validarCategorias([
        ok,
        { nome: "Vídeo-escola", premio: "Melhor filme Júri Popular", slug: "video-escola" },
        { nome: "Usina Criativa de Cinema", premio: "", slug: "usina-criativa" },
      ]),
    ).toEqual({});
  });

  it("aponta nome vazio, curto ou repetido (sem diferenciar maiúsculas)", () => {
    expect(validarCategorias([{ ...ok, nome: " " }])).toHaveProperty("nome-0");
    expect(validarCategorias([{ ...ok, nome: "A" }])).toHaveProperty("nome-0");
    expect(validarCategorias([ok, { ...ok, nome: "MOSTRA INFANTIL", slug: "outra" }])).toHaveProperty("nome-1");
  });

  it("aponta endereço vazio, com espaço ou maiúscula, e repetido", () => {
    expect(validarCategorias([{ ...ok, slug: "" }])).toHaveProperty("slug-0");
    expect(validarCategorias([{ ...ok, slug: "Mostra Infantil" }])).toHaveProperty("slug-0");
    expect(validarCategorias([{ ...ok, slug: "-mostra" }])).toHaveProperty("slug-0");
    expect(validarCategorias([ok, { ...ok, nome: "Outra", slug: "mostra-infantil" }])).toHaveProperty("slug-1");
  });

  it("prêmio é opcional, com limite de tamanho", () => {
    expect(validarCategorias([{ ...ok, premio: "" }])).toEqual({});
    expect(validarCategorias([{ ...ok, premio: "x".repeat(61) }])).toHaveProperty("premio-0");
  });
});

const cat = (id: string, ordem: number, eventoId = "e1"): Categoria => ({ id, eventoId, slug: id, nome: `Categoria ${id}`, premio: null, ordem });

describe("auxiliares", () => {
  it("categoriasDoEvento ordena e filtra pelo evento", () => {
    expect(categoriasDoEvento([cat("b", 2), cat("a", 1), cat("x", 0, "e2")], "e1").map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("rotaCategoria e votouNaCategoria", () => {
    expect(rotaCategoria("ver-e-fazer-filmes", "mostra-infantil")).toBe("/e/ver-e-fazer-filmes/categoria/mostra-infantil");
    expect(votouNaCategoria({ categoriasVotadas: ["a"] }, "a")).toBe(true);
    expect(votouNaCategoria({ categoriasVotadas: ["a"] }, "b")).toBe(false);
    expect(votouNaCategoria({}, "a")).toBe(false);
    expect(votouNaCategoria(null, "a")).toBe(false);
  });

  it("categoriaApresentada: a escolhida se existe, senão a primeira; null sem categorias", () => {
    const lista = [cat("a", 1), cat("b", 2)];
    expect(categoriaApresentada("b", lista)).toBe("b");
    expect(categoriaApresentada("sumiu", lista)).toBe("a");
    expect(categoriaApresentada(null, lista)).toBe("a");
    expect(categoriaApresentada("a", [])).toBeNull();
  });
});

describe("checklist das categorias", () => {
  const base: EntradaChecklist = {
    agoraMs: 0,
    qtdVotaveis: 4,
    pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
    moduloJuri: false,
    moduloInfantil: false,
    janelaInicioMs: 1,
    janelaFimMs: 10,
    convitesUtilizaveis: 0,
    temaAprovado: true,
    dispositivosAtivos: 0,
    trailerConfigurado: true,
    categorias: { total: 0, semItens: 0, itensSemCategoria: 0 },
  };
  const item = (e: EntradaChecklist) => avaliarChecklist(e).find((i) => i.id === "CATEGORIAS")!;

  it("sem categorias, não se aplica", () => {
    expect(contarCategorias([], [null, null])).toEqual({ total: 0, semItens: 0, itensSemCategoria: 0 });
    expect(item(base).estado).toBe("NAO_SE_APLICA");
  });

  it("toda categoria com item e todo item com categoria: OK; senão, bloqueia", () => {
    expect(contarCategorias(["a", "b"], ["a", "b", "a"])).toEqual({ total: 2, semItens: 0, itensSemCategoria: 0 });
    expect(item({ ...base, categorias: contarCategorias(["a", "b"], ["a", "b"]) }).estado).toBe("OK");
    const pendente = contarCategorias(["a", "b", "c"], ["a", null, "zz"]);
    expect(pendente).toEqual({ total: 3, semItens: 2, itensSemCategoria: 2 });
    const r = item({ ...base, categorias: pendente });
    expect(r.estado).toBe("PENDENTE");
    expect(r.detalhe).toContain("2 categoria(s) sem item");
    expect(r.secao).toBe("categorias");
  });
});

describe("apuração por categoria", () => {
  const candidatos = [
    { id: "a1", ordem: 1, desqualificado: false, categoriaId: "A" },
    { id: "a2", ordem: 2, desqualificado: false, categoriaId: "A" },
    { id: "b1", ordem: 3, desqualificado: false, categoriaId: "B" },
    { id: "b2", ordem: 4, desqualificado: false, categoriaId: "B" },
  ];
  const entrada = {
    candidatos,
    votos: { POPULAR: { a1: 1, a2: 3, b1: 5, b2: 0 }, JURI: {}, INFANTIL: {} },
    pesos: { POPULAR: 100, JURI: 0, INFANTIL: 0 },
    gruposAtivos: ["POPULAR" as const],
    criterio: "PUBLICO" as const,
  };
  const categorias = [
    { id: "A", nome: "Mostra Infantil", premio: "Melhor filme" },
    { id: "B", nome: "Vídeo-escola", premio: null },
  ];

  it("sem categorias, é a apuração de sempre (sem porCategoria)", () => {
    expect(apurarComCategorias(entrada, []).porCategoria).toBeUndefined();
  });

  it("cada categoria tem o seu ranking, os seus totais e o seu vencedor", () => {
    const dados = apurarComCategorias(entrada, categorias);
    expect(dados.ranking[0].candidatoId).toBe("b1"); // no geral, b1 (5 votos) lidera
    const [a, b] = dados.porCategoria!;
    expect(a).toMatchObject({ categoriaId: "A", nome: "Mostra Infantil", premio: "Melhor filme" });
    expect(a.dados.ranking.map((r) => [r.candidatoId, r.posicao])).toEqual([["a2", 1], ["a1", 2]]);
    expect(a.dados.totais.POPULAR).toBe(4);
    expect(a.dados.ranking[0].pontuacao).toBe(75);
    expect(b.dados.ranking.map((r) => r.candidatoId)).toEqual(["b1", "b2"]);
    expect(b.dados.ranking[0].pontuacao).toBe(100);
    expect(idsDosVencedoresPorCategoria(dados)).toEqual([
      { categoria: "Mostra Infantil", ids: ["a2"] },
      { categoria: "Vídeo-escola", ids: ["b1"] },
    ]);
    expect(idsDosVencedoresPorCategoria({})).toBeNull();
  });

  it("a visão e a planilha do resultado seguem a categoria", () => {
    const dados = apurarComCategorias(entrada, categorias);
    const visao = {
      eventoId: "e1",
      versao: 1,
      motivo: "ENCERRAMENTO",
      calculadoEm: "2026-11-28T20:00:00-03:00",
      pesos: entrada.pesos,
      dados,
      derivados: { gruposSemBase: [], pesoRedistribuido: 0, foraDaDisputa: [], criterioEfetivo: "PUBLICO" },
      versoes: [],
      evento: { inicio: null, fim: null, candidatosNaDisputa: 4 },
      participantes: { publico: { cadastrados: 0, votaram: 0 }, jurado: { cadastrados: 0, votaram: 0 } },
      serie: { passoMinutos: 1, pontos: [] },
    } as unknown as ResultadoVisao;
    const daA = visaoDaCategoria(visao, "A")!;
    expect(daA.dados.ranking.map((r) => r.candidatoId)).toEqual(["a2", "a1"]);
    expect(daA.evento.candidatosNaDisputa).toBe(2);
    expect(visaoDaCategoria(visao, "nao-existe")).toBeNull();

    const planilha = planilhaResultadoCandidatos(visao, (id) => id.toUpperCase());
    expect(planilha.cabecalho[0]).toBe("categoria");
    expect(planilha.linhas.map((l) => [l[0], l[1], l[2]])).toEqual([
      ["Mostra Infantil", 1, "A2"],
      ["Mostra Infantil", 2, "A1"],
      ["Vídeo-escola", 1, "B1"],
      ["Vídeo-escola", 2, "B2"],
    ]);
  });
});
