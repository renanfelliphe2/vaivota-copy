import { describe, expect, it } from "vitest";
import { T0_MS } from "@/lib/tempo";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { aplicarVotoJuri } from "./aplicarVoto";
import {
  aplicarAvaliacaoJuri,
  aplicarEscolhasJuri,
  aplicarNotasJuri,
  avaliacaoDoJurado,
  candidatoAvaliado,
  contarJuri,
  criteriosDoEvento,
} from "./avaliacaoJuri";
import { contarVotos } from "./contagens";
import { planilhaJurados } from "./exportacao";
import { verificarInvariantes } from "./invariantes";
import type { EstadoApp, ModoVotoJuri } from "./tipos";
import { validarCriteriosJuri } from "./validacoesConfig";

const FV = "evt-ver-e-fazer-filmes";
const BRUNO = "par-bruno-fv";
const DORA = "par-dora-fv";
const [DIRECAO, ROTEIRO, FOTOGRAFIA, SOM] = ["crit-fv-direcao", "crit-fv-roteiro", "crit-fv-fotografia", "crit-fv-som"];

/** Seed com o modo pedido e uma segunda jurada (Dora), sem voto. */
function estadoCom(modo: ModoVotoJuri): EstadoApp {
  const e = criarEstadoInicial();
  e.banco.configsPlacar = e.banco.configsPlacar.map((c) => (c.eventoId === FV ? { ...c, modoVotoJuri: modo } : c));
  e.banco.usuarios.push({ ...e.banco.usuarios[1], id: "usr-dora", email: "dora@demo.com", nome: "Dora" });
  e.banco.participacoes.push({ id: DORA, usuarioId: "usr-dora", eventoId: FV, papel: "JURADO", votou: false });
  return e;
}

function notas(direcao: number, roteiro: number, fotografia: number, som: number) {
  return { [DIRECAO]: direcao, [ROTEIRO]: roteiro, [FOTOGRAFIA]: fotografia, [SOM]: som };
}

describe("notas por critério", () => {
  it("placar do júri = média simples de todas as notas recebidas (critérios e jurados)", () => {
    let e = estadoCom("NOTAS_POR_CRITERIO");
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-01", notas: notas(10, 8, 6, 4), agoraMs: T0_MS });
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: DORA, candidatoId: "cand-fv-01", notas: notas(9, 9, 9, 9), agoraMs: T0_MS });
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: DORA, candidatoId: "cand-fv-02", notas: notas(5, 5, 5, 6), agoraMs: T0_MS });
    // (10+8+6+4+9+9+9+9) / 8 = 8 · (5+5+5+6) / 4 = 5,25
    expect(contarJuri(e.banco, FV)).toEqual({ "cand-fv-01": 8, "cand-fv-02": 5.25 });
    expect(contarVotos(e.banco, FV).JURI).toEqual({ "cand-fv-01": 8, "cand-fv-02": 5.25 });
    expect(verificarInvariantes(e)).toEqual([]);
  });

  it("salvar de novo substitui as notas do candidato e marca votou", () => {
    let e = estadoCom("NOTAS_POR_CRITERIO");
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-01", notas: notas(1, 1, 1, 1), agoraMs: T0_MS });
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-01", notas: notas(7, 7, 7, 7), agoraMs: T0_MS });
    expect(e.banco.notasJuri.filter((n) => n.participacaoId === BRUNO)).toHaveLength(4);
    expect(avaliacaoDoJurado(e.banco, BRUNO, FV).notas["cand-fv-01"]).toEqual(notas(7, 7, 7, 7));
    expect(e.banco.participacoes.find((p) => p.id === BRUNO)!.votou).toBe(true);
    expect(candidatoAvaliado(avaliacaoDoJurado(e.banco, BRUNO, FV).notas["cand-fv-01"], criteriosDoEvento(e.banco, FV))).toBe(true);
  });

  it("a invariante 10 pega nota fora de 0 a 10", () => {
    const e = aplicarNotasJuri(estadoCom("NOTAS_POR_CRITERIO"), {
      eventoId: FV,
      participacaoId: BRUNO,
      candidatoId: "cand-fv-01",
      notas: notas(10, 10, 10, 10),
      agoraMs: T0_MS,
    });
    e.banco.notasJuri[0].nota = 11;
    expect(verificarInvariantes(e).some((x) => x.startsWith("10:"))).toBe(true);
  });
});

describe("melhor por critério", () => {
  it("cada escolha vale 1 voto; marcar substitui o anterior no critério e desmarcar esvazia", () => {
    let e = estadoCom("MELHOR_POR_CRITERIO");
    e = aplicarEscolhasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-01", criterioIds: [DIRECAO, ROTEIRO], agoraMs: T0_MS });
    e = aplicarEscolhasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-02", criterioIds: [ROTEIRO, SOM], agoraMs: T0_MS });
    e = aplicarEscolhasJuri(e, { eventoId: FV, participacaoId: DORA, candidatoId: "cand-fv-01", criterioIds: [SOM], agoraMs: T0_MS });
    expect(avaliacaoDoJurado(e.banco, BRUNO, FV).escolhas).toEqual({ [DIRECAO]: "cand-fv-01", [ROTEIRO]: "cand-fv-02", [SOM]: "cand-fv-02" });
    expect(contarJuri(e.banco, FV)).toEqual({ "cand-fv-01": 2, "cand-fv-02": 2 });
    expect(verificarInvariantes(e)).toEqual([]);

    // Dora desmarca o único critério: fica sem voto.
    e = aplicarEscolhasJuri(e, { eventoId: FV, participacaoId: DORA, candidatoId: "cand-fv-01", criterioIds: [], agoraMs: T0_MS });
    expect(e.banco.participacoes.find((p) => p.id === DORA)!.votou).toBe(false);
    expect(verificarInvariantes(e)).toEqual([]);
  });
});

describe("modo ativo e configuração", () => {
  it("só o modo ativo entra no placar; os outros dados ficam guardados", () => {
    let e = estadoCom("VOTO_UNICO");
    e = aplicarVotoJuri(e, { eventoId: FV, usuarioId: "usr-bruno", candidatoId: "cand-fv-03", agoraMs: T0_MS });
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: DORA, candidatoId: "cand-fv-01", notas: notas(6, 6, 6, 6), agoraMs: T0_MS });
    expect(contarJuri(e.banco, FV)).toEqual({ "cand-fv-03": 1 });
    const criterios = criteriosDoEvento(e.banco, FV).map((c) => ({ id: c.id, nome: c.nome }));
    e = aplicarAvaliacaoJuri(e, FV, { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios }, "2026-11-25T10:00:00-03:00");
    expect(contarJuri(e.banco, FV)).toEqual({ "cand-fv-01": 6 });
    expect(verificarInvariantes(e)).toEqual([]);
  });

  it("remover um critério apaga as notas dele e recalcula votou; critério novo ganha id", () => {
    let e = estadoCom("NOTAS_POR_CRITERIO");
    e = aplicarNotasJuri(e, { eventoId: FV, participacaoId: BRUNO, candidatoId: "cand-fv-01", notas: notas(10, 0, 0, 0), agoraMs: T0_MS });
    e = aplicarAvaliacaoJuri(
      e,
      FV,
      { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios: [{ id: DIRECAO, nome: "Direção" }, { id: null, nome: "Atuação" }] },
      "2026-11-25T10:00:00-03:00",
    );
    expect(criteriosDoEvento(e.banco, FV).map((c) => c.nome)).toEqual(["Direção", "Atuação"]);
    expect(criteriosDoEvento(e.banco, FV)[1].id).toBe(`crit-${FV}-1`);
    expect(e.banco.notasJuri.map((n) => n.criterioId)).toEqual([DIRECAO]);
    // Faltou a nota de Atuação: o candidato deixa de contar como avaliado, mas a nota de Direção segue no placar.
    expect(candidatoAvaliado(avaliacaoDoJurado(e.banco, BRUNO, FV).notas["cand-fv-01"], criteriosDoEvento(e.banco, FV))).toBe(false);
    expect(contarJuri(e.banco, FV)).toEqual({ "cand-fv-01": 10 });

    e = aplicarAvaliacaoJuri(e, FV, { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios: [{ id: null, nome: "Som" }] }, "2026-11-25T10:00:00-03:00");
    expect(e.banco.notasJuri).toEqual([]);
    expect(e.banco.participacoes.find((p) => p.id === BRUNO)!.votou).toBe(false);
    expect(verificarInvariantes(e)).toEqual([]);
  });

  it("validarCriteriosJuri: obrigatório nos modos por critério, nome e duplicado", () => {
    expect(validarCriteriosJuri([], true)).toEqual({ criterios: "Cadastre ao menos um critério." });
    expect(validarCriteriosJuri([], false)).toEqual({});
    expect(validarCriteriosJuri(["Direção", "direção ", "", "X"], true)).toEqual({
      "criterio-1": "Já existe um critério com este nome.",
      "criterio-2": "Informe o nome do critério.",
      "criterio-3": "Use de 2 a 30 caracteres.",
    });
  });
});

describe("CSV dos jurados por critério", () => {
  const base = { nome: "Bruno", rotulo: "Jurado 1", votou: true, candidatoId: null, atualizadoEm: null, historico: [] };
  const criterios = [
    { id: DIRECAO, nome: "Direção" },
    { id: SOM, nome: "Som" },
  ];

  it("notas: uma linha por nota; pendente sem notas", () => {
    const p = planilhaJurados(
      {
        modo: "NOTAS_POR_CRITERIO",
        criterios,
        jurados: [
          { ...base, notas: { c1: { [DIRECAO]: 9, [SOM]: 7 } }, escolhas: {} },
          { ...base, nome: "Dora", votou: false, notas: {}, escolhas: {} },
        ],
      },
      (id) => id.toUpperCase(),
    );
    expect(p.cabecalho).toEqual(["jurado", "rotulo", "situacao", "candidato", "criterio", "nota"]);
    expect(p.linhas).toEqual([
      ["Bruno", "Jurado 1", "Avaliou", "C1", "Direção", 9],
      ["Bruno", "Jurado 1", "Avaliou", "C1", "Som", 7],
      ["Dora", "Jurado 1", "Pendente", null, null, null],
    ]);
  });

  it("melhor por critério: uma linha por escolha", () => {
    const p = planilhaJurados(
      { modo: "MELHOR_POR_CRITERIO", criterios, jurados: [{ ...base, notas: {}, escolhas: { [SOM]: "c2" } }] },
      (id) => id.toUpperCase(),
    );
    expect(p.linhas).toEqual([["Bruno", "Jurado 1", "Escolheu", "Som", "C2"]]);
  });
});
