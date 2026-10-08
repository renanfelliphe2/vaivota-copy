import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { T0_MS } from "@/lib/tempo";
import { FIXTURES_APURACAO } from "./apuracaoAutoteste";
import { contarParticipantes } from "./contagens";
import { verificarInvariantes } from "./invariantes";
import { resultadoAtual } from "./resultado";
import type { EstadoApp } from "./tipos";

// Etapa 7 (CP2): cenários de resultado do Festival (o PADRAO não tem volume: começa sem votos).

const FV = "evt-ver-e-fazer-filmes";

function aplicar(id: string, base: EstadoApp = criarEstadoInicial(), eventoId = FV): EstadoApp {
  return CENARIOS.find((c) => c.id === id)!.aplicar(base, { eventoId, agoraMs: T0_MS });
}

const ESPERADOS: Record<string, { fixture: string; eventoId: string }> = {
  FESTIVAL_ENCERRADO: { fixture: "FESTIVAL_ENCERRADO", eventoId: FV },
};

function idCurto(id: string): string {
  return `c${id.slice(-2)}`;
}

describe("cenários de resultado", () => {
  for (const [id, { fixture, eventoId }] of Object.entries(ESPERADOS)) {
    it(`${id} reproduz a tabela da 5.7, é idempotente e mantém as invariantes`, () => {
      const uma = aplicar(id);
      const duas = aplicar(id, uma);
      expect(duas.banco).toEqual(uma.banco);
      expect(verificarInvariantes(uma)).toEqual([]);
      const r = resultadoAtual(uma.banco.resultados, eventoId)!;
      expect(r.versao).toBe(1);
      const esperado = FIXTURES_APURACAO.find((f) => f.nome === fixture)!.esperado;
      for (const item of r.dados.ranking) {
        expect(Math.round(item.pontuacao * 100) / 100).toBe(esperado.pontuacoes[idCurto(item.candidatoId)]);
        expect(item.posicao).toBe(esperado.posicoes[idCurto(item.candidatoId)]);
      }
      expect(r.dados.ranking).toHaveLength(Object.keys(esperado.pontuacoes).length);
    });
  }

  it("FESTIVAL_ENCERRADO: totens e série por hora", () => {
    const e = aplicar("FESTIVAL_ENCERRADO");
    const porTotem = (id: string) => e.banco.votosInfantis.filter((v) => v.dispositivoId === id).length;
    expect([porTotem("disp-fv-hall"), porTotem("disp-fv-patio"), porTotem("disp-fv-oficinas")]).toEqual([70, 41, 27]);
    const jurados = e.banco.votosJuri.filter((v) => v.eventoId === FV);
    expect(new Set(jurados.map((v) => v.candidatoId)).size).toBe(2);
    expect(contarParticipantes(e.banco, FV).publico).toEqual({ cadastrados: 260, votaram: 240 });
    // Bruno (núcleo) segue pendente; os dois jurados gerados votaram.
    expect(contarParticipantes(e.banco, FV).jurado).toEqual({ cadastrados: 3, votaram: 2 });
  });

  it("RESULTADO_SEM_INFANTIL: sem categoria infantil e soma 100", () => {
    const e = aplicar("RESULTADO_SEM_INFANTIL");
    const r = resultadoAtual(e.banco.resultados, FV)!;
    expect(r.dados.categorias.map((c) => c.grupo)).toEqual(["POPULAR", "JURI"]);
    expect(r.dados.totais.INFANTIL).toBe(0);
    expect(r.dados.ranking.reduce((s, i) => s + i.pontuacao, 0)).toBeCloseTo(100, 4);
    expect(verificarInvariantes(e)).toEqual([]);
  });

  it("reaplicar sobre outro cenário mantém ids únicos e as invariantes", () => {
    const e = aplicar("RESULTADO_SEM_INFANTIL", aplicar("FESTIVAL_ENCERRADO"));
    expect(verificarInvariantes(e)).toEqual([]);
    expect(resultadoAtual(e.banco.resultados, FV)).toBeDefined();
    const ids = e.banco.votos.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
