import { describe, expect, it } from "vitest";
import { chamadaDaSituacao, resolverSituacaoEvento, votacaoAberta } from "./situacaoEvento";
import type { Evento } from "./tipos";

const T0 = Date.parse("2026-10-22T14:00:00-03:00");
const MIN = 60_000;
const config = { limiarRetaFinalSegundos: 300 };

type Base = Pick<Evento, "estado" | "estadoUrna" | "janelaInicio" | "janelaFim">;
const aberta: Base = {
  estado: "ATIVO",
  estadoUrna: "ABERTA",
  janelaInicio: "2026-10-22T13:00:00-03:00",
  janelaFim: "2026-10-22T17:00:00-03:00",
};
const naoIniciada: Base = {
  estado: "ATIVO",
  estadoUrna: "NAO_INICIADA",
  janelaInicio: "2026-11-25T10:00:00-03:00",
  janelaFim: "2026-11-28T20:00:00-03:00",
};

describe("resolverSituacaoEvento", () => {
  it("1. CONCLUIDO vence tudo", () => {
    expect(resolverSituacaoEvento({ ...aberta, estado: "CONCLUIDO" }, config, T0)).toBe("CONCLUIDO");
    expect(resolverSituacaoEvento({ ...aberta, estado: "CONCLUIDO" }, config, T0, { ignorarRascunho: true })).toBe(
      "CONCLUIDO",
    );
  });

  it("2. EM_PREPARACAO no rascunho, antes da urna", () => {
    expect(resolverSituacaoEvento({ ...aberta, estado: "RASCUNHO", estadoUrna: "ENCERRADA" }, config, T0)).toBe(
      "EM_PREPARACAO",
    );
  });

  it("ignorarRascunho decide pela urna", () => {
    expect(resolverSituacaoEvento({ ...aberta, estado: "RASCUNHO" }, config, T0, { ignorarRascunho: true })).toBe("ABERTA");
  });

  it("3. ENCERRADA", () => {
    expect(resolverSituacaoEvento({ ...aberta, estadoUrna: "ENCERRADA" }, config, T0)).toBe("ENCERRADA");
  });

  it("4. TEMPO_ESGOTADO: aberta e agora ≥ janelaFim", () => {
    const fim = Date.parse(aberta.janelaFim!);
    expect(resolverSituacaoEvento(aberta, config, fim)).toBe("TEMPO_ESGOTADO");
    expect(resolverSituacaoEvento(aberta, config, fim + MIN)).toBe("TEMPO_ESGOTADO");
  });

  it("5. RETA_FINAL: 0 < restante ≤ limiar", () => {
    const fim = Date.parse(aberta.janelaFim!);
    expect(resolverSituacaoEvento(aberta, config, fim - 5 * MIN)).toBe("RETA_FINAL");
    expect(resolverSituacaoEvento(aberta, config, fim - 4 * MIN)).toBe("RETA_FINAL");
    expect(resolverSituacaoEvento(aberta, config, fim - 5 * MIN - 1)).toBe("ABERTA");
  });

  it("6. ABERTA (inclusive sem janelaFim)", () => {
    expect(resolverSituacaoEvento(aberta, config, T0)).toBe("ABERTA");
    expect(resolverSituacaoEvento({ ...aberta, janelaFim: null }, config, T0)).toBe("ABERTA");
  });

  it("7. ABERTURA_PENDENTE: não iniciada e agora ≥ janelaInicio (urna nunca abre sozinha)", () => {
    expect(resolverSituacaoEvento(naoIniciada, config, Date.parse(naoIniciada.janelaInicio!))).toBe("ABERTURA_PENDENTE");
  });

  it("8. NAO_INICIADA (inclusive sem janelaInicio)", () => {
    expect(resolverSituacaoEvento(naoIniciada, config, T0)).toBe("NAO_INICIADA");
    expect(resolverSituacaoEvento({ ...naoIniciada, janelaInicio: null }, config, T0)).toBe("NAO_INICIADA");
  });
});

describe("chamadaDaSituacao", () => {
  it("segue a tabela 5.1", () => {
    expect(chamadaDaSituacao("CONCLUIDO")).toEqual({ rotulo: null, desabilitado: false, linkJurado: false, previa: true });
    expect(chamadaDaSituacao("EM_PREPARACAO")).toEqual({ rotulo: "Em breve", desabilitado: true, linkJurado: false, previa: false });
    expect(chamadaDaSituacao("ENCERRADA").rotulo).toBeNull();
    expect(chamadaDaSituacao("TEMPO_ESGOTADO").rotulo).toBe("Quero votar");
    expect(chamadaDaSituacao("RETA_FINAL").linkJurado).toBe(true);
    expect(chamadaDaSituacao("ABERTURA_PENDENTE").rotulo).toBe("Criar conta");
    expect(chamadaDaSituacao("NAO_INICIADA").rotulo).toBe("Criar conta");
  });
});

describe("votacaoAberta (botões de votar)", () => {
  it("só com o evento ATIVO e a urna ABERTA", () => {
    expect(votacaoAberta({ estado: "ATIVO", estadoUrna: "ABERTA" })).toBe(true);
    expect(votacaoAberta({ estado: "ATIVO", estadoUrna: "NAO_INICIADA" })).toBe(false);
    expect(votacaoAberta({ estado: "ATIVO", estadoUrna: "ENCERRADA" })).toBe(false);
    expect(votacaoAberta({ estado: "RASCUNHO", estadoUrna: "ABERTA" })).toBe(false);
    expect(votacaoAberta({ estado: "CONCLUIDO", estadoUrna: "ABERTA" })).toBe(false);
  });
});
