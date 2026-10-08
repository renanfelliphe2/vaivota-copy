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
  | { tipo: "PODIO"; posicao: number; candidatos: ListaLimitada<{ candidatoId: string; pontuacao: number }>; compartilhada: boolean; casas: 2 | 4; passo: number }
  | { tipo: "CLASSIFICACAO"; linhas: { candidatoId: string; posicao: number; pontuacao: number }[]; pagina: number; paginas: number; casas: 2 | 4 }
  | { tipo: "FINAL" } & PropsFinal
  | { tipo: "OUTRA" };

export type PropsFinal = {
  podio: { posicao: number; candidatos: ListaLimitada<{ candidatoId: string; pontuacao: number }> }[];
  categorias: { grupo: Grupo; vencedores: { candidatoId: string; votos: number }[] }[];
  casas: 2 | 4;
  vazio: boolean;
};

function candidatosDaPosicao(dados: DadosResultado, posicao: number) {
  return dados.ranking.filter((r) => r.posicao === posicao).map((r) => ({ candidatoId: r.candidatoId, pontuacao: r.pontuacao }));
}

export function montarFinal(dados: DadosResultado): PropsFinal {
  const casas = casasDaPontuacao(dados.ranking);
  const posicoes = [...new Set(dados.ranking.map((r) => r.posicao))].filter((p) => p <= 3).sort((a, b) => a - b);
  return {
    podio: posicoes.map((posicao) => ({ posicao, candidatos: limitar(candidatosDaPosicao(dados, posicao)) })),
    categorias: ORDEM_CATEGORIAS.flatMap((g) => {
      const c = dados.categorias.find((x) => x.grupo === g);
      return c && c.vencedores.length > 0 ? [{ grupo: g, vencedores: c.vencedores }] : [];
    }),
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
      return { tipo: "PODIO", posicao: cena.posicao, candidatos: limitar(lista), compartilhada: lista.length > 1, casas, passo };
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
