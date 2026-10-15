import * as Sentry from "@sentry/nextjs";
import { OPCOES_COMUNS } from "@/lib/sentry";

// ST6: monitoramento de erros do servidor. Só liga com SENTRY_DSN (ver src/lib/sentry.ts).
export function register() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (dsn) Sentry.init({ dsn, ...OPCOES_COMUNS, environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV });
}

export const onRequestError = Sentry.captureRequestError;
