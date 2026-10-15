import * as Sentry from "@sentry/nextjs";
import { OPCOES_COMUNS } from "@/lib/sentry";

// ST6: monitoramento de erros do navegador. Só liga com NEXT_PUBLIC_SENTRY_DSN (ver src/lib/sentry.ts).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
if (dsn) Sentry.init({ dsn, ...OPCOES_COMUNS, integrations: [] });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
