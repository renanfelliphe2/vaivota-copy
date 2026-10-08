import { describe, expect, it } from "vitest";
import { resolverEstadoVotar } from "./estadoVotar";
import type { EntradaVisao } from "./visaoEvento";

// Seção 5.2 da Etapa 4 (linhas 1 a 10) e matriz V3–V20.

const T0 = Date.parse("2026-10-22T14:00:00-03:00");
const config = { limiarRetaFinalSegundos: 300 };

const semanaTech: EntradaVisao["evento"] = {
  estado: "ATIVO",
  estadoUrna: "ABERTA",
  janelaInicio: "2026-10-22T13:00:00-03:00",
  janelaFim: "2026-10-22T17:00:00-03:00",
  moduloJuri: true,
};
const festival: EntradaVisao["evento"] = {
  estado: "ATIVO",
  estadoUrna: "NAO_INICIADA",
  janelaInicio: "2026-11-25T10:00:00-03:00",
  janelaFim: "2026-11-28T20:00:00-03:00",
  moduloJuri: true,
};

const visitante = { logado: false, papel: null, emailVerificado: false, jaVotou: false };
const ana = { logado: true, papel: "PUBLICO" as const, emailVerificado: true, jaVotou: false };
const anaSemParticipacao = { ...ana, papel: null };
const eva = { ...ana, jaVotou: true };
const bruno = { logado: true, papel: "JURADO" as const, emailVerificado: true, jaVotou: false };
const fabio = { ...bruno, jaVotou: true };
const carla = { logado: true, papel: "ADMIN" as const, emailVerificado: true, jaVotou: false };
const davi = { logado: true, papel: null, emailVerificado: false, jaVotou: false };

function gate(evento: EntradaVisao["evento"], sessao: EntradaVisao["sessao"], extra: Partial<EntradaVisao> = {}) {
  return resolverEstadoVotar({ evento, configApresentacao: config, agoraMs: T0, sessao, qtdVotaveis: 8, ...extra });
}

describe("resolverEstadoVotar", () => {
  it("1: deslogado, e-mail não verificado ou sem participação → ACESSO_PENDENTE", () => {
    expect(gate(semanaTech, visitante).tela).toBe("ACESSO_PENDENTE");
    expect(gate(semanaTech, davi).tela).toBe("ACESSO_PENDENTE");
    expect(gate(semanaTech, anaSemParticipacao).tela).toBe("ACESSO_PENDENTE");
  });

  it("2: administrador em qualquer estado, inclusive rascunho (V8, V14)", () => {
    expect(gate(semanaTech, carla).tela).toBe("ADMIN_NAO_VOTA");
    expect(gate({ ...semanaTech, estado: "RASCUNHO" }, carla).tela).toBe("ADMIN_NAO_VOTA");
    expect(gate({ ...semanaTech, estado: "CONCLUIDO" }, carla).tela).toBe("ADMIN_NAO_VOTA");
  });

  it("3: rascunho para quem não é admin (V14)", () => {
    expect(gate({ ...semanaTech, estado: "RASCUNHO" }, ana).tela).toBe("INDISPONIVEL");
    expect(gate({ ...semanaTech, estado: "RASCUNHO", estadoUrna: "ENCERRADA" }, ana).tela).toBe("INDISPONIVEL");
  });

  it("4: concluído, mesmo com a urna aberta forçada (V13)", () => {
    expect(gate({ ...semanaTech, estado: "CONCLUIDO" }, ana).tela).toBe("CONCLUIDO");
  });

  it("5: encerrada, com agradecimento para quem votou (V12)", () => {
    const encerrada = { ...semanaTech, estadoUrna: "ENCERRADA" as const };
    expect(gate(encerrada, ana).tela).toBe("ENCERRADA");
    const r = gate(encerrada, eva);
    expect(r.tela).toBe("ENCERRADA");
    expect(r.visao.agradecer).toBe(true);
  });

  it("6: não iniciada e abertura pendente (V10, V11)", () => {
    expect(gate(festival, ana).tela).toBe("NAO_INICIADA");
    const fimDaJanela = Date.parse("2026-11-28T20:00:00-03:00");
    const r = gate(festival, ana, { agoraMs: fimDaJanela });
    expect(r.tela).toBe("NAO_INICIADA");
    expect(r.visao.situacao).toBe("ABERTURA_PENDENTE");
  });

  it("7: jurado com módulo júri desligado (V16)", () => {
    expect(gate({ ...semanaTech, moduloJuri: false }, bruno).tela).toBe("JURI_DESLIGADO");
    // público não é afetado
    expect(gate({ ...semanaTech, moduloJuri: false }, ana).tela).toBe("LISTA");
  });

  it("8: sem candidatos vem antes de já votou (V15, D9)", () => {
    expect(gate(semanaTech, ana, { qtdVotaveis: 0 }).tela).toBe("SEM_CANDIDATOS");
    expect(gate(semanaTech, eva, { qtdVotaveis: 0 }).tela).toBe("SEM_CANDIDATOS");
  });

  it("9: público que já votou; jurado que já votou segue para a lista (V4, V6)", () => {
    expect(gate(semanaTech, eva).tela).toBe("JA_VOTOU");
    const r = gate(semanaTech, fabio);
    expect([r.tela, r.papelVoto]).toEqual(["LISTA", "JURADO"]);
  });

  it("10: lista com o papel de voto (V3, V5)", () => {
    expect(gate(semanaTech, ana)).toMatchObject({ tela: "LISTA", papelVoto: "PUBLICO", avisoTempoEsgotado: false });
    expect(gate(semanaTech, bruno)).toMatchObject({ tela: "LISTA", papelVoto: "JURADO" });
  });

  it("tempo esgotado continua votável, com aviso (V17)", () => {
    const fim = Date.parse("2026-10-22T17:00:00-03:00");
    const r = gate(semanaTech, ana, { agoraMs: fim + 60_000 });
    expect([r.tela, r.avisoTempoEsgotado]).toEqual(["LISTA", true]);
  });

  it("urna aberta pela toolbar antes do início da janela mostra a lista (seção 5.3)", () => {
    expect(gate({ ...festival, estadoUrna: "ABERTA" }, ana).tela).toBe("LISTA");
  });

  it("papelVoto e aviso só existem na lista", () => {
    const r = gate(festival, bruno);
    expect([r.papelVoto, r.avisoTempoEsgotado]).toEqual([null, false]);
  });
});
