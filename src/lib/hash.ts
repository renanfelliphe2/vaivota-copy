import { hashDeTexto } from "./aleatorio";

// D12: hash do protótipo. NÃO é criptográfico; só espelha o desenho real (guardar só o hash).
// crypto.subtle não é usado porque falha em HTTP na rede local.

const SEMENTES = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1, 0xd3a2646c];

/** Determinístico, 64 caracteres hexadecimais. */
export function hashMock(texto: string): string {
  return SEMENTES.map((semente, i) => hashDeTexto(`${i}:${texto}`, semente).toString(16).padStart(8, "0")).join("");
}
