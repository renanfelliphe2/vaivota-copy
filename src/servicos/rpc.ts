import { falha, type Resultado } from "./resultado";

// Cliente da fronteira com o servidor (src/server/rpc.ts, rota /api/servico/[nome]). Todo serviço do cliente é uma
// chamada a `chamar`, com a mesma assinatura e o mesmo `Resultado<T>` do protótipo.
//
// Falha de rede, tempo esgotado e erro de gateway (502/503/504) viram `REDE`: o voto interpreta como "pode ter gravado"
// e só reenvia depois de consultar o estado real (consultarEstadoVoto). Resposta que não é um `Resultado` vira ERRO_INTERNO.

const TEMPO_PADRAO_MS = 20_000;

function ehResultado(valor: unknown): valor is Resultado<unknown> {
  if (typeof valor !== "object" || valor === null || !("ok" in valor)) return false;
  const v = valor as { ok: unknown; erro?: { codigo?: unknown; mensagem?: unknown } };
  return v.ok === true || (v.ok === false && typeof v.erro?.codigo === "string" && typeof v.erro?.mensagem === "string");
}

export async function chamar<T>(nome: string, args?: unknown, opcoes: { tempoMs?: number } = {}): Promise<Resultado<T>> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api/servico/${nome}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ args }),
      credentials: "same-origin",
      cache: "no-store",
      signal: AbortSignal.timeout(opcoes.tempoMs ?? TEMPO_PADRAO_MS),
    });
  } catch (erro) {
    return falha("REDE", { detalhe: `${nome}: ${erro instanceof Error ? erro.name : "falha de rede"}` });
  }
  if (resposta.status === 502 || resposta.status === 503 || resposta.status === 504) return falha("REDE", { detalhe: `${nome}: HTTP ${resposta.status}` });
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    return falha("ERRO_INTERNO", { detalhe: `${nome}: resposta que não é JSON (HTTP ${resposta.status})` });
  }
  return ehResultado(corpo) ? (corpo as Resultado<T>) : falha("ERRO_INTERNO", { detalhe: `${nome}: resposta fora do contrato` });
}
