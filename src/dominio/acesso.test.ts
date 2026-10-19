import { describe, expect, it } from "vitest";
import { ehRotaInterna, resolverAcesso } from "./acesso";

const visitante = { logado: false, emailVerificado: false, papel: null };
const naoVerificado = { logado: true, emailVerificado: false, papel: null };
const publico = { logado: true, emailVerificado: true, papel: "PUBLICO" as const };
const admin = { logado: true, emailVerificado: true, papel: "ADMIN" as const };

describe("resolverAcesso", () => {
  it("LOGADO nega visitante e aceita qualquer sessão", () => {
    expect(resolverAcesso({ tipo: "LOGADO" }, visitante)).toEqual({ ok: false, motivo: "DESLOGADO" });
    expect(resolverAcesso({ tipo: "LOGADO" }, naoVerificado)).toEqual({ ok: true });
  });

  it("EMAIL_VERIFICADO nega visitante e não verificado", () => {
    expect(resolverAcesso({ tipo: "EMAIL_VERIFICADO" }, visitante)).toEqual({ ok: false, motivo: "DESLOGADO" });
    expect(resolverAcesso({ tipo: "EMAIL_VERIFICADO" }, naoVerificado)).toEqual({
      ok: false,
      motivo: "EMAIL_NAO_VERIFICADO",
    });
    expect(resolverAcesso({ tipo: "EMAIL_VERIFICADO" }, publico)).toEqual({ ok: true });
  });

  it("PAPEL exige um dos papéis listados", () => {
    const exigencia = { tipo: "PAPEL", papeis: ["ADMIN"] } as const;
    expect(resolverAcesso({ ...exigencia, papeis: [...exigencia.papeis] }, publico)).toEqual({
      ok: false,
      motivo: "PAPEL_INSUFICIENTE",
    });
    expect(resolverAcesso({ tipo: "PAPEL", papeis: ["ADMIN"] }, admin)).toEqual({ ok: true });
    expect(resolverAcesso({ tipo: "PAPEL", papeis: ["ADMIN"] }, { ...publico, papel: null })).toEqual({
      ok: false,
      motivo: "PAPEL_INSUFICIENTE",
    });
    expect(resolverAcesso({ tipo: "PAPEL", papeis: ["ADMIN"] }, visitante)).toEqual({
      ok: false,
      motivo: "DESLOGADO",
    });
  });
});

describe("ehRotaInterna", () => {
  it("aceita só caminhos internos", () => {
    expect(ehRotaInterna("/e/maratona-tech-tivit/votar")).toBe(true);
    expect(ehRotaInterna("//evil.com")).toBe(false);
    expect(ehRotaInterna("/\\evil.com")).toBe(false);
    expect(ehRotaInterna("https://evil.com")).toBe(false);
    expect(ehRotaInterna("")).toBe(false);
    // o parser de URL remove TAB e quebras de linha: "/<TAB>/evil.com" vira "//evil.com"
    expect(ehRotaInterna("/\t/evil.com")).toBe(false);
    expect(ehRotaInterna("/\n/evil.com")).toBe(false);
    expect(ehRotaInterna("/\r/evil.com")).toBe(false);
    expect(ehRotaInterna("/ /evil.com")).toBe(false);
    expect(ehRotaInterna("/e/maratona-tech-tivit?candidato=k1#candidatos")).toBe(true);
    expect(ehRotaInterna(null)).toBe(false);
  });
});
