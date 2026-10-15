import "server-only";
import { capturarErro } from "./observabilidade";
import { mensagemDe, type ParametrosMensagem } from "@/servicos/mensagens";
import type { CodigoErro, Resultado } from "@/servicos/resultado";

// Mesmo contrato de `Resultado<T>` do cliente (`src/servicos/resultado.ts`), sem a dependência do store do navegador.
// O detalhe técnico vai só ao log do servidor; a mensagem ao usuário é a genérica do código.

export type { CodigoErro, Resultado };

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados };
}

export function falha(
  codigo: CodigoErro,
  opcoes: { detalhe?: string; parametros?: ParametrosMensagem; campos?: Record<string, string>; mensagem?: string } = {},
): { ok: false; erro: { codigo: CodigoErro; mensagem: string; campos?: Record<string, string>; retryAposSegundos?: number } } {
  if (opcoes.detalhe) console.info(`[servidor] ${codigo}: ${opcoes.detalhe}`);
  return {
    ok: false,
    erro: {
      codigo,
      mensagem: opcoes.mensagem ?? mensagemDe(codigo, opcoes.parametros),
      ...(opcoes.campos ? { campos: opcoes.campos } : {}),
      ...(codigo === "LIMITE_TENTATIVAS" && typeof opcoes.parametros?.n === "number" ? { retryAposSegundos: opcoes.parametros.n } : {}),
    },
  };
}

/** Erro inesperado: registra no log (e no Sentry, se ligado) e devolve o genérico, sem vazar o texto do erro. */
export function falhaInterna(erro: unknown, contexto: string) {
  capturarErro(erro, contexto);
  return falha("ERRO_INTERNO");
}
