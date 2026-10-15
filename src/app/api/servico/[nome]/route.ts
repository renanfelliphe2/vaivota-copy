import { ipDe } from "@/server/ip";
import { origemPermitida } from "@/server/origem";
import { executarServico, type ContextoRpc } from "@/server/rpc";

// Fronteira única entre o navegador e o servidor (ver src/server/rpc.ts). Sempre POST com JSON `{ args }`.
// Erros de negócio voltam como `{ ok: false, erro }` com status 200; só o protocolo (origem, corpo) dá 4xx.

const LIMITE_CORPO_BYTES = 64 * 1024;
const SEM_CACHE = { "Cache-Control": "no-store" };

export async function POST(request: Request, { params }: RouteContext<"/api/servico/[nome]">) {
  const { nome } = await params;
  if (!origemPermitida(request.headers)) {
    return Response.json({ ok: false, erro: { codigo: "NAO_AUTORIZADO", mensagem: "Origem não permitida." } }, { status: 403, headers: SEM_CACHE });
  }

  let args: unknown;
  try {
    const texto = await request.text();
    if (texto.length > LIMITE_CORPO_BYTES) {
      return Response.json({ ok: false, erro: { codigo: "VALIDACAO", mensagem: "Requisição grande demais." } }, { status: 413, headers: SEM_CACHE });
    }
    args = texto ? (JSON.parse(texto) as { args?: unknown }).args : undefined;
  } catch {
    return Response.json({ ok: false, erro: { codigo: "VALIDACAO", mensagem: "Requisição inválida." } }, { status: 400, headers: SEM_CACHE });
  }

  const ctx: ContextoRpc = { headers: request.headers, ip: ipDe(request.headers), cookies: [] };
  const resultado = await executarServico(nome, args, ctx);

  const resposta = Response.json(resultado, {
    status: !resultado.ok && resultado.erro.codigo === "ERRO_INTERNO" ? 500 : 200,
    headers: SEM_CACHE,
  });
  for (const cookie of ctx.cookies) resposta.headers.append("Set-Cookie", cookie);
  return resposta;
}
