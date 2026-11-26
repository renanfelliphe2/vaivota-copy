import { describe, expect, it } from "vitest";
import { lerEmailFrom, montarRemetente } from "./remetente";

describe("remetente dos e-mails", () => {
  it("lê o EMAIL_FROM em qualquer um dos formatos", () => {
    expect(lerEmailFrom("votacao@vaivota.space")).toEqual({ nome: null, endereco: "votacao@vaivota.space" });
    expect(lerEmailFrom("<votacao@vaivota.space>")).toEqual({ nome: null, endereco: "votacao@vaivota.space" });
    expect(lerEmailFrom("Semana Tech <votacao@vaivota.space>")).toEqual({ nome: "Semana Tech", endereco: "votacao@vaivota.space" });
    expect(lerEmailFrom(' "VaiVota" < votacao@vaivota.space > ')).toEqual({ nome: "VaiVota", endereco: "votacao@vaivota.space" });
  });

  it("usa o nome do evento, com o endereço da configuração", () => {
    expect(montarRemetente("Semana Tech <votacao@vaivota.space>", "9º Festival Ver e Fazer Filmes")).toBe(
      '"9º Festival Ver e Fazer Filmes" <votacao@vaivota.space>',
    );
  });

  it("sem evento: o nome do EMAIL_FROM, e sem nome nenhum, VaiVota", () => {
    expect(montarRemetente("Semana Tech <votacao@vaivota.space>", null)).toBe('"Semana Tech" <votacao@vaivota.space>');
    expect(montarRemetente("<votacao@vaivota.space>", "   ")).toBe('"VaiVota" <votacao@vaivota.space>');
    expect(montarRemetente("votacao@vaivota.space", undefined)).toBe('"VaiVota" <votacao@vaivota.space>');
  });

  it("tira do nome o que quebraria o cabeçalho e limita o tamanho", () => {
    expect(montarRemetente("votacao@vaivota.space", 'Mostra "Especial" <2026>\r\nBcc: x@y.z')).toBe(
      '"Mostra Especial 2026 Bcc: x@y.z" <votacao@vaivota.space>',
    );
    const longo = montarRemetente("votacao@vaivota.space", "A".repeat(200));
    expect(longo).toBe(`"${"A".repeat(70)}" <votacao@vaivota.space>`);
  });
});
