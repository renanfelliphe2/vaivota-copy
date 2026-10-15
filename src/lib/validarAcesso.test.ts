import { describe, expect, it } from "vitest";
import {
  canonicoGmail,
  limparCodigoLogin,
  normalizarEmail,
  validarCodigoLogin,
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarSenha,
} from "./validarAcesso";

describe("validarAcesso", () => {
  it("e-mail", () => {
    expect(validarEmail("publico@demo.com")).toBeNull();
    expect(validarEmail("  publico@demo.com ")).toBeNull();
    expect(validarEmail("")).toBe("Informe seu e-mail.");
    expect(validarEmail("publico@demo")).not.toBeNull();
    expect(validarEmail("publico demo@x.com")).not.toBeNull();
  });

  it("normalizarEmail", () => {
    expect(normalizarEmail("  Publico@Demo.COM ")).toBe("publico@demo.com");
  });

  it("nome", () => {
    expect(validarNome("Ana")).toBeNull();
    expect(validarNome("  ")).toBe("Informe seu nome.");
    expect(validarNome("A")).not.toBeNull();
    expect(validarNome("x".repeat(121))).not.toBeNull();
  });

  it("código de login: 6 dígitos", () => {
    expect(validarCodigoLogin("123456")).toBeNull();
    expect(validarCodigoLogin("12345")).not.toBeNull();
    expect(validarCodigoLogin("12a456")).not.toBeNull();
    expect(limparCodigoLogin("12-34 56 78")).toBe("123456");
  });
});

describe("senha (08/10/2026)", () => {
  it("exige de 8 a 72 caracteres, sem regra de símbolo", () => {
    expect(validarSenha("")).toBe("Informe a senha.");
    expect(validarSenha("1234567")).toBe("Use pelo menos 8 caracteres.");
    expect(validarSenha("abcdefgh")).toBeNull();
    expect(validarSenha("a".repeat(73))).toBe("Use no máximo 72 caracteres.");
  });

  it("confirmação igual à senha", () => {
    expect(validarConfirmacaoSenha("demo1234", "")).toBe("Repita a senha.");
    expect(validarConfirmacaoSenha("demo1234", "demo12345")).toBe("As senhas não são iguais.");
    expect(validarConfirmacaoSenha("demo1234", "demo1234")).toBeNull();
  });
});

describe("canonicoGmail", () => {
  it("tira pontos e +etiqueta do Gmail e do Googlemail; outros domínios não têm forma canônica", () => {
    expect(canonicoGmail("Fulana.Silva+voto@Gmail.com")).toBe("fulanasilva");
    expect(canonicoGmail("f.u.l.a.n.a.s.i.l.v.a@googlemail.com")).toBe("fulanasilva");
    expect(canonicoGmail("fulana@outlook.com")).toBeNull();
    expect(canonicoGmail("sem-arroba")).toBeNull();
  });
});
