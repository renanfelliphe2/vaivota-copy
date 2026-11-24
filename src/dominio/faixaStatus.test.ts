import { describe, expect, it } from "vitest";
import { resolverFaixaStatus } from "./faixaStatus";
import type { SituacaoEvento } from "./situacaoEvento";

const INICIO = 1_000;
const FIM = 9_000;
const faixa = (situacao: SituacaoEvento, votouTudo = false, janelaInicioMs: number | null = INICIO, janelaFimMs: number | null = FIM) =>
  resolverFaixaStatus({ situacao, votouTudo, janelaInicioMs, janelaFimMs });

describe("faixa de status (A2)", () => {
  it("agrupa os estados em quatro selos", () => {
    const selos = (["EM_PREPARACAO", "NAO_INICIADA", "ABERTURA_PENDENTE", "ABERTA", "RETA_FINAL", "TEMPO_ESGOTADO", "ENCERRADA", "CONCLUIDO"] as const).map(
      (s) => faixa(s).selo,
    );
    expect(selos).toEqual(["NAO_INICIADA", "NAO_INICIADA", "NAO_INICIADA", "ABERTA", "ABERTA", "ENCERRADA", "ENCERRADA", "ENCERRADA"]);
  });

  it("quem votou em tudo vê Votado com a votação aberta, e o tempo continua", () => {
    expect(faixa("ABERTA", true)).toEqual({ selo: "VOTADO", contagem: { alvoMs: FIM, rotulo: "Termina em" } });
    expect(faixa("RETA_FINAL", true)).toEqual({ selo: "VOTADO", contagem: { alvoMs: FIM, rotulo: "Termina em" } });
  });

  it("depois de encerrada, Encerrada sem tempo, mesmo para quem votou", () => {
    for (const s of ["TEMPO_ESGOTADO", "ENCERRADA", "CONCLUIDO"] as const) expect(faixa(s, true)).toEqual({ selo: "ENCERRADA", contagem: null });
  });

  it("Abre em… só antes da abertura e com data marcada", () => {
    expect(faixa("NAO_INICIADA").contagem).toEqual({ alvoMs: INICIO, rotulo: "Abre em" });
    expect(faixa("NAO_INICIADA", false, null).contagem).toBeNull();
    expect(faixa("ABERTURA_PENDENTE").contagem).toBeNull();
    expect(faixa("EM_PREPARACAO").contagem).toBeNull();
  });

  it("aberta sem fim marcado: sem tempo", () => {
    expect(faixa("ABERTA", false, INICIO, null)).toEqual({ selo: "ABERTA", contagem: null });
  });
});
