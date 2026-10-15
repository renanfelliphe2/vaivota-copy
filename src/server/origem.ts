import "server-only";
import { env } from "./env";

/**
 * Proteção contra CSRF nas rotas que mudam estado: a requisição precisa vir de uma página deste próprio site. Os
 * navegadores sempre mandam `Origin` em POST; um site de fora não consegue falsificá-lo. Os cookies de sessão já são
 * SameSite=Lax; esta conferência é a segunda camada.
 */
export function origemPermitida(headers: Headers): boolean {
  const origem = headers.get("origin");
  if (!origem) return false;
  let host: string;
  try {
    host = new URL(origem).host;
  } catch {
    return false;
  }
  const doSite = headers.get("x-forwarded-host") ?? headers.get("host");
  if (doSite && host === doSite) return true;
  return [env.appUrl, ...env.originsConfiaveis].some((permitida) => {
    try {
      return new URL(permitida).host === host;
    } catch {
      return false;
    }
  });
}
