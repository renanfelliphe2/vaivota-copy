import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desconectarBanco } from "@/server/db";

// Google: sem credenciais reais não dá para completar o consentimento, mas dá para conferir que a configuração do Better
// Auth monta o endereço do Google certo (cliente, URI de volta, escopos, estado).
//
// As proteções de origem (CSRF com cookie e callbackURL de outro site) o Better Auth só liga fora de NODE_ENV=test; elas
// foram conferidas à mão contra o build de produção: `Origin` de fora com cookie dá 403 INVALID_ORIGIN e `callbackURL`
// externo dá 403 INVALID_CALLBACK_URL (ver a seção 10 do MVP-SemanaTech.md).

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "id-de-teste.apps.googleusercontent.com";
  process.env.GOOGLE_CLIENT_SECRET = "segredo-de-teste";
});

afterAll(async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  await desconectarBanco();
});

describe("entrar com Google", () => {
  it("o início do fluxo devolve o endereço de consentimento com a URI de volta e o escopo básico", async () => {
    // A instância do Better Auth lê as credenciais na criação: este arquivo roda num processo novo (pool de forks).
    const { auth } = await import("@/server/auth");
    const resposta = await auth().handler(
      new Request("http://localhost:3000/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/e/semana-tech/continuar?de=%2Fe%2Fsemana-tech%2Fadmin",
          errorCallbackURL: "/e/semana-tech?erro=google",
        }),
      }),
    );
    expect(resposta.status).toBe(200);
    const corpo = (await resposta.json()) as { url: string; redirect: boolean };
    const url = new URL(corpo.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("id-de-teste.apps.googleusercontent.com");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback/google");
    expect(url.searchParams.get("scope")).toMatch(/email/);
    expect(url.searchParams.get("scope")).toMatch(/profile/);
    expect(url.searchParams.get("state")).toBeTruthy();
    // o estado do fluxo fica num cookie assinado do Better Auth (o navegador o devolve na volta)
    expect(resposta.headers.getSetCookie().length).toBeGreaterThan(0);
  });
});
