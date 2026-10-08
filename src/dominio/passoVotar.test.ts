import { describe, expect, it } from "vitest";
import { resolverPassoVotar, type EntradaPassoVotar } from "./passoVotar";

// Tabela 5.3 da Etapa 5 (linhas 1 a 7).

const base: EntradaPassoVotar = {
  tela: "LISTA",
  papelVoto: "PUBLICO",
  passoUrl: null,
  selecaoValida: false,
  ultimoVotoValido: false,
  envio: "OCIOSO",
};

const passo = (e: Partial<EntradaPassoVotar>) => resolverPassoVotar({ ...base, ...e });

describe("resolverPassoVotar", () => {
  it("1: fora de LISTA e JA_VOTOU não decide nem normaliza", () => {
    expect(passo({ tela: "ENCERRADA", passoUrl: "revisao", selecaoValida: true })).toEqual({ passo: null, normalizarPara: null });
    expect(passo({ tela: "ACESSO_PENDENTE", passoUrl: "xyz" })).toEqual({ passo: null, normalizarPara: null });
  });

  it("2: envio em andamento mantém a revisão, mesmo com a gate já em JA_VOTOU", () => {
    expect(passo({ tela: "JA_VOTOU", passoUrl: "revisao", envio: "ENVIANDO" })).toEqual({ passo: "REVISAO", normalizarPara: null });
    expect(passo({ passoUrl: "revisao", envio: "VERIFICANDO" })).toEqual({ passo: "REVISAO", normalizarPara: null });
  });

  it("3: sucesso prevalece sobre JA_VOTOU (público) e sobre LISTA (jurado)", () => {
    expect(passo({ tela: "JA_VOTOU", passoUrl: "revisao", ultimoVotoValido: true })).toEqual({
      passo: "SUCESSO",
      normalizarPara: "SUCESSO",
    });
    expect(passo({ tela: "JA_VOTOU", passoUrl: "sucesso", ultimoVotoValido: true })).toEqual({ passo: "SUCESSO", normalizarPara: null });
    expect(passo({ papelVoto: "JURADO", passoUrl: "sucesso", ultimoVotoValido: true })).toEqual({
      passo: "SUCESSO",
      normalizarPara: null,
    });
    // público na lista com voto válido não cai aqui (não acontece no fluxo real)
    expect(passo({ passoUrl: "sucesso", ultimoVotoValido: true }).passo).toBe("LISTA");
  });

  it("4: JA_VOTOU sem sucesso mostra a tela de já votou e limpa o passo", () => {
    expect(passo({ tela: "JA_VOTOU" })).toEqual({ passo: null, normalizarPara: null });
    expect(passo({ tela: "JA_VOTOU", passoUrl: "sucesso" })).toEqual({ passo: null, normalizarPara: "BASE" });
  });

  it("5: revisão com seleção válida", () => {
    expect(passo({ passoUrl: "revisao", selecaoValida: true })).toEqual({ passo: "REVISAO", normalizarPara: null });
  });

  it("6: passo inválido volta à lista e normaliza", () => {
    expect(passo({ passoUrl: "revisao" })).toEqual({ passo: "LISTA", normalizarPara: "BASE" });
    expect(passo({ passoUrl: "sucesso" })).toEqual({ passo: "LISTA", normalizarPara: "BASE" });
    expect(passo({ passoUrl: "xyz" })).toEqual({ passo: "LISTA", normalizarPara: "BASE" });
  });

  it("7: lista", () => {
    expect(passo({})).toEqual({ passo: "LISTA", normalizarPara: null });
    expect(passo({ passoUrl: "lista" })).toEqual({ passo: "LISTA", normalizarPara: null });
  });
});
