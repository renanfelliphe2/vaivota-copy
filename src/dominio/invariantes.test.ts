import { describe, expect, it } from "vitest";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { criarEstadoNucleo } from "@/mocks/criarEstadoNucleo";
import { T0_MS } from "@/lib/tempo";
import { aplicarVotoJuri, aplicarVotoPopular } from "./aplicarVoto";
import { verificarInvariantes } from "./invariantes";
import type { EstadoApp } from "./tipos";

const FV = "evt-ver-e-fazer-filmes";

function com(alterar: (e: EstadoApp) => void): string[] {
  const estado = criarEstadoInicial();
  alterar(estado);
  return verificarInvariantes(estado);
}

function violaNumero(erros: string[], n: number): boolean {
  return erros.some((e) => e.startsWith(`${n}:`));
}

describe("estado inicial", () => {
  it("não tem violações", () => {
    expect(verificarInvariantes(criarEstadoInicial())).toEqual([]);
  });

  it("cada chamada devolve objetos independentes", () => {
    const a = criarEstadoNucleo();
    const b = criarEstadoNucleo();
    expect(a).toEqual(b);
    expect(a.banco).not.toBe(b.banco);
    a.banco.eventos[0].nome = "Alterado";
    expect(b.banco.eventos[0].nome).not.toBe("Alterado");
    const c = criarEstadoInicial();
    expect(c.banco.eventos[0].nome).not.toBe("Alterado");
  });

  it("cobre os casos de borda do seed", () => {
    const { banco, dev } = criarEstadoInicial();
    const fv = banco.candidatos.filter((c) => c.eventoId === FV);
    expect(fv.filter((c) => c.publicado && !c.desqualificado)).toHaveLength(6);
    expect(fv.find((c) => c.id === "cand-fv-05")!.titulo.length).toBeGreaterThan(100);
    expect(banco.votos).toEqual([]);
    expect(banco.participacoes.every((p) => !p.votou)).toBe(true);
    expect(dev.vinculosVoto).toEqual({});
    expect(dev.slugPadrao).toBe("ver-e-fazer-filmes");
  });
});

/** Estado com um voto popular (Ana) e um do júri (Bruno), para corromper. */
function comVotos(): EstadoApp {
  const popular = aplicarVotoPopular(criarEstadoInicial(), { eventoId: FV, usuarioId: "usr-ana", candidatoId: "cand-fv-01", agoraMs: T0_MS });
  return aplicarVotoJuri(popular, { eventoId: FV, usuarioId: "usr-bruno", candidatoId: "cand-fv-02", agoraMs: T0_MS });
}

function comVotosAlterado(alterar: (e: EstadoApp) => void): string[] {
  const estado = comVotos();
  alterar(estado);
  return verificarInvariantes(estado);
}

describe("cada invariante detecta a violação", () => {
  it("1: slug duplicado e participação duplicada", () => {
    expect(violaNumero(com((e) => e.banco.eventos.push({ ...e.banco.eventos[0], id: "evt-outro" })), 1)).toBe(true);
    expect(violaNumero(com((e) => e.banco.participacoes.push({ ...e.banco.participacoes[0], id: "dup" })), 1)).toBe(true);
  });

  it("2: pesos que não somam 100 e módulo desligado com peso", () => {
    expect(violaNumero(com((e) => (e.banco.configsPlacar[0].pesoPopular = 60)), 2)).toBe(true);
    expect(violaNumero(com((e) => (e.banco.eventos[0].moduloJuri = false)), 2)).toBe(true);
  });

  it("3: voto popular sem participação que votou", () => {
    expect(verificarInvariantes(comVotos())).toEqual([]);
    expect(violaNumero(com((e) => (e.banco.participacoes.find((p) => p.id === "par-ana-fv")!.votou = true)), 3)).toBe(true);
  });

  it("4: voto do júri sem jurado que votou e sem histórico", () => {
    expect(violaNumero(com((e) => (e.banco.participacoes.find((p) => p.id === "par-bruno-fv")!.votou = true)), 4)).toBe(true);
    expect(violaNumero(comVotosAlterado((e) => (e.banco.historicoVotosJuri = [])), 4)).toBe(true);
  });

  it("5: voto e histórico do júri com candidato de outro evento", () => {
    expect(violaNumero(comVotosAlterado((e) => (e.banco.votos[0].candidatoId = "cand-outro-evento")), 5)).toBe(true);
    expect(violaNumero(comVotosAlterado((e) => (e.banco.historicoVotosJuri[0].candidatoNovoId = "cand-outro-evento")), 5)).toBe(true);
  });

  it("6: convite usado sem participação JURADO", () => {
    expect(violaNumero(com((e) => (e.banco.convitesJurado.find((c) => c.id === "conv-fv-1")!.estado = "USADO")), 6)).toBe(true);
  });

  it("7: versões de resultado fora de sequência", () => {
    const erros = com((e) =>
      e.banco.resultados.push({
        id: "r1",
        eventoId: FV,
        versao: 2,
        motivo: "ENCERRAMENTO",
        pesoPopular: 50,
        pesoJuri: 30,
        pesoInfantil: 20,
        calculadoPorId: null,
        calculadoEm: "2026-11-28T20:00:00-03:00",
        dados: {
          criterioDesempate: "JURI",
          totais: { POPULAR: 0, JURI: 0, INFANTIL: 0 },
          placares: { POPULAR: [], JURI: [], INFANTIL: [] },
          ranking: [],
          desqualificados: [],
          pesosEfetivos: { POPULAR: 50, JURI: 30, INFANTIL: 20 },
          categorias: [],
          empates: [],
        },
      }),
    );
    expect(violaNumero(erros, 7)).toBe(true);
  });

  it("8: candidato publicado sem imagem", () => {
    expect(violaNumero(com((e) => (e.banco.candidatos.find((c) => c.id === "cand-fv-07")!.publicado = true)), 8)).toBe(true);
  });
});
