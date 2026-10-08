import { GRUPOS } from "./placar";
import type { DadosResultado, Grupo, RegraDesempate } from "./tipos";

// Etapa 7 (D1 a D3, seção 5.2): apuração pura, sem relógio e sem store. Esta etapa é a dona da fórmula;
// a Etapa 8 só consome o DadosResultado congelado.

export type EntradaApuracao = {
  /** Todos os publicados do evento (inclusive desqualificados). */
  candidatos: { id: string; ordem: number; desqualificado: boolean }[];
  /** Votos brutos por candidato. */
  votos: Record<Grupo, Record<string, number>>;
  /** Inteiros; 0 para módulo desligado. */
  pesos: Record<Grupo, number>;
  /** POPULAR sempre; JURI e INFANTIL conforme o módulo. */
  gruposAtivos: Grupo[];
  criterio: RegraDesempate;
};

/** Tolerância de 6 casas (evita separar empatados por erro de ponto flutuante). */
export function arredondar6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function zeros(): Record<Grupo, number> {
  return { POPULAR: 0, JURI: 0, INFANTIL: 0 };
}

/** Critério efetivo (D3): JURI com o júri desligado vira PUBLICO. */
export function criterioEfetivo(criterio: RegraDesempate, gruposAtivos: readonly Grupo[]): RegraDesempate {
  return criterio === "JURI" && !gruposAtivos.includes("JURI") ? "PUBLICO" : criterio;
}

function grupoDoCriterio(criterio: RegraDesempate): Grupo {
  return criterio === "JURI" ? "JURI" : "POPULAR";
}

/** Base de normalização: votos dos candidatos que disputam (D2). */
export function basesPorGrupo(
  votos: Record<Grupo, Record<string, number>>,
  naDisputa: readonly string[],
  gruposAtivos: readonly Grupo[],
): Record<Grupo, number> {
  const base = zeros();
  for (const g of gruposAtivos) for (const id of naDisputa) base[g] += votos[g][id] ?? 0;
  return base;
}

/** Pesos efetivos (rev. 3, C3): o peso dos grupos ativos com base 0 é redistribuído entre os demais. */
export function calcularPesosEfetivos(
  pesos: Record<Grupo, number>,
  base: Record<Grupo, number>,
  gruposAtivos: readonly Grupo[],
): Record<Grupo, number> {
  const comBase = gruposAtivos.filter((g) => base[g] > 0);
  const efetivos = zeros();
  if (comBase.length === gruposAtivos.length) {
    for (const g of gruposAtivos) efetivos[g] = pesos[g];
    return efetivos;
  }
  const soma = comBase.reduce((s, g) => s + pesos[g], 0);
  if (soma <= 0) return efetivos;
  for (const g of comBase) efetivos[g] = (pesos[g] * 100) / soma;
  return efetivos;
}

export function apurar(entrada: EntradaApuracao): DadosResultado {
  const ativos = GRUPOS.filter((g) => entrada.gruposAtivos.includes(g));
  const porOrdem = [...entrada.candidatos].sort((a, b) => a.ordem - b.ordem);
  const ordemDe = new Map(porOrdem.map((c) => [c.id, c.ordem]));
  const naDisputa = porOrdem.filter((c) => !c.desqualificado).map((c) => c.id);
  const desqualificados = porOrdem.filter((c) => c.desqualificado).map((c) => c.id);
  const votosDe = (g: Grupo, id: string) => entrada.votos[g][id] ?? 0;

  // 1. Placares brutos (todos os publicados) e totais.
  const totais = zeros();
  const placares: DadosResultado["placares"] = { POPULAR: [], JURI: [], INFANTIL: [] };
  for (const g of ativos) {
    placares[g] = porOrdem
      .map((c) => ({ candidatoId: c.id, votos: votosDe(g, c.id) }))
      .sort((a, b) => b.votos - a.votos || ordemDe.get(a.candidatoId)! - ordemDe.get(b.candidatoId)!);
    totais[g] = placares[g].reduce((s, p) => s + p.votos, 0);
  }

  // 2 e 3. Base sem desqualificados e pesos efetivos.
  const base = basesPorGrupo(entrada.votos, naDisputa, ativos);
  const pesosEfetivos = calcularPesosEfetivos(entrada.pesos, base, ativos);

  // 4. Pontuação (6 casas).
  const pontuados = naDisputa.map((id) => {
    const pontosPorGrupo = zeros();
    for (const g of ativos) {
      pontosPorGrupo[g] = base[g] > 0 ? arredondar6((pesosEfetivos[g] * votosDe(g, id)) / base[g]) : 0;
    }
    const pontuacao = arredondar6(ativos.reduce((s, g) => s + pontosPorGrupo[g], 0));
    return { candidatoId: id, pontuacao, pontosPorGrupo };
  });

  // 5 e 6. Ranking com posição compartilhada (1, 1, 3) e desempate pelo critério efetivo.
  const efetivo = criterioEfetivo(entrada.criterio, ativos);
  const grupoCriterio = grupoDoCriterio(efetivo);
  pontuados.sort((a, b) => b.pontuacao - a.pontuacao || ordemDe.get(a.candidatoId)! - ordemDe.get(b.candidatoId)!);

  const ranking: DadosResultado["ranking"] = [];
  const empates: DadosResultado["empates"] = [];
  for (let i = 0; i < pontuados.length; ) {
    let fim = i + 1;
    while (fim < pontuados.length && pontuados[fim].pontuacao === pontuados[i].pontuacao) fim++;
    const trecho = pontuados.slice(i, fim);
    const inicio = i + 1;
    if (trecho.length === 1) {
      ranking.push({ ...trecho[0], posicao: inicio });
    } else {
      const ordenado = [...trecho].sort(
        (a, b) =>
          votosDe(grupoCriterio, b.candidatoId) - votosDe(grupoCriterio, a.candidatoId) ||
          ordemDe.get(a.candidatoId)! - ordemDe.get(b.candidatoId)!,
      );
      let posicaoAtual = inicio;
      let distintas = true;
      ordenado.forEach((c, k) => {
        if (k > 0 && votosDe(grupoCriterio, c.candidatoId) === votosDe(grupoCriterio, ordenado[k - 1].candidatoId)) distintas = false;
        else posicaoAtual = inicio + k;
        ranking.push({ ...c, posicao: posicaoAtual });
      });
      const primeiro = votosDe(grupoCriterio, ordenado[0].candidatoId);
      const isolado = ordenado.length > 1 && votosDe(grupoCriterio, ordenado[1].candidatoId) < primeiro;
      empates.push({
        posicoes: trecho.map((_, k) => inicio + k),
        candidatoIds: ordenado.map((c) => c.candidatoId),
        criterioAplicado: efetivo,
        resolvido: distintas,
        ...(isolado ? { vencedorId: ordenado[0].candidatoId } : {}),
      });
    }
    i = fim;
  }
  // Em posição compartilhada, ordem estável por `ordem` do candidato (D3).
  ranking.sort((a, b) => a.posicao - b.posicao || ordemDe.get(a.candidatoId)! - ordemDe.get(b.candidatoId)!);

  // 7. Categorias: mais votos brutos entre os que disputam; empate pela pontuação final; senão co-vencedores.
  const pontuacaoDe = new Map(pontuados.map((p) => [p.candidatoId, p.pontuacao]));
  const categorias: DadosResultado["categorias"] = ativos.map((g) => {
    const maximo = Math.max(0, ...naDisputa.map((id) => votosDe(g, id)));
    if (maximo === 0) return { grupo: g, vencedores: [], desempatadoPorPontuacao: false };
    const empatados = naDisputa.filter((id) => votosDe(g, id) === maximo);
    let vencedores = empatados;
    if (empatados.length > 1) {
      const melhor = Math.max(...empatados.map((id) => pontuacaoDe.get(id) ?? 0));
      vencedores = empatados.filter((id) => pontuacaoDe.get(id) === melhor);
    }
    return {
      grupo: g,
      vencedores: vencedores.map((id) => ({ candidatoId: id, votos: maximo })),
      desempatadoPorPontuacao: empatados.length > 1 && vencedores.length === 1,
    };
  });

  return {
    criterioDesempate: entrada.criterio,
    totais,
    placares,
    ranking,
    desqualificados,
    pesosEfetivos,
    categorias,
    empates,
  };
}
