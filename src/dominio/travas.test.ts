import { describe, expect, it } from "vitest";
import type { EstadoEvento, EstadoUrna } from "./tipos";
import { exigirAcao, nivelDaAcao, resolverFaseConfig, resolverTravas, type AcaoConfig, type FaseConfig, type NivelTrava } from "./travas";

// Matriz 5.1 da Etapa 6, célula por célula.

const FASES: FaseConfig[] = ["RASCUNHO", "ATIVO_NAO_INICIADA", "URNA_ABERTA", "URNA_ENCERRADA", "CONCLUIDO"];
const L = "LIVRE";
const T = "TRAVADO";
const A = "AUDITADO";
const LE = "LEITURA";

const ESPERADO: Record<Exclude<AcaoConfig, "MODULO_JURI_DESLIGAR">, NivelTrava[]> = {
  GERAL_NOME_DESCRICAO: [L, L, L, L, LE],
  GERAL_SLUG: [L, T, T, T, LE],
  GERAL_FUSO_INICIO: [L, L, T, T, LE],
  GERAL_FIM_JANELA: [L, L, "ESTENDER", T, LE],
  GERAL_ENCERRAMENTO_AUTOMATICO: [L, L, A, T, LE],
  CANDIDATOS_PUBLICACAO: [L, L, T, T, LE],
  CANDIDATOS_REORDENAR: [L, L, L, L, LE],
  CANDIDATOS_CORRIGIR: [L, L, A, A, LE],
  CANDIDATOS_DESQUALIFICAR: ["INDISPONIVEL", "INDISPONIVEL", "EXCEPCIONAL", "EXCEPCIONAL", LE],
  CAMPOS_EXTRAS_ESTRUTURA: [L, L, T, T, LE],
  CAMPOS_EXTRAS_ROTULO: [L, L, A, A, LE],
  CONVITES_GERAR: [L, L, L, T, LE],
  CONVITES_RENOMEAR: [L, L, L, T, LE],
  CONVITES_REVOGAR: [L, L, A, T, LE],
  PLACAR: [L, L, T, T, LE],
  TEMA: [L, L, L, L, LE],
  OPERACAO: [L, L, L, L, LE],
};

describe("matriz de travas", () => {
  for (const [acao, niveis] of Object.entries(ESPERADO)) {
    it(acao, () => {
      expect(FASES.map((f) => nivelDaAcao(f, acao as AcaoConfig))).toEqual(niveis);
    });
  }

  it("MODULO_JURI_DESLIGAR depende do convite USADO (D24)", () => {
    expect(FASES.map((f) => nivelDaAcao(f, "MODULO_JURI_DESLIGAR"))).toEqual([L, L, L, L, LE]);
    expect(FASES.map((f) => nivelDaAcao(f, "MODULO_JURI_DESLIGAR", { conviteUsado: true }))).toEqual([T, T, T, T, LE]);
  });
});

describe("resolverFaseConfig", () => {
  const casos: [EstadoEvento, EstadoUrna, FaseConfig, boolean][] = [
    ["CONCLUIDO", "ENCERRADA", "CONCLUIDO", false],
    ["CONCLUIDO", "ABERTA", "CONCLUIDO", true],
    ["RASCUNHO", "NAO_INICIADA", "RASCUNHO", false],
    ["RASCUNHO", "ABERTA", "RASCUNHO", true],
    ["RASCUNHO", "ENCERRADA", "RASCUNHO", true],
    ["ATIVO", "NAO_INICIADA", "ATIVO_NAO_INICIADA", false],
    ["ATIVO", "ABERTA", "URNA_ABERTA", false],
    ["ATIVO", "ENCERRADA", "URNA_ENCERRADA", false],
  ];
  for (const [estado, estadoUrna, fase, incoerente] of casos) {
    it(`${estado} + ${estadoUrna}`, () => {
      expect(resolverFaseConfig({ estado, estadoUrna })).toEqual({ fase, incoerente });
    });
  }
});

describe("exigirAcao e motivos", () => {
  it("concluído devolve EVENTO_CONCLUIDO; travado e indisponível devolvem TRAVADO", () => {
    const concluido = exigirAcao({ estado: "CONCLUIDO", estadoUrna: "ENCERRADA" }, "TEMA");
    expect(!concluido.ok && concluido.erro.codigo).toBe("EVENTO_CONCLUIDO");
    const aberta = exigirAcao({ estado: "ATIVO", estadoUrna: "ABERTA" }, "PLACAR");
    expect(!aberta.ok && aberta.erro.codigo).toBe("TRAVADO");
    const rascunho = exigirAcao({ estado: "RASCUNHO", estadoUrna: "NAO_INICIADA" }, "CANDIDATOS_DESQUALIFICAR");
    expect(!rascunho.ok && rascunho.erro.codigo).toBe("TRAVADO");
    expect(exigirAcao({ estado: "ATIVO", estadoUrna: "ABERTA" }, "CANDIDATOS_CORRIGIR").ok).toBe(true);
  });

  it("motivos visíveis", () => {
    const aberta = resolverTravas({ estado: "ATIVO", estadoUrna: "ABERTA" });
    expect(aberta.motivo("PLACAR")).toBe("Travado: a urna já foi aberta.");
    expect(aberta.motivo("TEMA")).toBeNull();
    expect(aberta.permite("CANDIDATOS_CORRIGIR")).toBe(true);
    expect(aberta.permite("CANDIDATOS_PUBLICACAO")).toBe(false);
    const ativo = resolverTravas({ estado: "ATIVO", estadoUrna: "NAO_INICIADA" });
    expect(ativo.motivo("GERAL_SLUG")).toBe("Travado: o endereço já foi divulgado quando o evento é ativado.");
    expect(resolverTravas({ estado: "ATIVO", estadoUrna: "ENCERRADA" }).motivo("CONVITES_GERAR")).toBe("Travado: a urna foi encerrada.");
    const comJurado = resolverTravas({ estado: "ATIVO", estadoUrna: "NAO_INICIADA" }, { conviteUsado: true });
    expect(comJurado.motivo("MODULO_JURI_DESLIGAR")).toBe("Travado: já existe jurado com convite resgatado.");
  });
});
