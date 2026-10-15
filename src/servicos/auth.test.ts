import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoPublico } from "@/dominio/estadoPublico";
import { definirAmbiente } from "@/store/ambiente";
import { criarStore } from "@/store/criarStore";
import { criarEstadoDoServidor } from "@/store/estadoReal";
import { AGORA, evento, publico } from "@/store/estadoPublicoDeTeste";
import { criarRelogio } from "@/store/relogio";
import { confirmarCodigo, destinoAposAcesso, entrar, registrar, solicitarRecuperacao } from "./auth";

// ST1 no cliente: o destino depois do acesso (mesmas funções puras do protótipo, sobre o estado do servidor) e o
// encadeamento registrar → código → entrar com a chamada ao servidor simulada.

function iniciar(estado: EstadoPublico) {
  const store = criarStore(criarEstadoDoServidor(estado));
  const relogio = criarRelogio(Date.parse(AGORA));
  definirAmbiente({ store, relogio });
  return store;
}

function comPapel(papel: "PUBLICO" | "ADMIN", extra: Partial<EstadoPublico["eventos"][number]["participacao"] & object> = {}): EstadoPublico {
  const base = publico();
  base.eventos[0] = { ...base.eventos[0], participacao: { id: "p1", usuarioId: "u1", eventoId: "evt-1", papel, votou: false, ...extra } };
  return base;
}

afterEach(() => vi.unstubAllGlobals());

describe("destinoAposAcesso", () => {
  it("público com a votação aberta vai para a lista; já votou também (vê a confirmação)", () => {
    iniciar(comPapel("PUBLICO"));
    expect(destinoAposAcesso("evt-1")).toBe("/e/semana-tech#candidatos");
    iniciar(comPapel("PUBLICO", { votou: true }));
    expect(destinoAposAcesso("evt-1")).toBe("/e/semana-tech#candidatos");
  });

  it("admin vai para o painel; o `?de=` interno vale; externo é ignorado", () => {
    iniciar(comPapel("ADMIN"));
    expect(destinoAposAcesso("evt-1")).toBe("/e/semana-tech/admin");
    expect(destinoAposAcesso("evt-1", "/e/semana-tech/admin/configuracao")).toBe("/e/semana-tech/admin/configuracao");
    expect(destinoAposAcesso("evt-1", "https://site-malicioso.com")).toBe("/e/semana-tech/admin");
    expect(destinoAposAcesso("evt-1", "//site-malicioso.com")).toBe("/e/semana-tech/admin");
  });

  it("com a urna ainda não aberta, o público volta à página do evento", () => {
    const antes = comPapel("PUBLICO");
    antes.eventos[0].evento = evento({ estadoUrna: "NAO_INICIADA", urnaAbertaEm: null });
    iniciar(antes);
    expect(destinoAposAcesso("evt-1")).toBe("/e/semana-tech");
  });

  it("e-mail não verificado vai para a confirmação do código", () => {
    iniciar(publico({ usuario: { id: "u1", nome: "Ana", email: "ana@exemplo.com", emailVerificado: false } }));
    expect(destinoAposAcesso("evt-1")).toBe("/e/semana-tech/verificar-email");
  });
});

describe("registrar → confirmar → entrar", () => {
  let chamadas: { nome: string; args: Record<string, unknown> }[];

  function servidor(respostas: Record<string, unknown>) {
    chamadas = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const nome = url.split("/").pop()!;
      chamadas.push({ nome, args: (JSON.parse(init.body as string) as { args: Record<string, unknown> }).args });
      const r = respostas[nome];
      if (typeof r === "function") return new Response(JSON.stringify(r()), { status: 200 });
      return new Response(JSON.stringify(r ?? { ok: true, dados: null }), { status: 200 });
    });
  }

  beforeEach(() => {
    iniciar(publico({ usuario: null, eventos: [{ ...publico().eventos[0], participacao: null }] }));
  });

  it("registrar não entra: guarda o e-mail pendente e leva à tela do código (sem mandar a senha de confirmação em lugar nenhum além do servidor)", async () => {
    servidor({ registrar: { ok: true, dados: { email: "ana@exemplo.com" } } });
    const r = await registrar("evt-1", {
      nome: "Ana Souza",
      email: " Ana@Exemplo.com ",
      senha: "minha-senha-1",
      confirmacaoSenha: "minha-senha-1",
      papel: "PUBLICO",
      aceite: true,
      de: "/e/semana-tech?candidato=k1",
    });
    expect(r).toEqual({ ok: true, dados: { destino: "/e/semana-tech/verificar-email?de=%2Fe%2Fsemana-tech%3Fcandidato%3Dk1" } });
    expect(chamadas.map((c) => c.nome)).toEqual(["registrar"]);
    expect(chamadas[0].args).not.toHaveProperty("codigo");
  });

  it("recusa o papel de jurado (fora do MVP) sem chamar o servidor", async () => {
    servidor({});
    const r = await registrar("evt-1", { nome: "Bia", email: "b@c.de", senha: "12345678", confirmacaoSenha: "12345678", papel: "JURADO", aceite: true });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(chamadas).toEqual([]);
  });

  it("confirmarCodigo usa o e-mail pendente, recarrega o estado e segue para a votação", async () => {
    const logado = comPapel("PUBLICO");
    servidor({
      registrar: { ok: true, dados: { email: "ana@exemplo.com" } },
      confirmarCodigo: { ok: true, dados: { emailVerificado: true } },
      obterEstado: { ok: true, dados: logado },
    });
    await registrar("evt-1", { nome: "Ana Souza", email: "ana@exemplo.com", senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", papel: "PUBLICO", aceite: true });
    const r = await confirmarCodigo("evt-1", "123456");
    expect(r).toEqual({ ok: true, dados: { destino: "/e/semana-tech#candidatos", contaConfirmada: true } });
    expect(chamadas.map((c) => c.nome)).toEqual(["registrar", "confirmarCodigo", "obterEstado"]);
    expect(chamadas[1].args).toEqual({ eventoId: "evt-1", email: "ana@exemplo.com", codigo: "123456" });
  });

  it("confirmarCodigo sem e-mail pendente nem sessão é recusado", async () => {
    servidor({});
    expect(await confirmarCodigo("evt-1", "123456")).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(chamadas).toEqual([]);
  });

  it("entrar com e-mail ainda não confirmado leva à tela do código com o e-mail guardado", async () => {
    servidor({ entrar: { ok: false, erro: { codigo: "EMAIL_NAO_VERIFICADO", mensagem: "Confirme seu e-mail para continuar." } } });
    const r = await entrar("evt-1", "ana@exemplo.com", "minha-senha-1");
    expect(r).toEqual({ ok: true, dados: { destino: "/e/semana-tech/verificar-email" } });
  });

  it("o bloqueio de senha do servidor vira contagem regressiva na tela", async () => {
    servidor({
      entrar: { ok: false, erro: { codigo: "LIMITE_TENTATIVAS", mensagem: "Muitas tentativas. Tente novamente em 42s.", retryAposSegundos: 42 } },
    });
    const store = iniciar(publico({ usuario: null, eventos: [{ ...publico().eventos[0], participacao: null }] }));
    const r = await entrar("evt-1", "ana@exemplo.com", "errada-123");
    expect(r).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    const { ateMs } = store.getState().ui.bloqueioSenha;
    expect(ateMs).toBe(Date.parse(AGORA) + 42_000);
  });

  it("solicitarRecuperacao guarda o e-mail como de recuperação e leva ao passo do código", async () => {
    const store = iniciar(publico({ usuario: null, eventos: [{ ...publico().eventos[0], participacao: null }] }));
    servidor({ solicitarRecuperacao: { ok: true, dados: { email: "ana@exemplo.com", ateMs: Date.parse(AGORA) + 30_000 } } });
    const r = await solicitarRecuperacao("evt-1", "Ana@exemplo.com");
    expect(r).toEqual({ ok: true, dados: { destino: "/e/semana-tech/recuperar-senha" } });
    expect(store.getState().ui.loginPendente).toMatchObject({ email: "ana@exemplo.com", tipo: "recuperacao", eventoId: "evt-1" });
    expect(store.getState().ui.reenvioVerificacaoAteMs).toBe(Date.parse(AGORA) + 30_000);
  });
});
