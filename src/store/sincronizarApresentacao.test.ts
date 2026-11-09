import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoUiApresentacao } from "@/dominio/tipos";
import { criarStore } from "./criarStore";
import { criarEstadoDoServidor } from "./estadoReal";
import { publico } from "./estadoPublicoDeTeste";
import { CHAVE_APRESENTACAO, lerApresentacao, sincronizarApresentacao } from "./sincronizarApresentacao";

const REVELACAO: NonNullable<EstadoUiApresentacao["revelacao"]> = {
  eventoId: "e1",
  assinatura: "abc-def",
  situacao: "EM_ANDAMENTO",
  cena: 2,
  passo: 1,
  pausado: false,
  emergencia: false,
  iniciadaEm: "2026-11-27T20:00:00-03:00",
};

const APRESENTACAO: EstadoUiApresentacao = {
  chave: "u1:e1",
  modoSala: "ENSAIO",
  cenarioEnsaioId: "SEM_EMPATE",
  modoAvancoLocal: "MANUAL",
  categoriaId: "cat-1",
  revelacao: REVELACAO,
};

/** Uma "aba": um store próprio, ligado ao mesmo canal e ao mesmo localStorage das outras. */
function aba() {
  return criarStore(criarEstadoDoServidor(publico()));
}

const proximoTique = () => new Promise((r) => setTimeout(r, 25));

function gravarNaAba(store: ReturnType<typeof aba>, apresentacao: EstadoUiApresentacao) {
  store.atualizar((e) => ({ ...e, ui: { ...e.ui, apresentacao } }));
}

describe("lerApresentacao", () => {
  it("aceita o formato certo, com e sem revelação", () => {
    expect(lerApresentacao(APRESENTACAO)).toEqual(APRESENTACAO);
    expect(lerApresentacao({ ...APRESENTACAO, revelacao: null })).toEqual({ ...APRESENTACAO, revelacao: null });
    expect(lerApresentacao({ chave: null, modoSala: "REAL", cenarioEnsaioId: null, modoAvancoLocal: null, revelacao: null })).not.toBeNull();
  });

  it.each([
    ["nada", null],
    ["texto", "oi"],
    ["lista", []],
    ["modo da sala inventado", { ...APRESENTACAO, modoSala: "TELAO" }],
    ["chave de outro tipo", { ...APRESENTACAO, chave: 3 }],
    ["modo de avanço inventado", { ...APRESENTACAO, modoAvancoLocal: "RAPIDO" }],
    ["revelação que não é objeto", { ...APRESENTACAO, revelacao: "x" }],
    ["revelação sem assinatura", { ...APRESENTACAO, revelacao: { ...REVELACAO, assinatura: undefined } }],
    ["cena fracionária", { ...APRESENTACAO, revelacao: { ...REVELACAO, cena: 1.5 } }],
    ["situação inventada", { ...APRESENTACAO, revelacao: { ...REVELACAO, situacao: "PAUSADA" } }],
  ])("recusa %s", (_nome, valor) => expect(lerApresentacao(valor)).toBeNull());
});

describe("sincronizarApresentacao", () => {
  const guardado = new Map<string, string>();
  const escritas: string[] = [];
  const original = (globalThis as { window?: unknown }).window;
  const cancelamentos: (() => void)[] = [];

  beforeEach(() => {
    guardado.clear();
    escritas.length = 0;
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => guardado.get(k) ?? null,
        setItem: (k: string, v: string) => {
          escritas.push(v);
          guardado.set(k, v);
        },
      },
    });
  });

  afterEach(() => {
    for (const c of cancelamentos.splice(0)) c();
    vi.unstubAllGlobals();
    if (original !== undefined) (globalThis as { window?: unknown }).window = original;
  });

  const ligar = (store: ReturnType<typeof aba>) => {
    const cancelar = sincronizarApresentacao({ store });
    cancelamentos.push(cancelar);
    return cancelar;
  };

  it("uma mudança numa aba chega à outra e fica salva, sem eco entre as abas", async () => {
    const sala = aba();
    const telao = aba();
    ligar(sala);
    ligar(telao);

    gravarNaAba(sala, APRESENTACAO);
    await proximoTique();

    expect(telao.getState().ui.apresentacao).toEqual(APRESENTACAO);
    expect(JSON.parse(guardado.get(CHAVE_APRESENTACAO)!)).toEqual(APRESENTACAO);
    // Só a aba que mudou escreveu: a que recebeu não reenviou nem regravou.
    expect(escritas).toHaveLength(1);
  });

  it("o telão avança a revelação e a sala vê, nos dois sentidos", async () => {
    const sala = aba();
    const telao = aba();
    ligar(sala);
    ligar(telao);
    gravarNaAba(sala, APRESENTACAO);
    await proximoTique();

    gravarNaAba(telao, { ...APRESENTACAO, revelacao: { ...REVELACAO, cena: 5, passo: 0, pausado: true } });
    await proximoTique();
    expect(sala.getState().ui.apresentacao.revelacao).toMatchObject({ cena: 5, passo: 0, pausado: true });
    expect(escritas).toHaveLength(2);
  });

  it("uma aba aberta depois (ou recarregada) retoma de onde a revelação parou", async () => {
    const primeira = aba();
    ligar(primeira);
    gravarNaAba(primeira, APRESENTACAO);
    await proximoTique();

    const recarregada = aba();
    expect(recarregada.getState().ui.apresentacao.revelacao).toBeNull();
    ligar(recarregada);
    expect(recarregada.getState().ui.apresentacao).toEqual(APRESENTACAO);
    await proximoTique();
    expect(escritas).toHaveLength(1); // restaurar não regrava
  });

  it("ignora mensagem e armazenamento fora do formato", async () => {
    guardado.set(CHAVE_APRESENTACAO, "{ não é json");
    const a = aba();
    ligar(a);
    expect(a.getState().ui.apresentacao.revelacao).toBeNull();

    guardado.set(CHAVE_APRESENTACAO, JSON.stringify({ chave: "x", modoSala: "TELAO" }));
    const b = aba();
    ligar(b);
    expect(b.getState().ui.apresentacao.modoSala).toBe("REAL");

    const canal = new BroadcastChannel("vaivota-apresentacao");
    canal.postMessage({ de: "outra", apresentacao: { modoSala: "TELAO" } });
    canal.postMessage("lixo");
    await proximoTique();
    canal.close();
    expect(a.getState().ui.apresentacao.modoSala).toBe("REAL");
  });

  it("depois de cancelar a aba não escuta nem grava mais", async () => {
    const sala = aba();
    const telao = aba();
    ligar(sala);
    const cancelarTelao = ligar(telao);
    cancelarTelao();

    gravarNaAba(sala, APRESENTACAO);
    await proximoTique();
    expect(telao.getState().ui.apresentacao.revelacao).toBeNull();

    gravarNaAba(telao, { ...APRESENTACAO, modoSala: "REAL" });
    await proximoTique();
    expect(escritas).toHaveLength(1);
  });

  it("sem localStorage (aba privada) a sincronização entre abas continua", async () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("bloqueado");
        },
      },
    });
    const sala = aba();
    const telao = aba();
    ligar(sala);
    ligar(telao);
    gravarNaAba(sala, APRESENTACAO);
    await proximoTique();
    expect(telao.getState().ui.apresentacao).toEqual(APRESENTACAO);
  });
});
