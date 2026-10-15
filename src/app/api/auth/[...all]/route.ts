import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth. Só o que o navegador precisa chamar direto: sessão, sair e o fluxo do Google (a ida e a volta).
// Cadastro, login por e-mail e senha, códigos e recuperação passam por /api/servico/* (src/server/acesso.ts), que
// acrescenta o bloqueio por tentativas, a auditoria e o contexto do evento. Os caminhos de e-mail do Better Auth ficam
// fechados aqui para não haver uma porta lateral sem esses limites.

const PERMITIDOS = [/^\/api\/auth\/get-session$/, /^\/api\/auth\/sign-out$/, /^\/api\/auth\/sign-in\/social$/, /^\/api\/auth\/callback\/[\w-]+$/, /^\/api\/auth\/ok$/, /^\/api\/auth\/error$/];

function liberado(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return PERMITIDOS.some((padrao) => padrao.test(pathname.replace(/\/+$/, "")));
}

function naoEncontrado() {
  return Response.json({ message: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!liberado(request)) return naoEncontrado();
  return toNextJsHandler(auth()).GET(request);
}

export async function POST(request: Request) {
  if (!liberado(request)) return naoEncontrado();
  return toNextJsHandler(auth()).POST(request);
}
