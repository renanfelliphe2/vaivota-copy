import { contarJuri } from "./avaliacaoJuri";
import type { Banco, Grupo } from "./tipos";

// Etapa 7 (D1, seção 5.3): tudo deriva dos votos. Não existe `contagens` no store; só serviços,
// transições, cenários e o simulador chamam estas funções.

export type VotosPorGrupo = Record<Grupo, Record<string, number>>;

function somar(alvo: Record<string, number>, candidatoId: string): void {
  alvo[candidatoId] = (alvo[candidatoId] ?? 0) + 1;
}

export type BancoContagem = Pick<
  Banco,
  "votos" | "votosJuri" | "votosInfantis" | "configsPlacar" | "criteriosJuri" | "notasJuri" | "escolhasCriterioJuri"
>;

/**
 * Votos brutos por candidato em cada grupo. Júri pelo modo do evento (08/10/2026): a escolha atual de cada jurado
 * (voto único), 1 por escolha (melhor por critério) ou a média das notas (notas por critério).
 */
export function contarVotos(banco: BancoContagem, eventoId: string): VotosPorGrupo {
  const votos: VotosPorGrupo = { POPULAR: {}, JURI: contarJuri(banco, eventoId), INFANTIL: {} };
  for (const v of banco.votos) if (v.eventoId === eventoId) somar(votos.POPULAR, v.candidatoId);
  for (const v of banco.votosInfantis) if (v.eventoId === eventoId) somar(votos.INFANTIL, v.candidatoId);
  return votos;
}

/** Votos de voto único do júri, qualquer que seja o modo (o seed de volume só gera esses). */
export function contarVotosJuriUnico(banco: Pick<Banco, "votosJuri">, eventoId: string): Record<string, number> {
  const votos: Record<string, number> = {};
  for (const v of banco.votosJuri) if (v.eventoId === eventoId) somar(votos, v.candidatoId);
  return votos;
}

/** Total bruto de um grupo. */
export function totalDoGrupo(votos: Record<string, number>): number {
  return Object.values(votos).reduce((soma, n) => soma + n, 0);
}

export type ContagemPapel = { cadastrados: number; votaram: number };
export type Participantes = { publico: ContagemPapel; jurado: ContagemPapel };

/** Cadastrados e que votaram, por papel (ADMIN não conta). */
export function contarParticipantes(banco: Pick<Banco, "participacoes">, eventoId: string): Participantes {
  const r: Participantes = { publico: { cadastrados: 0, votaram: 0 }, jurado: { cadastrados: 0, votaram: 0 } };
  for (const p of banco.participacoes) {
    if (p.eventoId !== eventoId || p.papel === "ADMIN") continue;
    const alvo = p.papel === "PUBLICO" ? r.publico : r.jurado;
    alvo.cadastrados++;
    if (p.votou) alvo.votaram++;
  }
  return r;
}
