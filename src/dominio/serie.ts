import { MINUTO, paraMs } from "@/lib/tempo";
import type { Instante } from "./tipos";

// Etapa 7 (D13, seção 5.8): série de votos com passo adaptativo. Pura.

export type PassoSerie = 1 | 10 | 60;

export type PontoSerie = { inicio: Instante; popular: number; juri: number; infantil: number };

export type SerieVotos = {
  passoMinutos: PassoSerie;
  /** urnaAbertaEm; null se a urna nunca abriu (série vazia). */
  inicio: Instante | null;
  pontos: PontoSerie[];
  /** Total do intervalo; primeiro máximo. */
  pico: { inicio: Instante; votos: number } | null;
};

/** 1 min até 3 h; 10 min até 24 h; 1 h acima. */
export function passoDaSerie(intervaloMs: number): PassoSerie {
  const minutos = intervaloMs / MINUTO;
  if (minutos <= 180) return 1;
  if (minutos <= 1440) return 10;
  return 60;
}

export type EntradaSerie = {
  abertaEm: Instante | null;
  /** Fim do intervalo: agora (urna aberta) ou urnaEncerradaEm. */
  ateMs: number;
  /** `criadoEm` de Voto, VotoJuri (primeiro registro) e VotoInfantil. */
  votos: { popular: Instante[]; juri: Instante[]; infantil: Instante[] };
  /** Converte o início de cada balde em Instante no fuso do evento. */
  paraInstante: (ms: number) => Instante;
};

export function totalDoPonto(p: PontoSerie): number {
  return p.popular + p.juri + p.infantil;
}

export function montarSerie(entrada: EntradaSerie): SerieVotos {
  if (!entrada.abertaEm) return { passoMinutos: 1, inicio: null, pontos: [], pico: null };
  const inicioMs = paraMs(entrada.abertaEm);
  const intervalo = Math.max(0, entrada.ateMs - inicioMs);
  const passoMinutos = passoDaSerie(intervalo);
  const passoMs = passoMinutos * MINUTO;
  const quantidade = Math.max(1, Math.ceil(intervalo / passoMs));
  const pontos: PontoSerie[] = Array.from({ length: quantidade }, (_, i) => ({
    inicio: entrada.paraInstante(inicioMs + i * passoMs),
    popular: 0,
    juri: 0,
    infantil: 0,
  }));
  const somar = (lista: Instante[], campo: "popular" | "juri" | "infantil") => {
    for (const instante of lista) {
      const ms = paraMs(instante);
      if (ms < inicioMs || ms > entrada.ateMs) continue;
      const i = Math.min(quantidade - 1, Math.floor((ms - inicioMs) / passoMs));
      pontos[i][campo]++;
    }
  };
  somar(entrada.votos.popular, "popular");
  somar(entrada.votos.juri, "juri");
  somar(entrada.votos.infantil, "infantil");

  let pico: SerieVotos["pico"] = null;
  for (const p of pontos) {
    const total = totalDoPonto(p);
    if (total > 0 && (!pico || total > pico.votos)) pico = { inicio: p.inicio, votos: total };
  }
  return { passoMinutos, inicio: entrada.abertaEm, pontos, pico };
}

/** Título do gráfico conforme o passo. */
export function tituloDaSerie(passo: PassoSerie): string {
  if (passo === 1) return "Votos por minuto";
  if (passo === 10) return "Votos por 10 minutos";
  return "Votos por hora";
}
