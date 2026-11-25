import { describe, expect, it } from "vitest";
import { conexaoTotem, ehSituacaoTotem, SINCRONIZACAO_TOTEM, ultimoContatoMs } from "./totem";

const T0 = Date.parse("2026-11-24T20:00:00.000Z");
const em = (ms: number) => new Date(T0 + ms).toISOString();
const base = { estado: "ATIVO" as const, ultimoSinalEm: null, ultimoUsoEm: null, sincronizacaoPedidaEm: null };
const MIN = 60_000;

describe("conexão do totem (página Totens)", () => {
  it("nunca sincronizou", () => {
    expect(conexaoTotem(base, T0)).toBe("NUNCA");
  });

  it("conectado até 1 h + tolerância depois do último relatório; depois, sem sinal", () => {
    const t = { ...base, ultimoSinalEm: em(0) };
    expect(conexaoTotem(t, T0 + 30 * MIN)).toBe("CONECTADO");
    expect(conexaoTotem(t, T0 + SINCRONIZACAO_TOTEM.intervaloMs + SINCRONIZACAO_TOTEM.toleranciaMs)).toBe("CONECTADO");
    expect(conexaoTotem(t, T0 + SINCRONIZACAO_TOTEM.intervaloMs + SINCRONIZACAO_TOTEM.toleranciaMs + 1)).toBe("SEM_SINAL");
  });

  it("um voto também conta como contato", () => {
    const t = { ...base, ultimoSinalEm: em(0), ultimoUsoEm: em(90 * MIN) };
    expect(ultimoContatoMs(t)).toBe(T0 + 90 * MIN);
    expect(conexaoTotem(t, T0 + 100 * MIN)).toBe("CONECTADO");
  });

  it("forçar sincronização: sincronizando, depois sem resposta; a resposta volta a conectado", () => {
    const pedido = { ...base, ultimoSinalEm: em(0), sincronizacaoPedidaEm: em(10 * MIN) };
    expect(conexaoTotem(pedido, T0 + 10 * MIN + 5_000)).toBe("SINCRONIZANDO");
    expect(conexaoTotem(pedido, T0 + 10 * MIN + SINCRONIZACAO_TOTEM.esperaRespostaMs + 1)).toBe("SEM_RESPOSTA");
    expect(conexaoTotem({ ...pedido, ultimoSinalEm: em(10 * MIN + 8_000) }, T0 + 11 * MIN)).toBe("CONECTADO");
  });

  it("revogado fica fora", () => {
    expect(conexaoTotem({ ...base, estado: "REVOGADO", ultimoSinalEm: em(0) }, T0)).toBe("REVOGADO");
  });

  it("só aceita situações conhecidas", () => {
    expect(ehSituacaoTotem("VOTANDO")).toBe(true);
    expect(ehSituacaoTotem("QUALQUER")).toBe(false);
    expect(ehSituacaoTotem(null)).toBe(false);
  });
});
