import type { Instante } from "@/dominio/tipos";
import { deslocamentoMinutos, MINUTO, paraInstante, paraMs } from "./tempo";

// Etapa 6 (D15, rev. 3 C13): fusos suportados como ids IANA. O deslocamento é sempre calculado com
// Intl.DateTimeFormat (lib/tempo) e nunca é guardado. Os campos de data guardam instantes.

export const FUSOS_SUPORTADOS = [
  { id: "America/Sao_Paulo", rotulo: "Brasília (São Paulo, Rio, Minas…)" },
  { id: "America/Manaus", rotulo: "Amazonas (Manaus)" },
  { id: "America/Rio_Branco", rotulo: "Acre (Rio Branco)" },
  { id: "America/Noronha", rotulo: "Fernando de Noronha" },
] as const;

export type FusoSuportado = (typeof FUSOS_SUPORTADOS)[number]["id"];

export function ehFusoSuportado(fuso: string): fuso is FusoSuportado {
  return FUSOS_SUPORTADOS.some((f) => f.id === fuso);
}

/** "GMT-03:00" para exibir ao lado do nome do fuso. */
export function descreverDeslocamento(ms: number, fuso: string): string {
  const d = deslocamentoMinutos(ms, fuso);
  const sinal = d < 0 ? "-" : "+";
  const abs = Math.abs(d);
  return `GMT${sinal}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Valor de `<input type="datetime-local">` ("2026-10-22T13:00") interpretado no fuso → instante. null se inválido. */
export function localParaInstante(local: string, fuso: string): Instante | null {
  const m = LOCAL.exec(local);
  if (!m) return null;
  const [, a, mes, d, h, min] = m.map(Number);
  const relogioUtc = Date.UTC(a, mes - 1, d, h, min);
  if (Number.isNaN(relogioUtc)) return null;
  // Duas passadas resolvem a troca de deslocamento perto de uma transição de horário.
  let ms = relogioUtc - deslocamentoMinutos(relogioUtc, fuso) * MINUTO;
  ms = relogioUtc - deslocamentoMinutos(ms, fuso) * MINUTO;
  return paraInstante(ms, fuso);
}

/** Instante (ou ms) → valor de `datetime-local` no fuso. */
export function instanteParaLocal(instante: Instante | number, fuso: string): string {
  const ms = typeof instante === "number" ? instante : paraMs(instante);
  return paraInstante(ms, fuso).slice(0, 16);
}
