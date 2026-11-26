// Efeitos sonoros do totem (26/11/2026): sintetizados na hora pela Web Audio API, sem arquivo de áudio para baixar nem para
// faltar na rede do evento. Notas curtas e suaves (seno e triângulo, envelope rápido), num volume baixo: é um aparelho num salão
// cheio de crianças. O contexto de áudio só nasce no primeiro toque (os navegadores bloqueiam som antes de um gesto) e é
// reaproveitado. Sem Web Audio, o totem segue mudo.

export type SomTotem = "comecar" | "escolher" | "voltar" | "confirmar" | "sucesso" | "erro";

type Nota = {
  /** Hz. */
  freq: number;
  /** Segundos depois do toque. */
  inicio: number;
  /** Segundos. */
  dur: number;
  tipo?: OscillatorType;
  volume?: number;
  /** Desliza a frequência até esta, ao longo da nota (o "plim" e o "pop"). */
  ate?: number;
};

// Notas (Hz).
const DO5 = 523.25;
const MI5 = 659.25;
const SOL5 = 783.99;
const DO6 = 1046.5;
const MI6 = 1318.51;
const SOL6 = 1567.98;

const SONS: Record<SomTotem, Nota[]> = {
  // Abertura: arpejo subindo.
  comecar: [
    { freq: DO5, inicio: 0, dur: 0.16, tipo: "triangle" },
    { freq: MI5, inicio: 0.08, dur: 0.16, tipo: "triangle" },
    { freq: SOL5, inicio: 0.16, dur: 0.18, tipo: "triangle" },
    { freq: DO6, inicio: 0.24, dur: 0.32, tipo: "triangle" },
  ],
  // Tocou num cartaz: um "pop" que sobe.
  escolher: [{ freq: 480, ate: 920, inicio: 0, dur: 0.14, tipo: "sine", volume: 0.5 }],
  // Voltar: o "pop" ao contrário.
  voltar: [{ freq: 620, ate: 300, inicio: 0, dur: 0.18, tipo: "sine", volume: 0.4 }],
  // "Sim!": duas notas firmes.
  confirmar: [
    { freq: SOL5, inicio: 0, dur: 0.12, tipo: "triangle" },
    { freq: DO6, inicio: 0.09, dur: 0.22, tipo: "triangle" },
  ],
  // Voto guardado: fanfarra curta e o acorde final.
  sucesso: [
    { freq: DO5, inicio: 0, dur: 0.14, tipo: "triangle" },
    { freq: MI5, inicio: 0.11, dur: 0.14, tipo: "triangle" },
    { freq: SOL5, inicio: 0.22, dur: 0.14, tipo: "triangle" },
    { freq: DO6, inicio: 0.34, dur: 0.7, tipo: "triangle", volume: 0.5 },
    { freq: MI6, inicio: 0.34, dur: 0.7, tipo: "sine", volume: 0.3 },
    { freq: SOL6, inicio: 0.34, dur: 0.7, tipo: "sine", volume: 0.22 },
  ],
  // Erro: duas notas descendo, graves e baixinhas (sem susto).
  erro: [
    { freq: 392, inicio: 0, dur: 0.2, tipo: "sine", volume: 0.45 },
    { freq: 294, inicio: 0.18, dur: 0.32, tipo: "sine", volume: 0.45 },
  ],
};

/** Volume geral (0 a 1). */
const VOLUME = 0.35;

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!contexto) {
    const Construtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Construtor) return null;
    try {
      contexto = new Construtor();
    } catch {
      return null;
    }
  }
  if (contexto.state === "suspended") void contexto.resume().catch(() => {});
  return contexto;
}

/** Toca um efeito. Nunca lança: som é enfeite, o voto não depende dele. */
export function tocarSomTotem(som: SomTotem): void {
  const ctx = obterContexto();
  if (!ctx) return;
  try {
    const agora = ctx.currentTime + 0.01;
    const saida = ctx.createGain();
    saida.gain.value = VOLUME;
    saida.connect(ctx.destination);
    for (const nota of SONS[som]) {
      const t0 = agora + nota.inicio;
      const fim = t0 + nota.dur;
      const osc = ctx.createOscillator();
      const envelope = ctx.createGain();
      osc.type = nota.tipo ?? "sine";
      osc.frequency.setValueAtTime(nota.freq, t0);
      if (nota.ate) osc.frequency.exponentialRampToValueAtTime(nota.ate, fim);
      envelope.gain.setValueAtTime(0.0001, t0);
      envelope.gain.exponentialRampToValueAtTime(nota.volume ?? 0.6, t0 + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, fim);
      osc.connect(envelope).connect(saida);
      osc.start(t0);
      osc.stop(fim + 0.05);
    }
  } catch {
    // Aparelho sem áudio ou contexto fechado: segue mudo.
  }
}
