import "server-only";
import * as Sentry from "@sentry/nextjs";

/**
 * Registra um erro inesperado do servidor: no log da Vercel e, se `SENTRY_DSN` estiver definido, no Sentry. Nunca recebe
 * dado de voto nem de pessoa (só o erro e o nome da operação).
 */
export function capturarErro(erro: unknown, contexto: string): void {
  console.error(`[servidor] erro inesperado em ${contexto}:`, erro);
  if (process.env.SENTRY_DSN?.trim()) {
    try {
      Sentry.captureException(erro, { tags: { contexto } });
    } catch {
      // o monitoramento nunca derruba a requisição
    }
  }
}
