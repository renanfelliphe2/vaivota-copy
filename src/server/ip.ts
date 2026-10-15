import "server-only";
import { createHmac } from "node:crypto";
import { env } from "./env";

/** IP do cliente atrás do proxy da Vercel (x-forwarded-for: o primeiro é o do cliente). */
export function ipDe(headers: Headers): string {
  const encaminhado = headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "desconhecido";
}

/** Hash do IP para a auditoria (nunca o IP em claro). */
export function hashDoIp(ip: string): string {
  return createHmac("sha256", env.ipSalt).update(ip).digest("hex");
}
