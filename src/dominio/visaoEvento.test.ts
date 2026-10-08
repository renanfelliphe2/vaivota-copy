import { describe, expect, it } from "vitest";
import { resolverVisaoEvento, type EntradaVisao } from "./visaoEvento";

// Matriz 5.4 da Etapa 2 (E13, slug inexistente, é do gate da Etapa 0 e não passa por aqui).

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

function visao(evento: EntradaVisao["evento"], sessao: EntradaVisao["sessao"], extra: Partial<EntradaVisao> = {}) {
  return resolverVisaoEvento({ evento, configApresentacao: config, agoraMs: T0, sessao, qtdVotaveis: 8, ...extra });
}

describe("resolverVisaoEvento (matriz E1–E18)", () => {
  it("E1 não iniciada, visitante", () => {
    const v = visao(festival, visitante);
    expect([v.variante, v.acao, v.situacao]).toEqual(["NAO_INICIADA", "ENTRAR_OU_CRIAR", "NAO_INICIADA"]);
    expect(v.mostrarCodigoConvite).toBe(false);
  });

  it("E2 não iniciada, logado verificado (sem participação no Festival = público)", () => {
    const v = visao(festival, anaSemParticipacao);
    expect([v.variante, v.acao]).toEqual(["NAO_INICIADA", "NENHUMA"]);
    expect(v.mostrarCodigoConvite).toBe(true);
  });

  it("E3 aberta, visitante", () => {
    const v = visao(semanaTech, visitante);
    expect([v.variante, v.acao]).toEqual(["ABERTA", "ENTRAR_OU_CRIAR"]);
  });

  it("E4 aberta, público que não votou: VOTAR + link de convite", () => {
    const v = visao(semanaTech, ana);
    expect([v.variante, v.acao, v.mostrarCodigoConvite, v.seloVoto]).toEqual(["ABERTA", "VOTAR", true, null]);
  });

  it("E5 aberta, público que já votou", () => {
    const v = visao(semanaTech, eva);
    expect([v.acao, v.seloVoto, v.mostrarCodigoConvite]).toEqual(["VER_CONFIRMACAO", "REGISTRADO", false]);
  });

  it("E6 aberta, jurado que não votou", () => {
    const v = visao(semanaTech, bruno);
    expect([v.acao, v.mostrarCodigoConvite]).toEqual(["VOTAR_JURADO", false]);
  });

  it("E7 aberta, jurado que já votou", () => {
    const v = visao(semanaTech, fabio);
    expect([v.acao, v.seloVoto]).toEqual(["ALTERAR_VOTO_JURADO", "REGISTRADO_JURADO"]);
  });

  it("E8 urna encerrada: sem ação; agradece quem votou", () => {
    const encerrada = { ...semanaTech, estadoUrna: "ENCERRADA" as const };
    expect([visao(encerrada, visitante).variante, visao(encerrada, visitante).acao]).toEqual(["ENCERRADA", "NENHUMA"]);
    expect(visao(encerrada, eva).agradecer).toBe(true);
    expect(visao(encerrada, ana).agradecer).toBe(false);
  });

  it("E9 evento concluído", () => {
    const v = visao({ ...semanaTech, estado: "CONCLUIDO" }, ana);
    expect([v.variante, v.acao]).toEqual(["CONCLUIDO", "NENHUMA"]);
  });

  it("E10 rascunho, não admin: indisponível", () => {
    const rascunho = { ...semanaTech, estado: "RASCUNHO" as const };
    for (const sessao of [visitante, ana]) {
      const v = visao(rascunho, sessao);
      expect([v.variante, v.acao, v.bannerRascunho]).toEqual(["INDISPONIVEL", "NENHUMA", false]);
    }
  });

  it("E11 rascunho, admin do evento: variante da urna + banner", () => {
    const v = visao({ ...semanaTech, estado: "RASCUNHO" }, carla);
    expect([v.variante, v.acao, v.bannerRascunho]).toEqual(["ABERTA", "PAINEL_ADMIN", true]);
  });

  it("E12 aberta sem votáveis", () => {
    const v = visao(semanaTech, visitante, { qtdVotaveis: 0 });
    expect([v.variante, v.acao]).toEqual(["SEM_CANDIDATOS", "NENHUMA"]);
    // urna não iniciada com zero votáveis continua NAO_INICIADA
    expect(visao(festival, visitante, { qtdVotaveis: 0 }).variante).toBe("NAO_INICIADA");
  });

  it("E14 admin em qualquer estado: PAINEL_ADMIN", () => {
    for (const evento of [semanaTech, festival, { ...semanaTech, estadoUrna: "ENCERRADA" as const }, { ...semanaTech, estado: "CONCLUIDO" as const }]) {
      expect(visao(evento, carla).acao).toBe("PAINEL_ADMIN");
    }
  });

  it("E15 logado, e-mail não verificado: VERIFICAR_EMAIL e sem link de convite", () => {
    for (const evento of [semanaTech, festival]) {
      const v = visao(evento, davi);
      expect([v.acao, v.mostrarCodigoConvite]).toEqual(["VERIFICAR_EMAIL", false]);
    }
  });

  it("E16 jurado com módulo júri desligado: sem botão, com aviso", () => {
    const v = visao({ ...semanaTech, moduloJuri: false }, bruno);
    expect([v.variante, v.acao, v.avisoJuriDesligado]).toEqual(["ABERTA", "NENHUMA", true]);
    expect(visao(semanaTech, bruno).avisoJuriDesligado).toBe(false);
  });

  it("E17 tempo esgotado: continua ABERTA, ação conforme a sessão", () => {
    const fim = Date.parse(semanaTech.janelaFim!);
    const v = visao(semanaTech, ana, { agoraMs: fim + 60_000 });
    expect([v.variante, v.situacao, v.acao]).toEqual(["ABERTA", "TEMPO_ESGOTADO", "VOTAR"]);
  });

  it("E18 admin de outro evento é usuário comum (participação PUBLICO aqui)", () => {
    const hugoNaSemanaTech = { logado: true, papel: null, emailVerificado: true, jaVotou: false };
    expect(visao(semanaTech, hugoNaSemanaTech).acao).toBe("VOTAR");
  });
});
