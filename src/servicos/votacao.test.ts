import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definirAmbiente } from "@/store/ambiente";
import { criarStore } from "@/store/criarStore";
import { criarEstadoDoServidor } from "@/store/estadoReal";
import { AGORA, publico } from "@/store/estadoPublicoDeTeste";
import { criarRelogio } from "@/store/relogio";
import { consultarEstadoVoto, votarJuri, votarPopular } from "./votacao";

// ST3 no cliente: o "já votou" do navegador acompanha o que o servidor confirma, e só isso.

let store: ReturnType<typeof criarStore>;

const votou = () => store.getState().banco.participacoes[0].votou;

function servidorResponde(corpo: unknown, status = 200) {
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify(corpo), { status }));
}

beforeEach(() => {
  store = criarStore(criarEstadoDoServidor(publico()));
  definirAmbiente({ store, relogio: criarRelogio(Date.parse(AGORA)) });
});

afterEach(() => vi.unstubAllGlobals());

describe("votarPopular", () => {
  it("voto registrado: a participação do navegador passa a votou = true", async () => {
    servidorResponde({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(votou()).toBe(false);
    expect(await votarPopular({ eventoId: "evt-1", candidatoId: "k1" })).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(votou()).toBe(true);
  });

  it("JA_VOTOU (outra aba ou aparelho): o navegador também passa a saber", async () => {
    servidorResponde({ ok: false, erro: { codigo: "JA_VOTOU", mensagem: "Você já votou neste evento." } });
    await votarPopular({ eventoId: "evt-1", candidatoId: "k1" });
    expect(votou()).toBe(true);
  });

  it("recusas de estado (urna encerrada, candidato indisponível) e falha de rede NÃO marcam votou", async () => {
    for (const codigo of ["URNA_ENCERRADA", "CANDIDATO_INDISPONIVEL", "NAO_AUTORIZADO"]) {
      servidorResponde({ ok: false, erro: { codigo, mensagem: "x" } });
      await votarPopular({ eventoId: "evt-1", candidatoId: "k1" });
      expect(votou()).toBe(false);
    }
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    const r = await votarPopular({ eventoId: "evt-1", candidatoId: "k1" });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "REDE" } });
    expect(votou()).toBe(false); // só a consulta ao servidor decide (reenvio só depois de consultarEstadoVoto)
  });

  it("não marca votou para outro evento", async () => {
    servidorResponde({ ok: true, dados: { resultado: "REGISTRADO" } });
    await votarPopular({ eventoId: "outro-evento", candidatoId: "k1" });
    expect(votou()).toBe(false);
  });
});

describe("consultarEstadoVoto", () => {
  it("votou: sincroniza o navegador; não votou: deixa como está", async () => {
    servidorResponde({ ok: true, dados: { votou: false, candidatoAtualId: null } });
    expect(await consultarEstadoVoto({ eventoId: "evt-1" })).toEqual({ ok: true, dados: { votou: false, candidatoAtualId: null } });
    expect(votou()).toBe(false);
    servidorResponde({ ok: true, dados: { votou: true, candidatoAtualId: null } });
    await consultarEstadoVoto({ eventoId: "evt-1" });
    expect(votou()).toBe(true);
  });
});

describe("votarJuri", () => {
  it("não existe nesta versão", async () => {
    expect(await votarJuri({ eventoId: "evt-1", candidatoId: "k1" })).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
  });
});
