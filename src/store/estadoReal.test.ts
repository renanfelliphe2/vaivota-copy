import { describe, expect, it } from "vitest";
import { aplicarEstadoDoServidor, bancoDoServidor, criarEstadoDoServidor } from "./estadoReal";

import { AGORA, evento, publico } from "./estadoPublicoDeTeste";

describe("bancoDoServidor", () => {
  it("monta o banco só com o estado público e nunca com votos, auditoria, resultados ou senha", () => {
    const { banco, sessao } = bancoDoServidor(publico());
    expect(banco.eventos).toHaveLength(1);
    expect(banco.candidatos.map((c) => c.id)).toEqual(["k1", "k2"]);
    expect(banco.participacoes).toHaveLength(1);
    expect(banco.usuarios).toHaveLength(1);
    expect(banco.usuarios[0].senhaHash).toBeNull();
    expect(banco.usuarios[0].emailVerificadoEm).not.toBeNull();
    expect(banco.votos).toEqual([]);
    expect(banco.votosInfantis).toEqual([]);
    expect(banco.votosJuri).toEqual([]);
    expect(banco.resultados).toEqual([]);
    expect(banco.auditoria).toEqual([]);
    expect(banco.convitesJurado).toEqual([]);
    expect(sessao.usuarioId).toBe("u1");
  });

  it("visitante: sem usuário, sem participação, sem sessão", () => {
    const { banco, sessao } = bancoDoServidor(publico({ usuario: null, eventos: [{ ...publico().eventos[0], participacao: null }] }));
    expect(banco.usuarios).toEqual([]);
    expect(banco.participacoes).toEqual([]);
    expect(sessao.usuarioId).toBeNull();
  });

  it("e-mail não verificado vira emailVerificadoEm nulo", () => {
    const { banco } = bancoDoServidor(publico({ usuario: { id: "u1", nome: "Ana", email: "a@b.co", emailVerificado: false } }));
    expect(banco.usuarios[0].emailVerificadoEm).toBeNull();
  });
});

describe("criarEstadoDoServidor", () => {
  it("o slug padrão é o do primeiro evento e a toolbar do protótipo fica oculta", () => {
    const estado = criarEstadoDoServidor(publico());
    expect(estado.dev.slugPadrao).toBe("semana-tech");
    expect(estado.dev.toolbarModo).toBe("OCULTA");
    expect(estado.ui.loginPendente).toBeNull();
  });
});

describe("aplicarEstadoDoServidor", () => {
  it("estado igual não muda nada (mesma referência: o polling não redesenha a tela)", () => {
    const atual = criarEstadoDoServidor(publico());
    expect(aplicarEstadoDoServidor(atual, publico({ agoraMs: Date.parse(AGORA) + 10_000 }))).toBe(atual);
  });

  it("só a fatia que mudou troca de referência; o estado de tela é preservado", () => {
    const atual = criarEstadoDoServidor(publico());
    const comSelecao = { ...atual, ui: { ...atual.ui, votacao: { ...atual.ui.votacao, selecaoId: "k2" } } };
    const novo = publico();
    novo.eventos[0] = { ...novo.eventos[0], evento: evento({ estadoUrna: "ENCERRADA", urnaEncerradaEm: "2026-10-19T20:00:00-03:00" }) };
    const depois = aplicarEstadoDoServidor(comSelecao, novo);
    expect(depois.banco.eventos[0].estadoUrna).toBe("ENCERRADA");
    expect(depois.banco.candidatos).toBe(comSelecao.banco.candidatos);
    expect(depois.banco.temas).toBe(comSelecao.banco.temas);
    expect(depois.ui.votacao.selecaoId).toBe("k2");
  });

  it("sair: o estado do visitante limpa usuário e participação", () => {
    const atual = criarEstadoDoServidor(publico());
    const visitante = publico({ usuario: null, eventos: [{ ...publico().eventos[0], participacao: null }] });
    const depois = aplicarEstadoDoServidor(atual, visitante);
    expect(depois.sessao.usuarioId).toBeNull();
    expect(depois.banco.usuarios).toEqual([]);
    expect(depois.banco.participacoes).toEqual([]);
  });

  it("o servidor confirma que votou: a participação passa a votou = true", () => {
    const atual = criarEstadoDoServidor(publico());
    const votou = publico();
    votou.eventos[0] = { ...votou.eventos[0], participacao: { ...votou.eventos[0].participacao!, votou: true } };
    expect(aplicarEstadoDoServidor(atual, votou).banco.participacoes[0].votou).toBe(true);
  });
});
