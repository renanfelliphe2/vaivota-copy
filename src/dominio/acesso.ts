import type { PapelParticipacao } from "./tipos";

// Guarda de acesso central (D21). Função pura: o RotaGuard decide o que fazer com o motivo.

export type ExigenciaAcesso =
  | { tipo: "LOGADO" }
  | { tipo: "EMAIL_VERIFICADO" }
  | { tipo: "PAPEL"; papeis: PapelParticipacao[] };

export type ContextoAcesso = {
  logado: boolean;
  emailVerificado: boolean;
  papel: PapelParticipacao | null;
};

export type MotivoNegacao = "DESLOGADO" | "EMAIL_NAO_VERIFICADO" | "PAPEL_INSUFICIENTE";

export type ResultadoAcesso = { ok: true } | { ok: false; motivo: MotivoNegacao };

/**
 * As exigências são cumulativas: `EMAIL_VERIFICADO` também exige sessão, e `PAPEL` exige sessão,
 * e-mail verificado e um dos papéis listados (o papel é por participação no evento).
 */
export function resolverAcesso(exigencia: ExigenciaAcesso, contexto: ContextoAcesso): ResultadoAcesso {
  if (!contexto.logado) return { ok: false, motivo: "DESLOGADO" };
  if (exigencia.tipo === "LOGADO") return { ok: true };
  if (!contexto.emailVerificado) return { ok: false, motivo: "EMAIL_NAO_VERIFICADO" };
  if (exigencia.tipo === "EMAIL_VERIFICADO") return { ok: true };
  if (contexto.papel && exigencia.papeis.includes(contexto.papel)) return { ok: true };
  return { ok: false, motivo: "PAPEL_INSUFICIENTE" };
}

/**
 * `?de=` só aceita caminho interno: começa com `/` e não com `//` (nem `/\`), não tem espaço, TAB nem quebra de linha
 * (o parser de URL REMOVE TAB e quebras: "/<TAB>/evil.com" viraria "//evil.com") e, resolvido contra uma origem qualquer,
 * continua nessa origem.
 */
export function ehRotaInterna(de: string | null | undefined): de is string {
  if (!de) return false;
  if (!de.startsWith("/") || de.startsWith("//") || de.startsWith("/\\")) return false;
  if (/[\s\\\u0000-\u001f\u007f]/.test(de)) return false;
  try {
    return new URL(de, "http://origem.interna").origin === "http://origem.interna";
  } catch {
    return false;
  }
}
