import { afterEach, describe, expect, it, vi } from "vitest";
import { chamar } from "./rpc";

// A fronteira com o servidor: o voto depende de `REDE` significar "pode ter gravado" (só reenvia depois de consultar).

afterEach(() => vi.unstubAllGlobals());

function resposta(corpo: unknown, status = 200): Response {
  return new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

describe("chamar", () => {
  it("devolve o Resultado do servidor e manda POST JSON com { args }", async () => {
    const fetchSimulado = vi.fn(async () => resposta({ ok: true, dados: { votou: true } }));
    vi.stubGlobal("fetch", fetchSimulado);
    const r = await chamar("consultarEstadoVoto", { eventoId: "e1" });
    expect(r).toEqual({ ok: true, dados: { votou: true } });
    const [url, init] = fetchSimulado.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/servico/consultarEstadoVoto");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ args: { eventoId: "e1" } });
    expect(init.credentials).toBe("same-origin");
  });

  it("erro de negócio passa como veio", async () => {
    vi.stubGlobal("fetch", async () => resposta({ ok: false, erro: { codigo: "JA_VOTOU", mensagem: "Você já votou neste evento." } }));
    expect(await chamar("votarPopular", {})).toEqual({ ok: false, erro: { codigo: "JA_VOTOU", mensagem: "Você já votou neste evento." } });
  });

  it("falha de rede, tempo esgotado e erro de gateway viram REDE", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await chamar("votarPopular", {})).toMatchObject({ ok: false, erro: { codigo: "REDE" } });

    vi.stubGlobal("fetch", async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    expect(await chamar("votarPopular", {})).toMatchObject({ ok: false, erro: { codigo: "REDE" } });

    for (const status of [502, 503, 504]) {
      vi.stubGlobal("fetch", async () => resposta("<html>gateway</html>", status));
      expect(await chamar("votarPopular", {})).toMatchObject({ ok: false, erro: { codigo: "REDE" } });
    }
  });

  it("resposta que não é JSON ou não é um Resultado vira ERRO_INTERNO", async () => {
    vi.stubGlobal("fetch", async () => resposta("<html>erro</html>", 500));
    expect(await chamar("x")).toMatchObject({ ok: false, erro: { codigo: "ERRO_INTERNO" } });
    vi.stubGlobal("fetch", async () => resposta({ qualquer: "coisa" }));
    expect(await chamar("x")).toMatchObject({ ok: false, erro: { codigo: "ERRO_INTERNO" } });
  });

  it("o erro do servidor com retry-after chega inteiro (bloqueio de tentativas)", async () => {
    vi.stubGlobal("fetch", async () =>
      resposta({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS", mensagem: "Muitas tentativas. Tente novamente em 42s.", retryAposSegundos: 42 } }),
    );
    const r = await chamar("entrar", {});
    expect(r.ok === false && r.erro.retryAposSegundos).toBe(42);
  });
});
