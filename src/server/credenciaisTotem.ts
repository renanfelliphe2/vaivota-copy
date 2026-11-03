import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { normalizarCodigo } from "@/lib/codigos";
import { env } from "./env";

// Totem (Base/VotoInfantil.md §4 e §10): tudo que é segredo do aparelho. O token de longa duração só existe em claro no cookie
// do tablet (HttpOnly); no banco fica o hash. O PIN de saída do quiosque também só como hash (scrypt, com sal). O código de
// pareamento segue o desenho dos convites do júri: HMAC com o segredo do servidor, por evento.

export const COOKIE_TOTEM = "vaivota_totem";
/** O Chrome limita a validade de um cookie a 400 dias; o token vale até alguém revogar o totem. */
const VALIDADE_COOKIE_S = 365 * 24 * 60 * 60;
/** 32 bytes em base64url. */
const RE_TOKEN = /^[A-Za-z0-9_-]{43}$/;

export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Hash do token (64 hex). O token tem 256 bits de entropia: um SHA-256 simples basta e permite buscar pelo hash. */
export function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** HMAC do código normalizado (sem hífen, maiúsculo). O evento entra na chave: o mesmo código em outro evento não colide. */
export function hashDoCodigoPareamento(eventoId: string, codigo: string): string {
  return createHmac("sha256", env.authSecret).update(`pareamento:${eventoId}:${normalizarCodigo(codigo)}`).digest("hex");
}

function scryptAsync(texto: string, sal: Buffer): Promise<Buffer> {
  return new Promise((resolver, rejeitar) => scrypt(texto, sal, 32, (erro, chave) => (erro ? rejeitar(erro) : resolver(chave))));
}

/** `scrypt$<sal>$<hash>`, ambos em hexadecimal (cabe nos 255 caracteres da coluna). */
export async function hashDoPin(pin: string): Promise<string> {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("hex")}$${(await scryptAsync(pin, sal)).toString("hex")}`;
}

/** Totem sem PIN definido sai direto do quiosque; com PIN, só com o PIN certo. Comparação em tempo constante. */
export async function pinConfere(hashPin: string | null, pin: string): Promise<boolean> {
  if (hashPin === null) return true;
  const [esquema, sal, esperado] = hashPin.split("$");
  if (esquema !== "scrypt" || !sal || !esperado) return false;
  const obtido = await scryptAsync(pin, Buffer.from(sal, "hex"));
  const alvo = Buffer.from(esperado, "hex");
  return alvo.length === obtido.length && timingSafeEqual(alvo, obtido);
}

/** `Set-Cookie` do totem: HttpOnly (o script da página nunca lê o token), mesmo site e `Secure` fora do desenvolvimento local. */
export function cookieDoTotem(token: string): string {
  const seguro = process.env.NODE_ENV === "production" || env.appUrl.startsWith("https://");
  return `${COOKIE_TOTEM}=${token}; Path=/; Max-Age=${VALIDADE_COOKIE_S}; HttpOnly; SameSite=Lax${seguro ? "; Secure" : ""}`;
}

/** Token do cookie do tablet, ou null se faltar ou não tiver a forma de um token (nem chega a consultar o banco). */
export function tokenDoCookie(headers: Headers): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  for (const parte of cookie.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome !== COOKIE_TOTEM) continue;
    const valor = resto.join("=");
    return RE_TOKEN.test(valor) ? valor : null;
  }
  return null;
}
