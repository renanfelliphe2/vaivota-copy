import type { Instante } from "@/dominio/tipos";

// Tempo do protótipo. Formatação sempre em pt-BR e no fuso do evento (timeZone explícito).
// Date.now() nunca aparece aqui: o "agora" vem do relógio simulado (store/relogio.ts).

/** Instante inicial do relógio simulado (D6). */
export const T0: Instante = "2026-10-22T14:00:00-03:00";
export const T0_MS = Date.parse(T0);

export const SEGUNDO = 1000;
export const MINUTO = 60 * SEGUNDO;
export const HORA = 60 * MINUTO;
export const DIA = 24 * HORA;

export const FUSO_PADRAO = "America/Sao_Paulo";

export function paraMs(instante: Instante): number {
  const ms = Date.parse(instante);
  if (Number.isNaN(ms)) throw new Error(`Instante inválido: ${instante}`);
  return ms;
}

/** Um formatador por fuso (o seed de volume converte milhares de instantes na abertura). */
const FORMATADORES_OFFSET = new Map<string, Intl.DateTimeFormat>();

/** Deslocamento do fuso (minutos) no instante dado, calculado com Intl. */
export function deslocamentoMinutos(ms: number, fuso: string = FUSO_PADRAO): number {
  let formatador = FORMATADORES_OFFSET.get(fuso);
  if (!formatador) {
    formatador = new Intl.DateTimeFormat("en-US", { timeZone: fuso, timeZoneName: "longOffset" });
    FORMATADORES_OFFSET.set(fuso, formatador);
  }
  const partes = formatador.formatToParts(new Date(ms));
  const nome = partes.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):?(\d{2})?/.exec(nome);
  if (!m) return 0;
  const sinal = m[1] === "-" ? -1 : 1;
  return sinal * (Number(m[2]) * 60 + Number(m[3] ?? 0));
}

function doisDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO 8601 com o offset do fuso: "2026-10-22T13:00:00-03:00". */
export function paraInstante(ms: number, fuso: string = FUSO_PADRAO): Instante {
  const deslocamento = deslocamentoMinutos(ms, fuso);
  const local = new Date(ms + deslocamento * MINUTO);
  const sinal = deslocamento < 0 ? "-" : "+";
  const abs = Math.abs(deslocamento);
  return (
    `${local.getUTCFullYear()}-${doisDigitos(local.getUTCMonth() + 1)}-${doisDigitos(local.getUTCDate())}` +
    `T${doisDigitos(local.getUTCHours())}:${doisDigitos(local.getUTCMinutes())}:${doisDigitos(local.getUTCSeconds())}` +
    `${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`
  );
}

/** Milissegundos que faltam até o alvo (nunca negativo). */
export function restanteAte(alvoMs: number, agoraMs: number): number {
  return Math.max(0, alvoMs - agoraMs);
}

/** Contagem compacta: "2d 03h 15min" (a partir de 1 dia) ou "03:15:20". */
export function formatarContagem(ms: number): string {
  const total = Math.max(0, Math.floor(ms / SEGUNDO));
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  if (dias > 0) return `${dias}d ${doisDigitos(horas)}h ${doisDigitos(minutos)}min`;
  return `${doisDigitos(horas)}:${doisDigitos(minutos)}:${doisDigitos(segundos)}`;
}

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n} ${n === 1 ? singular : pluralTexto}`;
}

/** Contagem por extenso, com precisão de minuto (para aria-label): "2 dias, 3 horas e 15 minutos". */
export function descreverContagem(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / MINUTO));
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const minutos = totalMin % 60;
  const partes: string[] = [];
  if (dias) partes.push(plural(dias, "dia", "dias"));
  if (horas) partes.push(plural(horas, "hora", "horas"));
  if (minutos || partes.length === 0) partes.push(plural(minutos, "minuto", "minutos"));
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/** "22/10/2026, 13:00" no fuso do evento. */
export function formatarDataHora(ms: number, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

/** "22/10/2026" no fuso do evento. */
export function formatarData(ms: number, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(ms),
  );
}

/** "13:00" no fuso do evento. */
export function formatarHora(ms: number, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(ms));
}

/** Ano no fuso do evento. */
export function anoNoFuso(ms: number, fuso: string = FUSO_PADRAO): number {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: fuso, year: "numeric" }).format(new Date(ms)));
}

/** "13:41:05" no fuso do evento ("Atualizado às" do painel). */
export function formatarHoraCompleta(ms: number, fuso: string = FUSO_PADRAO): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(
    new Date(ms),
  );
}
