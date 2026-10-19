import { describe, expect, it } from "vitest";
import { resolverDestinoAcesso, rotaVerificarEmail } from "./destinoAcesso";

const base = { slug: "maratona-tech-tivit", de: null, emailVerificado: true, papel: "PUBLICO" as const, acao: "VOTAR" as const };

describe("resolverDestinoAcesso (tabela 5.3)", () => {
  it("1. e-mail não verificado vai à tela de código, mantendo ?de=", () => {
    expect(resolverDestinoAcesso({ ...base, emailVerificado: false })).toBe("/e/maratona-tech-tivit/verificar-email");
    expect(resolverDestinoAcesso({ ...base, emailVerificado: false, de: "/e/maratona-tech-tivit/votar" })).toBe(
      "/e/maratona-tech-tivit/verificar-email?de=%2Fe%2Fmaratona-tech-tivit%2Fvotar",
    );
  });

  it("2. ?de= interno vence papel e ação", () => {
    expect(resolverDestinoAcesso({ ...base, papel: "ADMIN", de: "/e/maratona-tech-tivit/convite" })).toBe("/e/maratona-tech-tivit/convite");
  });

  it("?de= externo é ignorado", () => {
    expect(resolverDestinoAcesso({ ...base, de: "//evil.com" })).toBe("/e/maratona-tech-tivit#candidatos");
    expect(resolverDestinoAcesso({ ...base, de: "https://evil.com" })).toBe("/e/maratona-tech-tivit#candidatos");
    expect(rotaVerificarEmail("maratona-tech-tivit", "//evil.com")).toBe("/e/maratona-tech-tivit/verificar-email");
  });

  it("3. admin vai ao painel", () => {
    expect(resolverDestinoAcesso({ ...base, papel: "ADMIN", acao: "PAINEL_ADMIN" })).toBe("/e/maratona-tech-tivit/admin");
  });

  it("4. ações de voto vão à seção de votação da entrada", () => {
    for (const acao of ["VOTAR", "VOTAR_JURADO", "ALTERAR_VOTO_JURADO", "VER_CONFIRMACAO"] as const) {
      expect(resolverDestinoAcesso({ ...base, acao })).toBe("/e/maratona-tech-tivit#candidatos");
    }
  });

  it("5. qualquer outra fica na entrada", () => {
    expect(resolverDestinoAcesso({ ...base, acao: "NENHUMA" })).toBe("/e/maratona-tech-tivit");
    expect(resolverDestinoAcesso({ ...base, acao: "ENTRAR_OU_CRIAR" })).toBe("/e/maratona-tech-tivit");
  });
});
