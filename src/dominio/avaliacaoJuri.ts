import { paraInstante } from "@/lib/tempo";
import { arredondar6 } from "./apuracao";
import type { Banco, CriterioJuri, EstadoApp, Instante, ModoVotoJuri, NotaJuri } from "./tipos";

// Votação do júri por critério (08/10/2026). Puro: contagem por modo e mutações das notas e escolhas.
// Decisões do dono do produto: nota inteira de 0 a 10; placar do júri por notas = média simples de todas as notas
// que o candidato recebeu (todos os critérios e jurados); cada candidato é salvo por si; em "melhor por critério",
// cada escolha vale 1 voto. Só o modo ativo entra na apuração; os dados dos outros modos ficam guardados.

export const NOTA_MINIMA = 0;
export const NOTA_MAXIMA = 10;

export const MODOS_VOTO_JURI: ModoVotoJuri[] = ["VOTO_UNICO", "NOTAS_POR_CRITERIO", "MELHOR_POR_CRITERIO"];

export const ROTULO_MODO_JURI: Record<ModoVotoJuri, string> = {
  VOTO_UNICO: "Voto único",
  NOTAS_POR_CRITERIO: "Notas por critério",
  MELHOR_POR_CRITERIO: "Melhor por critério",
};

export const DESCRICAO_MODO_JURI: Record<ModoVotoJuri, string> = {
  VOTO_UNICO: "Cada jurado escolhe um candidato, como o público.",
  NOTAS_POR_CRITERIO: `Cada jurado dá uma nota de ${NOTA_MINIMA} a ${NOTA_MAXIMA} a cada candidato em cada critério. O placar do júri usa a média das notas.`,
  MELHOR_POR_CRITERIO: "Cada jurado escolhe o melhor candidato em cada critério. Cada escolha vale 1 voto do júri.",
};

export function ehModoPorCriterio(modo: ModoVotoJuri): boolean {
  return modo !== "VOTO_UNICO";
}

export function notaValida(nota: unknown): nota is number {
  return typeof nota === "number" && Number.isInteger(nota) && nota >= NOTA_MINIMA && nota <= NOTA_MAXIMA;
}

type BancoJuri = Pick<Banco, "configsPlacar" | "criteriosJuri" | "notasJuri" | "escolhasCriterioJuri" | "votosJuri">;

/** Sem ConfigPlacar (não acontece no seed), VOTO_UNICO. */
export function modoVotoJuriDoEvento(banco: Pick<Banco, "configsPlacar">, eventoId: string): ModoVotoJuri {
  return banco.configsPlacar.find((c) => c.eventoId === eventoId)?.modoVotoJuri ?? "VOTO_UNICO";
}

export function criteriosDoEvento(banco: Pick<Banco, "criteriosJuri">, eventoId: string): CriterioJuri[] {
  return banco.criteriosJuri.filter((c) => c.eventoId === eventoId).sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
}

export function mediaDasNotas(notas: readonly number[]): number | null {
  if (notas.length === 0) return null;
  return arredondar6(notas.reduce((s, n) => s + n, 0) / notas.length);
}

/**
 * Placar bruto do júri pelo modo ativo. VOTO_UNICO: a escolha atual de cada jurado. MELHOR: 1 por escolha.
 * NOTAS: média simples das notas recebidas (6 casas). Só critérios existentes contam.
 */
export function contarJuri(banco: BancoJuri, eventoId: string): Record<string, number> {
  const modo = modoVotoJuriDoEvento(banco, eventoId);
  const placar: Record<string, number> = {};
  if (modo === "VOTO_UNICO") {
    for (const v of banco.votosJuri) if (v.eventoId === eventoId) placar[v.candidatoId] = (placar[v.candidatoId] ?? 0) + 1;
    return placar;
  }
  const criterios = new Set(criteriosDoEvento(banco, eventoId).map((c) => c.id));
  if (modo === "MELHOR_POR_CRITERIO") {
    for (const e of banco.escolhasCriterioJuri)
      if (e.eventoId === eventoId && criterios.has(e.criterioId)) placar[e.candidatoId] = (placar[e.candidatoId] ?? 0) + 1;
    return placar;
  }
  const porCandidato = new Map<string, number[]>();
  for (const n of banco.notasJuri) {
    if (n.eventoId !== eventoId || !criterios.has(n.criterioId)) continue;
    porCandidato.set(n.candidatoId, [...(porCandidato.get(n.candidatoId) ?? []), n.nota]);
  }
  for (const [candidatoId, notas] of porCandidato) placar[candidatoId] = mediaDasNotas(notas) ?? 0;
  return placar;
}

// ─────────────────────────────────────────────
// Avaliação de um jurado
// ─────────────────────────────────────────────

export type AvaliacaoJurado = {
  /** candidatoId → criterioId → nota (só critérios existentes). */
  notas: Record<string, Record<string, number>>;
  /** criterioId → candidatoId (só critérios existentes). */
  escolhas: Record<string, string>;
};

export function avaliacaoDoJurado(
  banco: Pick<Banco, "criteriosJuri" | "notasJuri" | "escolhasCriterioJuri">,
  participacaoId: string,
  eventoId: string,
): AvaliacaoJurado {
  const criterios = new Set(criteriosDoEvento(banco, eventoId).map((c) => c.id));
  const notas: AvaliacaoJurado["notas"] = {};
  for (const n of banco.notasJuri) {
    if (n.participacaoId !== participacaoId || n.eventoId !== eventoId || !criterios.has(n.criterioId)) continue;
    notas[n.candidatoId] = { ...notas[n.candidatoId], [n.criterioId]: n.nota };
  }
  const escolhas: AvaliacaoJurado["escolhas"] = {};
  for (const e of banco.escolhasCriterioJuri)
    if (e.participacaoId === participacaoId && e.eventoId === eventoId && criterios.has(e.criterioId)) escolhas[e.criterioId] = e.candidatoId;
  return { notas, escolhas };
}

/** Candidato avaliado = nota em todos os critérios atuais (o salvamento exige todos). */
export function candidatoAvaliado(notas: Record<string, number> | undefined, criterios: readonly CriterioJuri[]): boolean {
  return criterios.length > 0 && criterios.every((c) => notaValida(notas?.[c.id]));
}

/** Invariante 4 (08/10/2026): jurado votou ⇔ tem voto único, nota ou escolha no evento (qualquer modo). */
export function juradoTemVoto(banco: Pick<Banco, "votosJuri" | "notasJuri" | "escolhasCriterioJuri">, participacaoId: string): boolean {
  return (
    banco.votosJuri.some((v) => v.participacaoId === participacaoId) ||
    banco.notasJuri.some((n) => n.participacaoId === participacaoId) ||
    banco.escolhasCriterioJuri.some((e) => e.participacaoId === participacaoId)
  );
}

/** Reacerta `votou` dos jurados do evento depois de remover notas ou escolhas. */
export function recalcularVotouJurados(banco: Banco, eventoId: string): Banco {
  return {
    ...banco,
    participacoes: banco.participacoes.map((p) =>
      p.eventoId === eventoId && p.papel === "JURADO" ? { ...p, votou: juradoTemVoto(banco, p.id) } : p,
    ),
  };
}

/** Remove as notas e escolhas do evento (zerar votos, restaurar núcleo). Não mexe em `votou`. */
export function semAvaliacoesDoEvento(banco: Banco, eventoId: string): Banco {
  return {
    ...banco,
    notasJuri: banco.notasJuri.filter((n) => n.eventoId !== eventoId),
    escolhasCriterioJuri: banco.escolhasCriterioJuri.filter((e) => e.eventoId !== eventoId),
  };
}

// ─────────────────────────────────────────────
// Mutações (o serviço já validou)
// ─────────────────────────────────────────────

function idNota(participacaoId: string, candidatoId: string, criterioId: string): string {
  return `nj-${participacaoId}-${candidatoId}-${criterioId}`;
}

function idEscolha(participacaoId: string, criterioId: string): string {
  return `ec-${participacaoId}-${criterioId}`;
}

function marcarVotou(banco: Banco, participacaoId: string): Banco {
  return { ...banco, participacoes: banco.participacoes.map((p) => (p.id === participacaoId ? { ...p, votou: true } : p)) };
}

function agoraDoEvento(estado: EstadoApp, eventoId: string, agoraMs: number) {
  return paraInstante(agoraMs, estado.banco.eventos.find((e) => e.id === eventoId)?.fusoHorario);
}

export type EntradaNotas = {
  eventoId: string;
  participacaoId: string;
  candidatoId: string;
  /** criterioId → nota (todos os critérios). */
  notas: Record<string, number>;
  agoraMs: number;
};

/** Grava (cria ou substitui) as notas do candidato e marca `votou`. */
export function aplicarNotasJuri(estado: EstadoApp, entrada: EntradaNotas): EstadoApp {
  const { eventoId, participacaoId, candidatoId, notas, agoraMs } = entrada;
  const agora = agoraDoEvento(estado, eventoId, agoraMs);
  const porId = new Map(estado.banco.notasJuri.map((n) => [n.id, n]));
  const novas: NotaJuri[] = Object.entries(notas).map(([criterioId, nota]) => {
    const id = idNota(participacaoId, candidatoId, criterioId);
    const existente = porId.get(id);
    if (existente) return existente.nota === nota ? existente : { ...existente, nota, atualizadoEm: agora };
    return { id, eventoId, participacaoId, candidatoId, criterioId, nota, criadoEm: agora, atualizadoEm: agora };
  });
  const ids = new Set(novas.map((n) => n.id));
  const banco = { ...estado.banco, notasJuri: [...estado.banco.notasJuri.filter((n) => !ids.has(n.id)), ...novas] };
  return { ...estado, banco: marcarVotou(banco, participacaoId) };
}

export type EntradaEscolhas = {
  eventoId: string;
  participacaoId: string;
  candidatoId: string;
  /** Critérios em que este candidato passa a ser o melhor. Os demais em que ele era o melhor ficam vazios. */
  criterioIds: string[];
  agoraMs: number;
};

/** Grava as escolhas do candidato (substitui quem era o melhor no critério) e reacerta `votou`. */
export function aplicarEscolhasJuri(estado: EstadoApp, entrada: EntradaEscolhas): EstadoApp {
  const { eventoId, participacaoId, candidatoId, criterioIds, agoraMs } = entrada;
  const agora = agoraDoEvento(estado, eventoId, agoraMs);
  const marcados = new Set(criterioIds);
  const doJurado = (e: { participacaoId: string; eventoId: string }) => e.participacaoId === participacaoId && e.eventoId === eventoId;
  const mantidas = estado.banco.escolhasCriterioJuri.filter(
    (e) => !doJurado(e) || (!marcados.has(e.criterioId) && e.candidatoId !== candidatoId),
  );
  const novas = criterioIds.map((criterioId) => {
    const existente = estado.banco.escolhasCriterioJuri.find((e) => doJurado(e) && e.criterioId === criterioId);
    if (existente?.candidatoId === candidatoId) return existente;
    return {
      id: idEscolha(participacaoId, criterioId),
      eventoId,
      participacaoId,
      criterioId,
      candidatoId,
      criadoEm: existente?.criadoEm ?? agora,
      atualizadoEm: agora,
    };
  });
  const banco = { ...estado.banco, escolhasCriterioJuri: [...mantidas, ...novas] };
  return { ...estado, banco: recalcularVotouJurados(banco, eventoId) };
}

// ─────────────────────────────────────────────
// Configuração (admin e toolbar)
// ─────────────────────────────────────────────

export type CriterioEditado = { id: string | null; nome: string };
export type DadosAvaliacaoJuri = { modoVotoJuri: ModoVotoJuri; criterios: CriterioEditado[] };

/** Id novo e estável, sem relógio nem aleatório: `crit-<eventoId>-<n>` com o menor n livre. */
function novoIdCriterio(existentes: Set<string>, eventoId: string): string {
  let n = 1;
  while (existentes.has(`crit-${eventoId}-${n}`)) n++;
  const id = `crit-${eventoId}-${n}`;
  existentes.add(id);
  return id;
}

/**
 * Pura: troca o modo e os critérios do evento. Critério removido leva junto as notas e escolhas dele (antes da urna
 * abrir, normalmente não há nenhuma); depois reacerta `votou` dos jurados.
 */
export function aplicarAvaliacaoJuri(estado: EstadoApp, eventoId: string, dados: DadosAvaliacaoJuri, agora: Instante): EstadoApp {
  const { banco } = estado;
  const ids = new Set(banco.criteriosJuri.map((c) => c.id));
  const doEvento = new Set(criteriosDoEvento(banco, eventoId).map((c) => c.id));
  const criterios: CriterioJuri[] = dados.criterios.map((c, i) => ({
    id: c.id && doEvento.has(c.id) ? c.id : novoIdCriterio(ids, eventoId),
    eventoId,
    nome: c.nome.trim(),
    ordem: i + 1,
  }));
  const mantidos = new Set(criterios.map((c) => c.id));
  const removido = (criterioId: string) => doEvento.has(criterioId) && !mantidos.has(criterioId);
  const proximo = {
    ...banco,
    configsPlacar: banco.configsPlacar.map((c) => (c.eventoId === eventoId ? { ...c, modoVotoJuri: dados.modoVotoJuri, atualizadoEm: agora } : c)),
    criteriosJuri: [...banco.criteriosJuri.filter((c) => c.eventoId !== eventoId), ...criterios],
    notasJuri: banco.notasJuri.filter((n) => !removido(n.criterioId)),
    escolhasCriterioJuri: banco.escolhasCriterioJuri.filter((e) => !removido(e.criterioId)),
  };
  return { ...estado, banco: recalcularVotouJurados(proximo, eventoId) };
}
