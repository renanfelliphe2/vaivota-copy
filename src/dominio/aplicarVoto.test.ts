import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { aplicarVotoJuri, aplicarVotoPopular, chaveVinculo } from "./aplicarVoto";
import { verificarInvariantes } from "./invariantes";

const ST = "evt-semana-tech";
const FV = "evt-ver-e-fazer-filmes";

describe("aplicarVotoPopular", () => {
  it("grava Voto sem usuário, votou, vínculo e sequência na mesma receita", () => {
    const antes = criarEstadoInicial();
    const copia = structuredClone(antes);
    const depois = aplicarVotoPopular(antes, { eventoId: ST, usuarioId: "usr-ana", candidatoId: "cand-st-01", agoraMs: T0_MS });

    expect(antes).toEqual(copia); // entrada não mutada
    expect(depois.banco.votos).toHaveLength(antes.banco.votos.length + 1);
    const voto = depois.banco.votos.at(-1)!;
    expect(Object.keys(voto).sort()).toEqual(["candidatoId", "criadoEm", "eventoId", "hashRecibo", "id"]);
    expect(voto.id).toBe(depois.banco.sequencias.voto);
    expect(voto.hashRecibo).toHaveLength(64);
    expect(depois.dev.vinculosVoto[chaveVinculo("usr-ana", ST)]).toBe(voto.id);
    expect(depois.banco.participacoes.find((p) => p.id === "par-ana-st")!.votou).toBe(true);
    expect(depois.banco.participacoes).toHaveLength(antes.banco.participacoes.length);
    expect(verificarInvariantes(depois)).toEqual([]);
  });

  it("sem participação no evento não grava nem cria participação", () => {
    const antes = criarEstadoInicial();
    const depois = aplicarVotoPopular(antes, { eventoId: FV, usuarioId: "usr-ana", candidatoId: "cand-fv-01", agoraMs: T0_MS });
    expect(depois).toBe(antes);
  });
});

describe("aplicarVotoJuri", () => {
  it("primeiro voto cria VotoJuri e histórico com anterior nulo; alteração acrescenta A → B", () => {
    const inicial = criarEstadoInicial();
    const entrada = { eventoId: ST, usuarioId: "usr-bruno", candidatoId: "cand-st-01", agoraMs: T0_MS };
    const primeiro = aplicarVotoJuri(inicial, entrada);
    const doBruno = primeiro.banco.votosJuri.filter((v) => v.participacaoId === "par-bruno-st");
    expect(doBruno).toHaveLength(1);
    const h1 = primeiro.banco.historicoVotosJuri.at(-1)!;
    expect([h1.candidatoAnteriorId, h1.candidatoNovoId, h1.votoJuriId]).toEqual([null, "cand-st-01", doBruno[0].id]);
    expect(h1.id).toBe(primeiro.banco.sequencias.historicoVotoJuri);
    expect(verificarInvariantes(primeiro)).toEqual([]);

    const segundo = aplicarVotoJuri(primeiro, { ...entrada, candidatoId: "cand-st-02" });
    expect(segundo.banco.votosJuri.filter((v) => v.participacaoId === "par-bruno-st")).toHaveLength(1);
    expect(segundo.banco.votosJuri.find((v) => v.participacaoId === "par-bruno-st")!.candidatoId).toBe("cand-st-02");
    const historico = segundo.banco.historicoVotosJuri.filter((h) => h.votoJuriId === doBruno[0].id);
    expect(historico.map((h) => [h.candidatoAnteriorId, h.candidatoNovoId])).toEqual([
      [null, "cand-st-01"],
      ["cand-st-01", "cand-st-02"],
    ]);
    expect(verificarInvariantes(segundo)).toEqual([]);
    expect(inicial).toEqual(criarEstadoInicial());
  });

  it("alteração de Fábio chega a 2 entradas de histórico", () => {
    const r = aplicarVotoJuri(criarEstadoInicial(), {
      eventoId: ST,
      usuarioId: "usr-fabio",
      candidatoId: "cand-st-05",
      agoraMs: T0_MS,
    });
    expect(r.banco.historicoVotosJuri.filter((h) => h.votoJuriId === "vj-fabio-st")).toHaveLength(2);
    expect(verificarInvariantes(r)).toEqual([]);
  });
});
