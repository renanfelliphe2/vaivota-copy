import { describe, expect, it } from "vitest";
import {
  avisoCamposPerdidos,
  camposDaCategoria,
  camposPerdidosNaMudanca,
  chaveValida,
  formatarValorCampo,
  hrefDoCampo,
  listarNomes,
} from "./camposExtras";
import type { CampoCandidato, Candidato } from "./tipos";

// D1 (25/11/2026): campos extras por categoria.

const campo = (categoriaId: string, chave: string, rotulo: string, ordem: number): CampoCandidato => ({
  id: `${categoriaId}-${chave}`,
  eventoId: "evt",
  categoriaId,
  chave,
  rotulo,
  tipo: "TEXTO",
  ordem,
});

const CAMPOS = [
  campo("curtas", "duracao", "Duração", 2),
  campo("curtas", "direcao", "Direção", 1),
  campo("curtas", "elenco", "Elenco", 3),
  campo("infantil", "direcao", "Direção", 1),
  campo("infantil", "escola", "Escola", 2),
];

const item = (categoriaId: string | null, camposExtras: Record<string, string> | null): Candidato => ({
  id: "k1",
  eventoId: "evt",
  titulo: "Filme",
  imagemUrl: null,
  publicado: false,
  desqualificado: false,
  ordem: 1,
  camposExtras,
  usuarioVinculadoId: null,
  categoriaId,
  criadoEm: "2026-11-25T10:00:00-03:00",
  atualizadoEm: "2026-11-25T10:00:00-03:00",
});

describe("campos extras por categoria", () => {
  it("cada categoria tem os seus campos, na ordem; sem categoria, nenhum", () => {
    expect(camposDaCategoria(CAMPOS, "curtas").map((c) => c.chave)).toEqual(["direcao", "duracao", "elenco"]);
    expect(camposDaCategoria(CAMPOS, "infantil").map((c) => c.chave)).toEqual(["direcao", "escola"]);
    expect(camposDaCategoria(CAMPOS, null)).toEqual([]);
  });

  it("mudar de categoria perde só os campos preenchidos que a nova não tem", () => {
    const filme = item("curtas", { direcao: "Ana", duracao: "12 min", elenco: "  " });
    // Elenco está vazio: não se perde nada nele. Direção existe nas duas.
    expect(camposPerdidosNaMudanca(filme, CAMPOS, "infantil")).toEqual([{ chave: "duracao", rotulo: "Duração" }]);
    expect(camposPerdidosNaMudanca(filme, CAMPOS, "curtas")).toEqual([]);
    expect(camposPerdidosNaMudanca(item("curtas", null), CAMPOS, "infantil")).toEqual([]);
    // Sem categoria, o rótulo vem de qualquer categoria com a chave (ou da própria chave).
    expect(camposPerdidosNaMudanca(item(null, { elenco: "X", antigo: "Y" }), CAMPOS, "infantil")).toEqual([
      { chave: "elenco", rotulo: "Elenco" },
      { chave: "antigo", rotulo: "antigo" },
    ]);
  });

  it("a pergunta lista os campos", () => {
    expect(listarNomes(["Direção"])).toBe("Direção");
    expect(listarNomes(["Direção", "Duração", "Elenco"])).toBe("Direção, Duração e Elenco");
    expect(avisoCamposPerdidos(["Campo 1", "Campo 2"])).toBe(
      "Essa categoria não possui os campos Campo 1 e Campo 2 e os dados serão perdidos. Tem certeza que deseja fazer a migração?",
    );
    expect(avisoCamposPerdidos(["Duração"])).toMatch(/^Essa categoria não possui o campo Duração e/);
  });

  it("só aceita copiar chaves no formato gerado", () => {
    expect(chaveValida("direcao_de_arte")).toBe(true);
    expect(chaveValida("Direção")).toBe(false);
    expect(chaveValida("")).toBe(false);
  });

  it("formata o valor pelo tipo e só aceita link http(s) no href (24/11/2026)", () => {
    expect(formatarValorCampo("DATA", "2026-11-28")).toBe("28/11/2026");
    expect(formatarValorCampo("DATA", "valor antigo")).toBe("valor antigo");
    expect(formatarValorCampo("LINK", "https://vaivota.space/")).toBe("vaivota.space");
    expect(formatarValorCampo("NUMERO", "2026")).toBe("2026");
    expect(hrefDoCampo("https://vaivota.space")).toBe("https://vaivota.space/");
    expect(hrefDoCampo("javascript:alert(1)")).toBeNull();
    expect(hrefDoCampo("texto")).toBeNull();
  });
});
