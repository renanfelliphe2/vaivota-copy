import { criterioEfetivo } from "../apuracao";
import { casasDaPontuacao, gruposDoResultado } from "../resultado";
import type { DadosResultado, Grupo, RegraDesempate } from "../tipos";
import { LIMITE_NOMES_CENA, LINHAS_CLASSIFICACAO } from "./duracoes";
import type { Cena, ModoRevelacao } from "./tipos";

// Etapa 8 (D1, D12, seção 5.4): roteiro puro e determinístico; as cenas só desenham as fatias de montarProps.

const ORDEM_CATEGORIAS: Grupo[] = ["POPULAR", "INFANTIL", "JURI"];

export type OpcoesRoteiro = { classificacaoCompleta: boolean; modo: ModoRevelacao; candidatosNaDisputa: number };

export function montarRoteiro(dados: DadosResultado, opcoes: OpcoesRoteiro): Cena[] {
  const cenas: Cena[] = [];
  if (opcoes.modo === "ENSAIO") cenas.push({ tipo: "AO_VIVO_ENSAIO" }, { tipo: "ENCERRADA_ENSAIO" });
  cenas.push({ tipo: "TRAILER" });
  if (dados.ranking.length === 0) {
    cenas.push({ tipo: "FINAL" });
    return cenas;
  }

  for (const grupo of ORDEM_CATEGORIAS) {
    const categoria = dados.categorias.find((c) => c.grupo === grupo);
    if (categoria && categoria.vencedores.length > 0) cenas.push({ tipo: "CATEGORIA", grupo, passos: 3 });
  }

  const posicaoDe = new Map(dados.ranking.map((r) => [r.candidatoId, r.posicao]));
  // Desempates com algum candidato em posição ≤ 3, agrupados pela pior posição ≤ 3 do trecho.
  const desempatesAntes = new Map<number, number[]>();
  dados.empates.forEach((e, k) => {
    const posicoes = e.candidatoIds.map((id) => posicaoDe.get(id) ?? Infinity).filter((p) => p <= 3);
    if (posicoes.length === 0) return;
    const pior = Math.max(...posicoes);
    desempatesAntes.set(pior, [...(desempatesAntes.get(pior) ?? []), k]);
  });

  const distintas = [...new Set(dados.ranking.map((r) => r.posicao))].filter((p) => p <= 3).sort((a, b) => b - a);
  for (const posicao of distintas) {
    for (const k of desempatesAntes.get(posicao) ?? []) cenas.push({ tipo: "DESEMPATE", empateIndex: k, passos: 3 });
    cenas.push({ tipo: "PODIO", posicao: posicao as 1 | 2 | 3, passos: 3 });
  }

  if (opcoes.classificacaoCompleta)
    cenas.push({ tipo: "CLASSIFICACAO", paginas: Math.max(1, Math.ceil(opcoes.candidatosNaDisputa / LINHAS_CLASSIFICACAO)) });
  cenas.push({ tipo: "FINAL" });
  return cenas;
}

export function passosDaCena(cena: Cena): number {
  switch (cena.tipo) {
    case "CATEGORIA":
    case "DESEMPATE":
    case "PODIO":
      return cena.passos;
    case "CLASSIFICACAO":
      return cena.paginas;
    case "TRAILER":
      // 08/10/2026: o vídeo e, depois dele, a chamada "E os vencedores deste ano são…".
      return 2;
    default:
      return 1;
  }
}

/** Código curto da cena (autotestes e LiveRegion): "CAT:POPULAR", "D:0", "P:1". */
export function codigoDaCena(cena: Cena): string {
  switch (cena.tipo) {
    case "CATEGORIA":
      return `CAT:${cena.grupo}`;
    case "DESEMPATE":
      return `D:${cena.empateIndex}`;
    case "PODIO":
      return `P:${cena.posicao}`;
    default:
      return cena.tipo;
  }
}

export type ListaLimitada<T> = { itens: T[]; mais: number };

function limitar<T>(lista: T[]): ListaLimitada<T> {
  return { itens: lista.slice(0, LIMITE_NOMES_CENA), mais: Math.max(0, lista.length - LIMITE_NOMES_CENA) };
}

export type PropsCena =
  | { tipo: "CATEGORIA"; grupo: Grupo; vencedores: { candidatoId: string; votos: number }[]; desempatadoPorPontuacao: boolean; passo: number }
  | {
      tipo: "DESEMPATE";
      candidatos: ListaLimitada<{ candidatoId: string; votos: number; posicao: number }>;
      criterio: RegraDesempate;
      criterioConfigurado: RegraDesempate;
      resolvido: boolean;
      vencedorId: string | null;
      passo: number;
    }
  | {
      tipo: "PODIO";
      posicao: number;
      candidatos: ListaLimitada<{ candidatoId: string; pontuacao: number }>;
      compartilhada: boolean;
      casas: 2 | 4;
      passo: number;
      /** 08/10/2026: o pódio inteiro, montado de baixo para cima; posições ainda não reveladas vêm sem candidatos. */
      degraus: { posicao: number; candidatos: ListaLimitada<{ candidatoId: string; pontuacao: number }> | null }[];
    }
  | { tipo: "CLASSIFICACAO"; linhas: { candidatoId: string; posicao: number; pontuacao: number }[]; pagina: number; paginas: number; casas: 2 | 4 }
  | { tipo: "FINAL" } & PropsFinal
  | { tipo: "OUTRA" };

/** Detalhe do candidato nos cards do final (08/10/2026): votos e fatia de cada grupo, e as categorias vencidas (selos). */
export type DetalheFinal = {
  votos: { grupo: Grupo; votos: number; percentual: number }[];
  selos: Grupo[];
};

export type PropsFinal = {
  podio: { posicao: number; candidatos: ListaLimitada<{ candidatoId: string; pontuacao: number; detalhe: DetalheFinal }> }[];
  categorias: { grupo: Grupo; vencedores: { candidatoId: string; votos: number }[] }[];
  /** Vencedores de categoria que ficaram fora do pódio (os do pódio levam o selo no próprio card). */
  destaques: { grupo: Grupo; candidatoId: string }[];
  casas: 2 | 4;
  vazio: boolean;
};

function candidatosDaPosicao(dados: DadosResultado, posicao: number) {
  return dados.ranking.filter((r) => r.posicao === posicao).map((r) => ({ candidatoId: r.candidatoId, pontuacao: r.pontuacao }));
}

function posicoesDoPodio(dados: DadosResultado): number[] {
  return [...new Set(dados.ranking.map((r) => r.posicao))].filter((p) => p <= 3).sort((a, b) => a - b);
}

function detalheDoCandidato(dados: DadosResultado, candidatoId: string): DetalheFinal {
  const grupos = ORDEM_CATEGORIAS.filter((g) => gruposDoResultado(dados).includes(g));
  return {
    votos: grupos.map((grupo) => {
      const votos = dados.placares[grupo].find((p) => p.candidatoId === candidatoId)?.votos ?? 0;
      const total = dados.totais[grupo];
      return { grupo, votos, percentual: total > 0 ? (votos / total) * 100 : 0 };
    }),
    selos: grupos.filter((g) => dados.categorias.some((c) => c.grupo === g && c.vencedores.some((v) => v.candidatoId === candidatoId))),
  };
}

export function montarFinal(dados: DadosResultado): PropsFinal {
  const casas = casasDaPontuacao(dados.ranking);
  const podio = posicoesDoPodio(dados).map((posicao) => ({
    posicao,
    candidatos: limitar(candidatosDaPosicao(dados, posicao).map((c) => ({ ...c, detalhe: detalheDoCandidato(dados, c.candidatoId) }))),
  }));
  const noPodio = new Set(podio.flatMap((p) => p.candidatos.itens.map((c) => c.candidatoId)));
  const categorias = ORDEM_CATEGORIAS.flatMap((g) => {
    const c = dados.categorias.find((x) => x.grupo === g);
    return c && c.vencedores.length > 0 ? [{ grupo: g, vencedores: c.vencedores }] : [];
  });
  return {
    podio,
    categorias,
    destaques: categorias.flatMap((c) => c.vencedores.filter((v) => !noPodio.has(v.candidatoId)).map((v) => ({ grupo: c.grupo, candidatoId: v.candidatoId }))),
    casas,
    vazio: dados.ranking.length === 0,
  };
}

export function montarProps(dados: DadosResultado, cena: Cena, passo: number): PropsCena {
  const casas = casasDaPontuacao(dados.ranking);
  switch (cena.tipo) {
    case "CATEGORIA": {
      const c = dados.categorias.find((x) => x.grupo === cena.grupo);
      return { tipo: "CATEGORIA", grupo: cena.grupo, vencedores: c?.vencedores ?? [], desempatadoPorPontuacao: c?.desempatadoPorPontuacao ?? false, passo };
    }
    case "DESEMPATE": {
      const e = dados.empates[cena.empateIndex];
      const grupo: Grupo = e.criterioAplicado === "JURI" ? "JURI" : "POPULAR";
      const votos = (id: string) => dados.placares[grupo].find((p) => p.candidatoId === id)?.votos ?? 0;
      const posicao = (id: string) => dados.ranking.find((r) => r.candidatoId === id)?.posicao ?? 0;
      return {
        tipo: "DESEMPATE",
        candidatos: limitar(e.candidatoIds.map((id) => ({ candidatoId: id, votos: votos(id), posicao: posicao(id) }))),
        criterio: e.criterioAplicado,
        criterioConfigurado: dados.criterioDesempate,
        resolvido: e.resolvido,
        vencedorId: e.vencedorId ?? null,
        passo,
      };
    }
    case "PODIO": {
      const lista = candidatosDaPosicao(dados, cena.posicao);
      // A revelação vai do 3º ao 1º: só as posições iguais ou piores que a da cena já têm nome no DOM.
      const degraus = posicoesDoPodio(dados).map((p) => ({ posicao: p, candidatos: p >= cena.posicao ? limitar(candidatosDaPosicao(dados, p)) : null }));
      return { tipo: "PODIO", posicao: cena.posicao, candidatos: limitar(lista), compartilhada: lista.length > 1, casas, passo, degraus };
    }
    case "CLASSIFICACAO": {
      const inicio = passo * LINHAS_CLASSIFICACAO;
      return {
        tipo: "CLASSIFICACAO",
        linhas: dados.ranking.slice(inicio, inicio + LINHAS_CLASSIFICACAO).map((r) => ({ candidatoId: r.candidatoId, posicao: r.posicao, pontuacao: r.pontuacao })),
        pagina: passo,
        paginas: cena.paginas,
        casas,
      };
    }
    case "FINAL":
      return { tipo: "FINAL", ...montarFinal(dados) };
    default:
      return { tipo: "OUTRA" };
  }
}

/** Critério efetivo do resultado (para a nota "Módulo do júri desligado"). */
export function criterioDoResultado(dados: DadosResultado): RegraDesempate {
  return criterioEfetivo(dados.criterioDesempate, gruposDoResultado(dados));
}
