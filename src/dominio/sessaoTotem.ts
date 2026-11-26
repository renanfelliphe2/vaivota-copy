// Sessões e análise do totem (logTotem.md, 26/11/2026). Funções puras, usadas pelo servidor (análise, resumo) e pela tela.
// Nada aqui sabe qual item foi votado: só horários, quantidades e o funil de toques do aparelho.

/** Encerramento automático: padrão de 60 min sem voto (combinado com o usuário), configurável de 5 min a 24 h. */
export const INATIVIDADE_SESSAO_PADRAO_MIN = 60;
export const INATIVIDADE_SESSAO_MIN = 5;
export const INATIVIDADE_SESSAO_MAX = 1440;

export type MotivoEncerramento = "MANUAL" | "INATIVIDADE";

/**
 * Funil de uma sessão, contado no aparelho (é o que nunca chega ao servidor sozinho). Só contagens.
 * `erros` por código (REDE, DISPOSITIVO_INATIVO...).
 */
export type FunilTotem = {
  comecou: number;
  escolheu: number;
  voltou: number;
  desistiuEscolha: number;
  desistiuConfirmar: number;
  enviou: number;
  registrado: number;
  tentouDeNovo: number;
  erroDescartado: number;
  erros: Record<string, number>;
};

export const CHAVES_FUNIL = [
  "comecou",
  "escolheu",
  "voltou",
  "desistiuEscolha",
  "desistiuConfirmar",
  "enviou",
  "registrado",
  "tentouDeNovo",
  "erroDescartado",
] as const satisfies readonly Exclude<keyof FunilTotem, "erros">[];

export function funilVazio(): FunilTotem {
  return {
    comecou: 0,
    escolheu: 0,
    voltou: 0,
    desistiuEscolha: 0,
    desistiuConfirmar: 0,
    enviou: 0,
    registrado: 0,
    tentouDeNovo: 0,
    erroDescartado: 0,
    erros: {},
  };
}

/** Lê um funil vindo do banco (JSON) sem confiar no formato. */
export function lerFunil(valor: unknown): FunilTotem | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Record<string, unknown>;
  const f = funilVazio();
  for (const chave of CHAVES_FUNIL) {
    const n = v[chave];
    if (typeof n === "number" && Number.isFinite(n) && n >= 0) f[chave] = Math.floor(n);
  }
  if (v.erros && typeof v.erros === "object") {
    for (const [codigo, n] of Object.entries(v.erros as Record<string, unknown>)) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0 && /^[A-Z_]{1,40}$/.test(codigo)) f.erros[codigo] = Math.floor(n);
    }
  }
  return f;
}

export function totalDeErros(f: FunilTotem): number {
  return Object.values(f.erros).reduce((s, n) => s + n, 0);
}

// ─────────────────────────────────────────────
// Intervalos entre votos
// ─────────────────────────────────────────────

export type FaixasIntervalo = { ate5s: number; de5a15s: number; de15a60s: number; de1a5min: number; mais5min: number };

export type EstatisticaIntervalos = {
  /** Quantidade de intervalos (votos − 1). */
  quantidade: number;
  medianaS: number;
  mediaS: number;
  menorS: number;
  maiorS: number;
  faixas: FaixasIntervalo;
};

/** Intervalos entre votos seguidos (horários em ms, em qualquer ordem). Com menos de 2 votos, null. */
export function estatisticaIntervalos(horariosMs: readonly number[]): EstatisticaIntervalos | null {
  if (horariosMs.length < 2) return null;
  const ordenados = [...horariosMs].sort((a, b) => a - b);
  const intervalos: number[] = [];
  for (let i = 1; i < ordenados.length; i++) intervalos.push((ordenados[i]! - ordenados[i - 1]!) / 1000);
  const crescentes = [...intervalos].sort((a, b) => a - b);
  const meio = Math.floor(crescentes.length / 2);
  const mediana = crescentes.length % 2 === 1 ? crescentes[meio]! : (crescentes[meio - 1]! + crescentes[meio]!) / 2;
  const faixas: FaixasIntervalo = { ate5s: 0, de5a15s: 0, de15a60s: 0, de1a5min: 0, mais5min: 0 };
  for (const s of intervalos) {
    if (s < 5) faixas.ate5s++;
    else if (s < 15) faixas.de5a15s++;
    else if (s < 60) faixas.de15a60s++;
    else if (s < 300) faixas.de1a5min++;
    else faixas.mais5min++;
  }
  return {
    quantidade: intervalos.length,
    medianaS: arredondar(mediana),
    mediaS: arredondar(intervalos.reduce((s, n) => s + n, 0) / intervalos.length),
    menorS: arredondar(crescentes[0]!),
    maiorS: arredondar(crescentes.at(-1)!),
    faixas,
  };
}

function arredondar(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Diferença em % de `atual` sobre `anterior` (+12 = 12% a mais). Sem base (anterior 0 ou ausente), null. */
export function variacaoPercentual(atual: number, anterior: number | null | undefined): number | null {
  if (anterior === null || anterior === undefined || anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

/** Quanto das crianças esperadas votou, em %. Sem esperadas, null. */
export function percentualEsperadas(votos: number, esperadas: number | null | undefined): number | null {
  if (!esperadas || esperadas <= 0) return null;
  return Math.round((votos / esperadas) * 1000) / 10;
}

export type FaixaDeTempo = { inicioMs: number; votos: number };

/** Votos a cada `minutos` (padrão 10), do primeiro ao último voto, incluindo as faixas vazias no meio. */
export function votosPorFaixa(horariosMs: readonly number[], minutos = 10): FaixaDeTempo[] {
  if (horariosMs.length === 0) return [];
  const passo = minutos * 60_000;
  const ordenados = [...horariosMs].sort((a, b) => a - b);
  const inicio = Math.floor(ordenados[0]! / passo) * passo;
  const fim = Math.floor(ordenados.at(-1)! / passo) * passo;
  // Teto de faixas: uma sessão esquecida aberta por dias não vira milhares de barras.
  const quantidade = Math.min(Math.round((fim - inicio) / passo) + 1, 288);
  const faixas = Array.from({ length: quantidade }, (_, i) => ({ inicioMs: inicio + i * passo, votos: 0 }));
  for (const h of ordenados) {
    const i = Math.min(Math.floor((h - inicio) / passo), quantidade - 1);
    faixas[i]!.votos++;
  }
  return faixas;
}

// ─────────────────────────────────────────────
// Resumo e análise (o que o servidor devolve ao menu do PIN)
// ─────────────────────────────────────────────

export type ResumoSessao = {
  id: string;
  numero: number;
  abertaEm: string;
  encerradaEm: string | null;
  motivo: MotivoEncerramento | null;
  votos: number;
  /** Votos do aparelho antes desta sessão começar. */
  votosAntes: number;
  criancasEsperadas: number | null;
  percentualEsperadas: number | null;
  /** % a mais (+) ou a menos (−) que a sessão anterior. */
  variacaoAnterior: number | null;
  primeiroVotoEm: string | null;
  ultimoVotoEm: string | null;
  intervalos: EstatisticaIntervalos | null;
  funil: FunilTotem | null;
  funilEm: string | null;
};

export type AnaliseTotem = {
  nome: string;
  inatividadeMin: number;
  votosTotal: number;
  /** Votos de antes das sessões existirem (sem sessão). */
  votosSemSessao: number;
  intervalosSemSessao: EstatisticaIntervalos | null;
  /** Da mais nova para a mais antiga. A aberta, se houver, é a primeira. */
  sessoes: ResumoSessao[];
  /** Votos a cada 10 min da sessão atual (ou da última). */
  faixasAtual: FaixaDeTempo[];
  geradoEm: string;
};

/** O que o voto devolve ao totem (o contador da tela de sucesso). */
export type ContagemVotoTotem = { sessaoId: string; numeroSessao: number; votosSessao: number; votosTotal: number };

type SessaoBruta = {
  id: string;
  numero: number;
  abertaEm: Date;
  encerradaEm: Date | null;
  motivo: MotivoEncerramento | null;
  criancasEsperadas: number | null;
  funil: unknown;
  funilEm: Date | null;
};

/** Monta os resumos (mais nova primeiro) a partir das sessões e dos horários dos votos de cada uma. */
export function resumirSessoes(sessoes: readonly SessaoBruta[], votosPorSessao: ReadonlyMap<string, number[]>, votosSemSessao: number): ResumoSessao[] {
  const crescentes = [...sessoes].sort((a, b) => a.numero - b.numero);
  let acumulado = votosSemSessao;
  let anterior: number | null = null;
  const resumos: ResumoSessao[] = [];
  for (const s of crescentes) {
    const horarios = [...(votosPorSessao.get(s.id) ?? [])].sort((a, b) => a - b);
    const votos = horarios.length;
    resumos.push({
      id: s.id,
      numero: s.numero,
      abertaEm: s.abertaEm.toISOString(),
      encerradaEm: s.encerradaEm?.toISOString() ?? null,
      motivo: s.motivo,
      votos,
      votosAntes: acumulado,
      criancasEsperadas: s.criancasEsperadas,
      percentualEsperadas: percentualEsperadas(votos, s.criancasEsperadas),
      variacaoAnterior: variacaoPercentual(votos, anterior),
      primeiroVotoEm: horarios.length ? new Date(horarios[0]!).toISOString() : null,
      ultimoVotoEm: horarios.length ? new Date(horarios.at(-1)!).toISOString() : null,
      intervalos: estatisticaIntervalos(horarios),
      funil: lerFunil(s.funil),
      funilEm: s.funilEm?.toISOString() ?? null,
    });
    acumulado += votos;
    anterior = votos;
  }
  return resumos.reverse();
}

/** "1 h 05 min", "12 min", "45 s": para intervalos e "aberta há". */
export function formatarDuracao(segundos: number): string {
  const s = Math.max(0, Math.round(segundos));
  if (s < 60) return `${s} s`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const resto = min % 60;
  return resto ? `${h} h ${String(resto).padStart(2, "0")} min` : `${h} h`;
}
