import type { SituacaoEvento } from "./situacaoEvento";

// Faixa de status abaixo do cabeçalho (demanda A2, 25/11/2026): só um selo e o tempo. Pura, sem React.

export type SeloFaixa = "NAO_INICIADA" | "ABERTA" | "VOTADO" | "ENCERRADA";

export type ContagemFaixa = { alvoMs: number; rotulo: "Abre em" | "Termina em" };

export type SaidaFaixa = { selo: SeloFaixa; contagem: ContagemFaixa | null };

const SELO_DA_SITUACAO: Record<SituacaoEvento, Exclude<SeloFaixa, "VOTADO">> = {
  EM_PREPARACAO: "NAO_INICIADA",
  NAO_INICIADA: "NAO_INICIADA",
  ABERTURA_PENDENTE: "NAO_INICIADA",
  ABERTA: "ABERTA",
  RETA_FINAL: "ABERTA",
  TEMPO_ESGOTADO: "ENCERRADA",
  ENCERRADA: "ENCERRADA",
  CONCLUIDO: "ENCERRADA",
};

/**
 * `votouTudo`: o público que já votou em todas as categorias da página (as do totem não contam). Só muda o selo com a
 * votação aberta; o tempo continua ("Termina em…"). "Abre em…" só antes da abertura e com a data marcada; nada depois
 * de encerrada.
 */
export function resolverFaixaStatus(entrada: {
  situacao: SituacaoEvento;
  votouTudo: boolean;
  janelaInicioMs: number | null;
  janelaFimMs: number | null;
}): SaidaFaixa {
  const base = SELO_DA_SITUACAO[entrada.situacao];
  const selo = base === "ABERTA" && entrada.votouTudo ? "VOTADO" : base;
  let contagem: ContagemFaixa | null = null;
  if (base === "ABERTA" && entrada.janelaFimMs !== null) contagem = { alvoMs: entrada.janelaFimMs, rotulo: "Termina em" };
  if (entrada.situacao === "NAO_INICIADA" && entrada.janelaInicioMs !== null)
    contagem = { alvoMs: entrada.janelaInicioMs, rotulo: "Abre em" };
  return { selo, contagem };
}
