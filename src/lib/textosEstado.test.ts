import { describe, expect, it } from "vitest";
import { TEXTOS_ESTADO_PADRAO, textoDoEstado } from "./textosEstado";

const semOverride = { textosEstado: null, rotuloCandidato: "Projeto", rotuloCandidatos: "Projetos" };
const comOverride = {
  textosEstado: { ENCERRADA: { titulo: "Fim da votação de {rotulos}", corpo: "Até a próxima." } },
  rotuloCandidato: "Curta",
  rotuloCandidatos: "Curtas",
};

describe("textoDoEstado", () => {
  it("usa o padrão sem override", () => {
    expect(textoDoEstado("ABERTA", semOverride)).toEqual(TEXTOS_ESTADO_PADRAO.ABERTA);
  });

  it("interpola {rotulos} em minúsculas", () => {
    expect(textoDoEstado("SEM_CANDIDATOS", semOverride).corpo).toBe("A lista de projetos será divulgada em breve.");
    expect(textoDoEstado("SEM_CANDIDATOS", comOverride).corpo).toBe("A lista de curtas será divulgada em breve.");
  });

  it("override do tema vence e também é interpolado", () => {
    expect(textoDoEstado("ENCERRADA", comOverride)).toEqual({ titulo: "Fim da votação de curtas", corpo: "Até a próxima." });
    // chave sem override cai no padrão
    expect(textoDoEstado("CONCLUIDO", comOverride)).toEqual(TEXTOS_ESTADO_PADRAO.CONCLUIDO);
  });

  it("interpola {rotulo} e valores de contexto; chave desconhecida fica como está", () => {
    const tema = { ...semOverride, textosEstado: { JA_VOTOU: { titulo: "{n} {rotulo}", corpo: "{x}" } } };
    expect(textoDoEstado("JA_VOTOU", tema, { n: 1 })).toEqual({ titulo: "1 projeto", corpo: "{x}" });
  });
});
