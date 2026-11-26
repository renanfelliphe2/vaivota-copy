import { describe, expect, it } from "vitest";
import { TEMPOS_TOTEM } from "@/dominio/totem";
import { depoisDoTempo, limiteDoPasso, logsDaEscolha, PASSO_INICIO, PASSO_PROXIMO, toqueReiniciaContagem, type PassoTotem } from "./passosTotem";

const escolha: PassoTotem = { tipo: "ESCOLHA" };
const confirmar: PassoTotem = { tipo: "CONFIRMAR", candidatoId: "c1" };
const enviando: PassoTotem = { tipo: "ENVIANDO", candidatoId: "c1", idEnvio: "x" };
const sucesso: PassoTotem = { tipo: "SUCESSO", votosSessao: 3 };
const erro: PassoTotem = { tipo: "ERRO", candidatoId: "c1", idEnvio: "x" };

describe("passos do totem", () => {
  it("depois do voto vai para a escolha do próximo, não para o início", () => {
    expect(depoisDoTempo(sucesso)).toEqual({ proximo: PASSO_PROXIMO });
  });

  it("a escolha do próximo espera 15 s e volta ao início sem contar desistência", () => {
    expect(limiteDoPasso(PASSO_PROXIMO)).toBe(15_000);
    expect(limiteDoPasso(PASSO_PROXIMO)).toBe(TEMPOS_TOTEM.esperaProximoMs);
    expect(depoisDoTempo(PASSO_PROXIMO)).toEqual({ proximo: PASSO_INICIO });
    expect(toqueReiniciaContagem(PASSO_PROXIMO)).toBe(true);
  });

  it("a escolha comum (vinda do início ou do Voltar) segue como antes", () => {
    expect(limiteDoPasso(escolha)).toBe(TEMPOS_TOTEM.inatividadeMs);
    expect(depoisDoTempo(escolha)).toEqual({ proximo: PASSO_INICIO, log: "DESISTIU_ESCOLHA" });
    expect(depoisDoTempo(confirmar)).toEqual({ proximo: PASSO_INICIO, log: "DESISTIU_CONFIRMAR" });
    expect(depoisDoTempo(erro)).toEqual({ proximo: PASSO_INICIO, log: "ERRO_DESCARTADO" });
  });

  it("início e envio não seguem sozinhos", () => {
    expect(limiteDoPasso(PASSO_INICIO)).toBeNull();
    expect(limiteDoPasso(enviando)).toBeNull();
    expect(toqueReiniciaContagem(enviando)).toBe(false);
    expect(toqueReiniciaContagem(sucesso)).toBe(false);
  });

  it("na escolha do próximo, o cartaz escolhido também conta como começo no funil", () => {
    expect(logsDaEscolha(PASSO_PROXIMO)).toEqual(["COMECOU", "ESCOLHEU"]);
    expect(logsDaEscolha(escolha)).toEqual(["ESCOLHEU"]);
  });
});
