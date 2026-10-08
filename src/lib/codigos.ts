import type { Gerador } from "./aleatorio";

// Códigos de convite: alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L), formato XXXX-XXXX.
// Comparação sem diferenciar maiúsculas e ignorando o hífen.

export const ALFABETO_CODIGO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TAMANHO_CODIGO = 8;

/** Maiúsculas, sem hífen, espaços ou outros separadores: "k7m3 qx9p" → "K7M3QX9P". */
export function normalizarCodigo(codigo: string): string {
  return codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Mantém só caracteres do alfabeto (descarta ambíguos), até o tamanho do código. Para o campo de digitação. */
export function limparCodigoDigitado(codigo: string): string {
  return normalizarCodigo(codigo)
    .split("")
    .filter((c) => ALFABETO_CODIGO.includes(c))
    .join("")
    .slice(0, TAMANHO_CODIGO);
}

/** "K7M3QX9P" → "K7M3-QX9P" (aceita parcial: "K7M3Q" → "K7M3-Q"). */
export function formatarCodigo(codigo: string): string {
  const n = normalizarCodigo(codigo);
  return n.length > 4 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
}

export function validarFormatoCodigo(codigo: string): boolean {
  const n = normalizarCodigo(codigo);
  return n.length === TAMANHO_CODIGO && [...n].every((c) => ALFABETO_CODIGO.includes(c));
}

/** Gera um código já formatado (XXXX-XXXX). */
export function gerarCodigo(gerador: Gerador): string {
  let codigo = "";
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(gerador() * ALFABETO_CODIGO.length)];
  }
  return formatarCodigo(codigo);
}
