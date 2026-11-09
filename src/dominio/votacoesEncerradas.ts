import type { DadosResultado } from "./tipos";

// Votações encerradas na landing da plataforma (07/11/2026): participantes, votos e vencedor de cada evento. O servidor
// monta a lista (src/server/votacoesEncerradas.ts); aqui ficam só as regras puras.
//
// O que aparece e quando:
//  - Participantes e votos: assim que a urna encerra. São totais finais e não dizem quem venceu (o telão já mostra o
//    total ao vivo durante a votação).
//  - Vencedor: só com o evento CONCLUIDO. Com a urna encerrada e o evento ainda ativo, a organização pode estar guardando
//    o resultado para a revelação no telão; concluir o evento é o sinal de que ele já é público.

export type VotosPorGrupo = { publico: number; juri: number; infantil: number };

export type VencedorVitrine = { id: string; titulo: string; imagemUrl: string | null };

export type VotacaoEncerrada = {
  eventoId: string;
  slug: string;
  /** Nome de exibição do tema ou, sem ele, o nome do evento. */
  nome: string;
  local: string | null;
  /** Quando a urna encerrou (ms). */
  encerradaEmMs: number;
  /** Quando o evento foi concluído (ms); null enquanto ele segue ativo. */
  concluidaEmMs: number | null;
  fusoHorario: string;
  tema: { corPrimaria: string; corSecundaria: string; logoUrl: string | null };
  /** Como o evento chama o candidato ("Projeto", "Curta"). */
  rotuloCandidato: string;
  /** Pessoas inscritas na votação: público e júri. A organização não conta, e o totem infantil não tem inscrição. */
  participantes: number;
  /** Cédulas: um por pessoa do público, um por jurado que votou e um por toque no totem. */
  votos: VotosPorGrupo & { total: number };
  modulos: { juri: boolean; infantil: boolean };
  /**
   * Primeiro lugar do resultado oficial, só com o evento concluído; null antes disso. Mais de um: empate sem desempate.
   * Vazio: nenhum voto válido.
   */
  vencedores: VencedorVitrine[] | null;
  /**
   * Evento com categorias (09/11/2026): o primeiro lugar de cada categoria, na ordem delas, só com o evento concluído (como
   * `vencedores`, que aí junta todos, para as imagens). Ausente ou null em evento sem categorias.
   */
  vencedoresPorCategoria?: { categoria: string; vencedores: VencedorVitrine[] }[] | null;
};

/** Votação com o resultado já público (evento concluído). */
export type VotacaoComResultado = VotacaoEncerrada & { concluidaEmMs: number; vencedores: VencedorVitrine[] };

export function comResultado(votacao: VotacaoEncerrada): votacao is VotacaoComResultado {
  return votacao.vencedores !== null && votacao.concluidaEmMs !== null;
}

/** Candidatos no primeiro lugar do ranking oficial. Sem pontos (nenhum voto válido), ninguém venceu. */
export function idsDosVencedores(ranking: DadosResultado["ranking"] | undefined): string[] {
  if (!Array.isArray(ranking)) return [];
  return ranking.filter((r) => r.posicao === 1 && r.pontuacao > 0).map((r) => r.candidatoId);
}

export function comTotal(votos: VotosPorGrupo): VotosPorGrupo & { total: number } {
  return { ...votos, total: votos.publico + votos.juri + votos.infantil };
}

/** Mais recente primeiro (pelo encerramento da urna); no mesmo instante, pelo nome. */
export function ordenarVotacoes<T extends Pick<VotacaoEncerrada, "encerradaEmMs" | "nome">>(votacoes: readonly T[]): T[] {
  return [...votacoes].sort((a, b) => b.encerradaEmMs - a.encerradaEmMs || a.nome.localeCompare(b.nome, "pt-BR"));
}

export type GrupoNaVitrine = { rotulo: string; votos: number };

/** Os grupos que votaram no evento: o público sempre; júri e crianças só com o módulo ligado. */
export function gruposDaVotacao(votacao: Pick<VotacaoEncerrada, "votos" | "modulos">): GrupoNaVitrine[] {
  const grupos: GrupoNaVitrine[] = [{ rotulo: "Público", votos: votacao.votos.publico }];
  if (votacao.modulos.juri) grupos.push({ rotulo: "Júri", votos: votacao.votos.juri });
  if (votacao.modulos.infantil) grupos.push({ rotulo: "Crianças", votos: votacao.votos.infantil });
  return grupos;
}

export type TotaisDaVitrine = { votacoes: number; participantes: number; votos: number };

export function totaisDaVitrine(votacoes: readonly Pick<VotacaoEncerrada, "participantes" | "votos">[]): TotaisDaVitrine {
  return {
    votacoes: votacoes.length,
    participantes: votacoes.reduce((s, v) => s + v.participantes, 0),
    votos: votacoes.reduce((s, v) => s + v.votos.total, 0),
  };
}

/** Evento com categorias (09/11/2026): o primeiro lugar de cada categoria. null sem categorias (ou sem resultado). */
export function idsDosVencedoresPorCategoria(dados: Pick<DadosResultado, "porCategoria"> | null | undefined): { categoria: string; ids: string[] }[] | null {
  const porCategoria = dados?.porCategoria;
  if (!Array.isArray(porCategoria) || porCategoria.length === 0) return null;
  return porCategoria.map((c) => ({ categoria: c.nome, ids: idsDosVencedores(c.dados?.ranking) }));
}
