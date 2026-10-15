import { afterAll, describe, expect, it } from "vitest";
import { desconectarBanco } from "@/server/db";
import { origemPermitida } from "@/server/origem";
import { detectarTipoImagem, prefixoPublico, urlDeImagemValida, validarImagem } from "@/server/storage";
import { executarServico, type ContextoRpc } from "@/server/rpc";

// Camadas de segurança: origem (CSRF), tipo e tamanho de imagem no servidor, validação de argumentos.

afterAll(async () => {
  await desconectarBanco();
});

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = Uint8Array.from([...Buffer.from("RIFF"), 1, 0, 0, 0, ...Buffer.from("WEBP"), 0]);

describe("origemPermitida", () => {
  it("aceita a própria origem e as confiáveis; recusa sem Origin e origem de fora", () => {
    expect(origemPermitida(new Headers({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
    expect(origemPermitida(new Headers({ origin: "https://votacao.exemplo.space", "x-forwarded-host": "votacao.exemplo.space" }))).toBe(true);
    expect(origemPermitida(new Headers({ origin: "http://localhost:3000" }))).toBe(true); // APP_URL
    expect(origemPermitida(new Headers({}))).toBe(false);
    expect(origemPermitida(new Headers({ origin: "https://site-malicioso.com", host: "localhost:3000" }))).toBe(false);
    expect(origemPermitida(new Headers({ origin: "nao-e-url" }))).toBe(false);
  });
});

describe("imagens", () => {
  it("o tipo vem do conteúdo (PNG, JPEG, WebP); SVG, HTML e texto são recusados", () => {
    expect(detectarTipoImagem(PNG)).toBe("image/png");
    expect(detectarTipoImagem(JPEG)).toBe("image/jpeg");
    expect(detectarTipoImagem(WEBP)).toBe("image/webp");
    expect(detectarTipoImagem(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectarTipoImagem(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(validarImagem(new TextEncoder().encode("<svg></svg>"))).toEqual({ ok: false, erro: "TIPO_INVALIDO" });
  });

  it("recusa vazio e acima de 2 MB; aceita até 2 MB", () => {
    expect(validarImagem(new Uint8Array(0))).toEqual({ ok: false, erro: "ARQUIVO_VAZIO" });
    const grande = new Uint8Array(2 * 1024 * 1024 + 1);
    grande.set(PNG);
    expect(validarImagem(grande)).toEqual({ ok: false, erro: "ARQUIVO_GRANDE" });
    const limite = new Uint8Array(2 * 1024 * 1024);
    limite.set(PNG);
    expect(validarImagem(limite)).toEqual({ ok: true, tipo: "image/png" });
  });

  it("só são aceitos endereços gerados pelo próprio sistema", () => {
    const uuid = "123e4567-e89b-42d3-a456-426614174000";
    expect(urlDeImagemValida(`${prefixoPublico()}${uuid}/${uuid}.png`)).toBe(true);
    expect(urlDeImagemValida(`${prefixoPublico()}${uuid}/${uuid}.svg`)).toBe(false);
    expect(urlDeImagemValida(`${prefixoPublico()}${uuid}/../${uuid}.png`)).toBe(false);
    expect(urlDeImagemValida("https://externo.com/a.png")).toBe(false);
    expect(urlDeImagemValida("")).toBe(false);
  });
});

describe("serviços do servidor", () => {
  const ctx = (): ContextoRpc => ({ headers: new Headers(), ip: "203.0.113.99", cookies: [] });

  it("serviço desconhecido e argumentos fora do formato são recusados sem tocar no banco", async () => {
    expect(await executarServico("naoExiste", {}, ctx())).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
    expect(await executarServico("toString", {}, ctx())).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
    expect(await executarServico("votarPopular", { eventoId: 123 }, ctx())).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await executarServico("votarPopular", { eventoId: "x", candidatoId: "y", usuarioId: "invasor" }, ctx())).toMatchObject({
      ok: false,
      erro: { codigo: "NAO_AUTORIZADO" }, // sem sessão; o campo extra é ignorado: a identidade só vem do cookie
    });
    expect(await executarServico("criarCandidato", { eventoId: "x", dados: { titulo: "a".repeat(500), descricao: "", imagemUrl: null, camposExtras: {} } }, ctx())).toMatchObject({
      ok: false,
      erro: { codigo: "VALIDACAO" },
    });
  });

  it("sem sessão, nenhum serviço de administração nem de voto funciona", async () => {
    for (const nome of ["ativarEvento", "abrirUrna", "encerrarUrna", "obterOperacao", "obterResultado"] as const) {
      const r = await executarServico(nome, { eventoId: "inexistente" }, ctx());
      expect(r.ok).toBe(false);
    }
    expect(await executarServico("votarPopular", { eventoId: "e", candidatoId: "c" }, ctx())).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });
});
