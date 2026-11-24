import { describe, expect, it } from "vitest";
import { descreverAuditoria } from "./auditoria";
import { descreverReset, normalizarOpcoesReset, OPCOES_RESET_VAZIAS, votosObrigatorios } from "./resetEvento";

describe("opções do reset (E1)", () => {
  it("nada marcado continua nada marcado", () => {
    expect(normalizarOpcoesReset(OPCOES_RESET_VAZIAS)).toEqual(OPCOES_RESET_VAZIAS);
    expect(votosObrigatorios(OPCOES_RESET_VAZIAS)).toBe(false);
  });

  it("só os votos podem ser zerados sozinhos", () => {
    expect(normalizarOpcoesReset({ ...OPCOES_RESET_VAZIAS, votos: true })).toEqual({ ...OPCOES_RESET_VAZIAS, votos: true });
  });

  it.each(["contasPublico", "jurados", "totens"] as const)("%s marca os votos junto", (chave) => {
    const opcoes = { ...OPCOES_RESET_VAZIAS, [chave]: true };
    expect(votosObrigatorios(opcoes)).toBe(true);
    expect(normalizarOpcoesReset(opcoes)).toEqual({ ...opcoes, votos: true });
  });
});

describe("descrição na auditoria", () => {
  it("lista o que foi zerado, na ordem do modal", () => {
    expect(descreverReset({ votos: true, contasPublico: false, jurados: true, totens: true })).toBe(
      "Evento resetado para rascunho: votos, jurados e totens pareados zerados",
    );
    expect(descreverReset({ votos: true })).toBe("Evento resetado para rascunho: votos zerados");
    expect(descreverReset({ ...OPCOES_RESET_VAZIAS })).toBe("Evento resetado para rascunho (nada zerado)");
    expect(descreverReset(null)).toBe("Evento resetado para rascunho (nada zerado)");
  });

  it("o catálogo da auditoria usa os detalhes gravados", () => {
    expect(
      descreverAuditoria({ acao: "EVENTO_RESETADO", entidade: "evento", detalhes: { zerado: { ...OPCOES_RESET_VAZIAS, votos: true } } }),
    ).toBe("Evento resetado para rascunho: votos zerados");
  });
});
