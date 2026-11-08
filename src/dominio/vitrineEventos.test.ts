import { describe, expect, it } from "vitest";
import { legendaDaVotacao, momentoDaVotacao, statusNaVitrine, votacaoJaAconteceu } from "./vitrineEventos";

const SEM_DATAS = { urnaAbertaEm: null, urnaEncerradaEm: null, concluidoEm: null, janelaInicio: null };
const FUSO = "America/Sao_Paulo";

describe("votacaoJaAconteceu (vitrine 'A cara do seu evento')", () => {
  it("entra quem já abriu a urna alguma vez ou foi concluído", () => {
    expect(votacaoJaAconteceu({ estado: "ATIVO", estadoUrna: "ABERTA" })).toBe(true);
    expect(votacaoJaAconteceu({ estado: "ATIVO", estadoUrna: "ENCERRADA" })).toBe(true);
    expect(votacaoJaAconteceu({ estado: "CONCLUIDO", estadoUrna: "ENCERRADA" })).toBe(true);
    expect(votacaoJaAconteceu({ estado: "CONCLUIDO", estadoUrna: "NAO_INICIADA" })).toBe(true);
  });

  it("fica de fora o evento que ainda não votou e o rascunho, mesmo com a urna aberta", () => {
    expect(votacaoJaAconteceu({ estado: "ATIVO", estadoUrna: "NAO_INICIADA" })).toBe(false);
    expect(votacaoJaAconteceu({ estado: "RASCUNHO", estadoUrna: "ABERTA" })).toBe(false);
  });
});

describe("momentoDaVotacao", () => {
  it("usa o encerramento, depois a abertura, a conclusão e o início da janela", () => {
    const abertura = "2026-10-22T13:00:00.000-03:00";
    const fim = "2026-10-22T17:15:00.000-03:00";
    expect(momentoDaVotacao({ ...SEM_DATAS, urnaAbertaEm: abertura, urnaEncerradaEm: fim })).toBe(Date.parse(fim));
    expect(momentoDaVotacao({ ...SEM_DATAS, urnaAbertaEm: abertura })).toBe(Date.parse(abertura));
    expect(momentoDaVotacao(SEM_DATAS)).toBe(0);
  });
});

describe("legendaDaVotacao", () => {
  const base = { ...SEM_DATAS, fusoHorario: FUSO };

  it("aberta, encerrada e concluída, com a data no fuso do evento", () => {
    expect(legendaDaVotacao({ ...base, estado: "ATIVO", estadoUrna: "ABERTA" })).toBe("Votação aberta agora");
    // 22/10 às 23h30 em São Paulo já é 23/10 em UTC: vale a data do evento.
    const tarde = "2026-10-23T02:30:00.000Z";
    expect(legendaDaVotacao({ ...base, estado: "ATIVO", estadoUrna: "ENCERRADA", urnaEncerradaEm: tarde })).toBe("Votação encerrada em 22/10/2026");
    expect(legendaDaVotacao({ ...base, estado: "CONCLUIDO", estadoUrna: "ENCERRADA", urnaEncerradaEm: tarde, concluidoEm: "2026-10-25T15:00:00.000Z" })).toBe(
      "Concluída em 25/10/2026",
    );
  });
});

describe("statusNaVitrine", () => {
  it("evento ativo com a urna aberta: votação aberta, primeiro da lista", () => {
    expect(statusNaVitrine({ estado: "ATIVO", estadoUrna: "ABERTA" })).toEqual({
      rotulo: "Votação aberta",
      tom: "aberta",
      prioridade: 0,
    });
  });

  it("evento ativo com a urna ainda não iniciada: em breve", () => {
    expect(statusNaVitrine({ estado: "ATIVO", estadoUrna: "NAO_INICIADA" })).toMatchObject({ tom: "breve", prioridade: 1 });
  });

  it("urna encerrada, com o evento ainda ativo: encerrada", () => {
    expect(statusNaVitrine({ estado: "ATIVO", estadoUrna: "ENCERRADA" })).toMatchObject({ tom: "encerrada", prioridade: 2 });
  });

  it("evento concluído é encerrado qualquer que seja o estado da urna", () => {
    for (const estadoUrna of ["NAO_INICIADA", "ABERTA", "ENCERRADA"] as const) {
      expect(statusNaVitrine({ estado: "CONCLUIDO", estadoUrna })).toMatchObject({ tom: "encerrada", prioridade: 2 });
    }
  });

  it("a urna aberta de um rascunho não conta como votação aberta", () => {
    expect(statusNaVitrine({ estado: "RASCUNHO", estadoUrna: "ABERTA" })).toMatchObject({ tom: "breve" });
  });
});
