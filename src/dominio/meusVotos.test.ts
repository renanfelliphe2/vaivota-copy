import { describe, expect, it } from "vitest";
import { comMeuVoto, lerMeusVotos, meusVotosNoEvento, VOTO_UNICO } from "./meusVotos";

// "Em quem eu votei", guardado só no navegador de quem votou (24/11/2026).

describe("lerMeusVotos", () => {
  it("lê o que foi guardado e ignora o que está fora do formato", () => {
    expect(lerMeusVotos(null)).toEqual({});
    expect(lerMeusVotos("")).toEqual({});
    expect(lerMeusVotos("{quebrado")).toEqual({});
    expect(lerMeusVotos("[1,2]")).toEqual({});
    expect(lerMeusVotos(JSON.stringify({ "u|e": { c1: "f1", c2: 3 }, ruim: "x" }))).toEqual({ "u|e": { c1: "f1" } });
  });
});

describe("comMeuVoto e meusVotosNoEvento", () => {
  it("guarda por pessoa, evento e categoria, sem misturar", () => {
    let g = comMeuVoto({}, { usuarioId: "ana", eventoId: "fest", categoriaId: "infantil", candidatoId: "matilda" });
    g = comMeuVoto(g, { usuarioId: "ana", eventoId: "fest", categoriaId: "usina", candidatoId: "theia" });
    g = comMeuVoto(g, { usuarioId: "bia", eventoId: "fest", categoriaId: "infantil", candidatoId: "esperanca" });
    g = comMeuVoto(g, { usuarioId: "ana", eventoId: "maratona", categoriaId: null, candidatoId: "projeto-7" });

    expect(meusVotosNoEvento(g, "ana", "fest")).toEqual({ infantil: "matilda", usina: "theia" });
    expect(meusVotosNoEvento(g, "bia", "fest")).toEqual({ infantil: "esperanca" });
    expect(meusVotosNoEvento(g, "ana", "maratona")).toEqual({ [VOTO_UNICO]: "projeto-7" });
    expect(meusVotosNoEvento(g, "carla", "fest")).toEqual({});
    expect(meusVotosNoEvento(g, null, "fest")).toEqual({});
  });

  it("sobrevive à ida e volta pelo texto guardado", () => {
    const g = comMeuVoto({}, { usuarioId: "ana", eventoId: "fest", categoriaId: "infantil", candidatoId: "matilda" });
    expect(meusVotosNoEvento(lerMeusVotos(JSON.stringify(g)), "ana", "fest")).toEqual({ infantil: "matilda" });
  });
});
