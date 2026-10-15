import { origemPermitida } from "@/server/origem";
import { usuarioDaSessao } from "@/server/sessao";
import { enviarImagemDeCandidato } from "@/server/upload";
import { LIMITES } from "@/dominio/validacoesConfig";

// Upload da imagem de um candidato (multipart: campos `eventoId` e `arquivo`). Só o admin do evento envia.
// O tipo é conferido pelo conteúdo e o tamanho pelo corpo: nada do que o navegador declara é confiado.

const SEM_CACHE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!origemPermitida(request.headers)) {
    return Response.json({ ok: false, erro: { codigo: "NAO_AUTORIZADO", mensagem: "Origem não permitida." } }, { status: 403, headers: SEM_CACHE });
  }
  // Recusa antes de ler o corpo inteiro quando o tamanho declarado já passa do limite.
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (declarado > LIMITES.imagemBytes + 64 * 1024) {
    return Response.json({ ok: false, erro: { codigo: "VALIDACAO", mensagem: "O arquivo passa de 2 MB.", campos: { imagemUrl: "O arquivo passa de 2 MB." } } }, { status: 413, headers: SEM_CACHE });
  }

  // Sessão ANTES de ler o corpo: um visitante qualquer não faz o servidor receber e interpretar um arquivo grande.
  const usuario = await usuarioDaSessao(request.headers);
  if (!usuario) {
    return Response.json({ ok: false, erro: { codigo: "NAO_AUTORIZADO", mensagem: "Você não tem acesso a esta ação." } }, { status: 401, headers: SEM_CACHE });
  }

  let eventoId: string;
  let bytes: Uint8Array;
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    const evento = form.get("eventoId");
    if (typeof evento !== "string" || !(arquivo instanceof File)) throw new Error("campos ausentes");
    eventoId = evento;
    bytes = new Uint8Array(await arquivo.arrayBuffer());
  } catch {
    return Response.json({ ok: false, erro: { codigo: "VALIDACAO", mensagem: "Requisição inválida." } }, { status: 400, headers: SEM_CACHE });
  }

  const resultado = await enviarImagemDeCandidato(usuario, eventoId, bytes);
  return Response.json(resultado, { headers: SEM_CACHE });
}
