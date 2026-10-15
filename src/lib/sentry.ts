import type { ErrorEvent, Breadcrumb } from "@sentry/nextjs";

// ST6: Sentry só liga com DSN (SENTRY_DSN no servidor, NEXT_PUBLIC_SENTRY_DSN no navegador). Sem DSN, nada é enviado.
//
// Privacidade e sigilo do voto: nenhum dado de pessoa vai ao Sentry (sem cookies, sem corpo de requisição, sem IP, sem
// usuário) e as chamadas de voto não viram "breadcrumb": um erro nunca carrega quem votou nem quando.

const ROTAS_DE_VOTO = ["/api/servico/votarPopular", "/api/servico/consultarEstadoVoto"];

export function limparEvento(evento: ErrorEvent): ErrorEvent | null {
  if (evento.request) {
    delete evento.request.cookies;
    delete evento.request.data;
    delete evento.request.headers;
    delete evento.request.query_string;
  }
  delete evento.user;
  return evento;
}

export function filtrarBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const url = typeof breadcrumb.data?.url === "string" ? breadcrumb.data.url : "";
  if (ROTAS_DE_VOTO.some((rota) => url.includes(rota))) return null;
  return breadcrumb;
}

export const OPCOES_COMUNS = {
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: limparEvento,
  beforeBreadcrumb: filtrarBreadcrumb,
} as const;
