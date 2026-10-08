import { describe, expect, it } from "vitest";
import { CENARIOS } from "@/mocks/cenarios";
import { criarEstadoInicial } from "@/mocks/criarEstadoInicial";
import { criarEstadoNucleo } from "@/mocks/criarEstadoNucleo";
import { T0_MS } from "@/lib/tempo";
import { FIXTURES_APURACAO } from "./apuracaoAutoteste";
import { contarParticipantes } from "./contagens";
import { resumirAuditoria } from "./auditoria";
import { resumirConvites } from "./convites";
import { verificarInvariantes } from "./invariantes";
import { resultadoAtual } from "./resultado";
import type { EstadoApp } from "./tipos";

// Etapa 7 (CP2): metas do volume no PADRAO e os sete cenários de resultado.

const ST = "evt-semana-tech";
const FV = "evt-ver-e-fazer-filmes";

function aplicar(id: string, base: EstadoApp = criarEstadoInicial(), eventoId = ST): EstadoApp {
  return CENARIOS.find((c) => c.id === id)!.aplicar(base, { eventoId, agoraMs: T0_MS });
}

describe("volume da Semana Tech no PADRAO (metas 5.7)", () => {
  const estado = criarEstadoInicial();
  const { banco } = estado;

  it("participações, votos, jurados e convites", () => {
    const p = contarParticipantes(banco, ST);
    expect(p.publico).toEqual({ cadastrados: 511, votaram: 412 });
    expect(p.jurado).toEqual({ cadastrados: 9, votaram: 7 });
    expect(banco.votos.filter((v) => v.eventoId === ST)).toHaveLength(412);
    expect(banco.votosJuri.filter((v) => v.eventoId === ST)).toHaveLength(7);
    const convites = banco.convitesJurado.filter((c) => c.eventoId === ST);
    expect(convites).toHaveLength(12);
    expect(resumirConvites(convites, T0_MS)).toEqual({ disponiveis: 1, usados: 9, revogados: 1, expirados: 1 });
  });

  it("Bruno e mais um jurado pendentes; núcleo intacto", () => {
    const pendentes = banco.participacoes.filter((p) => p.eventoId === ST && p.papel === "JURADO" && !p.votou);
    expect(pendentes).toHaveLength(2);
    expect(pendentes.map((p) => p.usuarioId)).toContain("usr-bruno");
    const nucleo = criarEstadoNucleo().banco;
    for (const c of nucleo.candidatos) expect(banco.candidatos.find((x) => x.id === c.id)).toEqual(c);
    expect(banco.votos.find((v) => v.id === 1)).toEqual(nucleo.votos[0]);
    expect(banco.votosJuri.find((v) => v.id === "vj-fabio-st")).toEqual(nucleo.votosJuri[0]);
    expect(estado.dev.vinculosVoto).toEqual(criarEstadoNucleo().dev.vinculosVoto);
  });

  it("auditoria coerente e sem violações", () => {
    const doEvento = banco.auditoria.filter((a) => a.eventoId === ST);
    const resumo = resumirAuditoria(doEvento);
    expect(resumo.bloqueiosRateLimit).toBe(1);
    expect(resumo.alteracoesVotoJuri).toBe(2);
    expect(doEvento.filter((a) => a.acao === "VOTO_JURI_REGISTRADO")).toHaveLength(6);
    expect(doEvento.filter((a) => a.acao === "CONVITE_RESGATADO")).toHaveLength(9);
    expect(doEvento).toHaveLength(27);
    expect(verificarInvariantes(estado)).toEqual([]);
  });

  it("votos dentro da janela 13h–14h, sem resultado com a urna aberta", () => {
    const ms = banco.votos.filter((v) => v.eventoId === ST).map((v) => Date.parse(v.criadoEm));
    expect(Math.min(...ms)).toBeGreaterThanOrEqual(Date.parse("2026-10-22T13:00:00-03:00"));
    expect(Math.max(...ms)).toBeLessThanOrEqual(T0_MS);
    expect(banco.resultados).toEqual([]);
    expect(banco.usuarios.filter((u) => u.id.startsWith("usr-v-"))).toHaveLength(515);
  });
});

const ESPERADOS: Record<string, { fixture: string; eventoId: string }> = {
  RESULTADO_PADRAO: { fixture: "PADRAO", eventoId: ST },
  RESULTADO_EMPATE_RESOLVIDO: { fixture: "RESULTADO_EMPATE_RESOLVIDO", eventoId: ST },
  RESULTADO_EMPATE_PERSISTENTE: { fixture: "RESULTADO_EMPATE_PERSISTENTE", eventoId: ST },
  RESULTADO_CO_VENCEDORES: { fixture: "RESULTADO_CO_VENCEDORES", eventoId: ST },
  RESULTADO_DOIS_CANDIDATOS: { fixture: "RESULTADO_DOIS_CANDIDATOS", eventoId: ST },
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
  });

  it("RESULTADO_SEM_INFANTIL: sem categoria infantil e soma 100", () => {
    const e = aplicar("RESULTADO_SEM_INFANTIL");
    const r = resultadoAtual(e.banco.resultados, FV)!;
    expect(r.dados.categorias.map((c) => c.grupo)).toEqual(["POPULAR", "JURI"]);
    expect(r.dados.totais.INFANTIL).toBe(0);
    expect(r.dados.ranking.reduce((s, i) => s + i.pontuacao, 0)).toBeCloseTo(100, 4);
    expect(verificarInvariantes(e)).toEqual([]);
  });

  it("cenários de eventos diferentes convivem", () => {
    const e = aplicar("RESULTADO_EMPATE_PERSISTENTE", aplicar("FESTIVAL_ENCERRADO"));
    expect(verificarInvariantes(e)).toEqual([]);
    expect(resultadoAtual(e.banco.resultados, FV)).toBeDefined();
    const ids = e.banco.votos.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
