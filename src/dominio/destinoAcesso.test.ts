import { describe, expect, it } from "vitest";
import { resolverDestinoAcesso, rotaVerificarEmail } from "./destinoAcesso";

const base = { slug: "semana-tech", de: null, emailVerificado: true, papel: "PUBLICO" as const, acao: "VOTAR" as const };

describe("resolverDestinoAcesso (tabela 5.3)", () => {
  it("1. e-mail não verificado vai à tela de código, mantendo ?de=", () => {
    expect(resolverDestinoAcesso({ ...base, emailVerificado: false })).toBe("/e/semana-tech/verificar-email");
    expect(resolverDestinoAcesso({ ...base, emailVerificado: false, de: "/e/semana-tech/votar" })).toBe(
      "/e/semana-tech/verificar-email?de=%2Fe%2Fsemana-tech%2Fvotar",
    );
  });

  it("2. ?de= interno vence papel e ação", () => {
    expect(resolverDestinoAcesso({ ...base, papel: "ADMIN", de: "/e/semana-tech/convite" })).toBe("/e/semana-tech/convite");
  });

  it("?de= externo é ignorado", () => {
    expect(resolverDestinoAcesso({ ...base, de: "//evil.com" })).toBe("/e/semana-tech#candidatos");
    expect(resolverDestinoAcesso({ ...base, de: "https://evil.com" })).toBe("/e/semana-tech#candidatos");
    expect(rotaVerificarEmail("semana-tech", "//evil.com")).toBe("/e/semana-tech/verificar-email");
  });

  it("3. admin vai ao painel", () => {
    expect(resolverDestinoAcesso({ ...base, papel: "ADMIN", acao: "PAINEL_ADMIN" })).toBe("/e/semana-tech/admin");
  });

  it("4. ações de voto vão à seção de votação da entrada", () => {
    for (const acao of ["VOTAR", "VOTAR_JURADO", "ALTERAR_VOTO_JURADO", "VER_CONFIRMACAO"] as const) {
      expect(resolverDestinoAcesso({ ...base, acao })).toBe("/e/semana-tech#candidatos");
    }
  });

  it("5. qualquer outra fica na entrada", () => {
    expect(resolverDestinoAcesso({ ...base, acao: "NENHUMA" })).toBe("/e/semana-tech");
    expect(resolverDestinoAcesso({ ...base, acao: "ENTRAR_OU_CRIAR" })).toBe("/e/semana-tech");
  });
});
