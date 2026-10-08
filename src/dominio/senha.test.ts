import { describe, expect, it } from "vitest";
import { criarEstadoNucleo } from "@/mocks/criarEstadoNucleo";
import { SENHA_SEED } from "@/mocks/seed/usuarios";
import { hashSenha, senhaConfere } from "./senha";

describe("senha", () => {
  it("confere só a senha certa do próprio usuário", () => {
    const usuario = { id: "u1", senhaHash: hashSenha("u1", "festival2026") };
    expect(senhaConfere(usuario, "festival2026")).toBe(true);
    expect(senhaConfere(usuario, "festival2027")).toBe(false);
    expect(senhaConfere({ ...usuario, id: "u2" }, "festival2026")).toBe(false);
  });

  it("conta sem senha (Google) nunca confere", () => {
    expect(senhaConfere({ id: "u1", senhaHash: null }, "")).toBe(false);
  });

  it("as três contas do seed entram com a senha documentada e nenhuma guarda a senha em texto", () => {
    const { usuarios } = criarEstadoNucleo().banco;
    expect(usuarios).toHaveLength(3);
    for (const u of usuarios) {
      expect(senhaConfere(u, SENHA_SEED)).toBe(true);
      expect(JSON.stringify(u)).not.toContain(SENHA_SEED);
    }
  });
});
