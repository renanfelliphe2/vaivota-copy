import { apurar } from "../apuracao";
import type { ConfigApresentacao, Grupo, Instante, RegraDesempate } from "../tipos";
import { assinaturaDoResultado } from "./assinatura";
import { cenariosDoEnsaio, gruposLigados, type ModulosEvento } from "./cenariosEnsaio";
import type { CandidatoPalco, DadosEnsaio } from "./tipos";

// Ensaio da cerimônia: um resultado INVENTADO, montado em cima dos itens e dos módulos do evento e apurado pela mesma `apurar` do
// resultado oficial. Nada aqui lê voto real nem escreve no banco. Os votos são desenhados para os empates saírem exatos:
//  - só os 3 primeiros itens (A, B, C) disputam; a cauda recebe poucos votos, iguais em todos os grupos;
//  - em cada grupo ligado A + B + C somam 60 votos e a cauda soma o mesmo em todos, então a base de normalização é igual nos grupos;
//  - os pesos do ensaio são fixos (100 / 50-50 / 40-30-30), por isso a pontuação de dois itens empata de verdade.
// Todos os votos saem multiplicados por ESCALA, só para os totais do "ao vivo" parecerem de um evento (a proporção não muda).

export const MINIMO_ITENS_ENSAIO = 3;
const ESCALA = 3;
const VOTOS_DA_CAUDA = 5;
/** Forma da curva do "ao vivo" simulado (soma 100): sobe, estabiliza e cai no fim. */
const CURVA = [4, 7, 10, 14, 16, 14, 11, 9, 7, 4, 3, 1];

type Trio = readonly [a: number, b: number, c: number];
type Tabela = Partial<Record<Grupo, Trio>>;

const IGUAIS: Trio = [25, 25, 10];

/** Votos de A, B e C por grupo. `outro` é o segundo grupo ligado (JURI ou INFANTIL) quando só há dois. */
function tabelaDoCenario(cenarioId: string, modulos: ModulosEvento): Tabela | null {
  const tres = modulos.juri && modulos.infantil;
  const dois = modulos.juri !== modulos.infantil;
  const outro: Grupo = modulos.juri ? "JURI" : "INFANTIL";
  switch (cenarioId) {
    case "SEM_EMPATE":
      if (tres) return { POPULAR: [30, 20, 10], JURI: [10, 30, 20], INFANTIL: [20, 10, 30] };
      if (dois) return { POPULAR: [30, 20, 10], [outro]: [10, 30, 20] };
      return { POPULAR: [30, 20, 10] };
    case "EMPATE_RESOLVIDO":
      // O critério efetivo é o júri (quando ligado) ou o público: o grupo do critério separa B de C, o outro compensa.
      if (tres) return { POPULAR: [40, 10, 10], JURI: [30, 20, 10], INFANTIL: [30, 10, 20] };
      if (dois) return outro === "JURI" ? { POPULAR: [30, 10, 20], JURI: [30, 20, 10] } : { POPULAR: [30, 20, 10], INFANTIL: [30, 10, 20] };
      return null;
    case "EMPATE_PERSISTENTE":
      return Object.fromEntries(gruposDe(modulos).map((g) => [g, IGUAIS]));
    case "CO_VENCEDORES":
      if (tres) return { POPULAR: [40, 10, 10], JURI: [10, 25, 25], INFANTIL: [40, 10, 10] };
      if (dois) return { POPULAR: [40, 10, 10], [outro]: [10, 25, 25] };
      return { POPULAR: [30, 15, 15] };
    default:
      return null;
  }
}

function gruposDe(modulos: ModulosEvento): Grupo[] {
  return ["POPULAR", ...(modulos.juri ? (["JURI"] as const) : []), ...(modulos.infantil ? (["INFANTIL"] as const) : [])];
}

function pesosDoEnsaio(modulos: ModulosEvento): Record<Grupo, number> {
  const grupos = gruposLigados(modulos);
  if (grupos === 3) return { POPULAR: 40, JURI: 30, INFANTIL: 30 };
  if (grupos === 2) return { POPULAR: 50, JURI: modulos.juri ? 50 : 0, INFANTIL: modulos.infantil ? 50 : 0 };
  return { POPULAR: 100, JURI: 0, INFANTIL: 0 };
}

/** O desempate do ensaio: o júri quando ligado, senão o público (o mesmo que `criterioEfetivo` faria). */
function criterioDoEnsaio(modulos: ModulosEvento): RegraDesempate {
  return modulos.juri ? "JURI" : "PUBLICO";
}

/** Reparte `total` em partes inteiras proporcionais a `partes` (maior resto), sem perder nem criar votos. */
function repartir(total: number, partes: readonly number[]): number[] {
  const soma = partes.reduce((s, n) => s + n, 0);
  const brutos = partes.map((p) => (total * p) / soma);
  const inteiros = brutos.map(Math.floor);
  let faltam = total - inteiros.reduce((s, n) => s + n, 0);
  const porResto = brutos.map((b, i) => ({ i, resto: b - Math.floor(b) })).sort((x, y) => y.resto - x.resto || x.i - y.i);
  for (const { i } of porResto) {
    if (faltam <= 0) break;
    inteiros[i] += 1;
    faltam -= 1;
  }
  return inteiros;
}

export type EntradaEnsaio = {
  cenarioId: string;
  /** Itens votáveis do evento (publicados e não desqualificados), com título e cartaz. */
  candidatos: readonly CandidatoPalco[];
  modulos: ModulosEvento;
  config: ConfigApresentacao;
  calculadoEm: Instante;
};

/** null: o cenário não existe para este evento ou há menos de `MINIMO_ITENS_ENSAIO` itens. */
export function montarDadosEnsaio(entrada: EntradaEnsaio): DadosEnsaio | null {
  if (!cenariosDoEnsaio(entrada.modulos).includes(entrada.cenarioId)) return null;
  const candidatos = [...entrada.candidatos].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
  if (candidatos.length < MINIMO_ITENS_ENSAIO) return null;
  const tabela = tabelaDoCenario(entrada.cenarioId, entrada.modulos);
  if (!tabela) return null;

  const grupos = gruposDe(entrada.modulos);
  const votos: Record<Grupo, Record<string, number>> = { POPULAR: {}, JURI: {}, INFANTIL: {} };
  for (const g of grupos) {
    const trio = tabela[g];
    if (!trio) return null;
    candidatos.forEach((c, i) => {
      votos[g][c.id] = (i < 3 ? trio[i] : Math.max(1, VOTOS_DA_CAUDA - (i - 3))) * ESCALA;
    });
  }

  const pesos = pesosDoEnsaio(entrada.modulos);
  const dados = apurar({
    candidatos: candidatos.map((c) => ({ id: c.id, ordem: c.ordem, desqualificado: false })),
    votos,
    pesos,
    gruposAtivos: grupos,
    criterio: criterioDoEnsaio(entrada.modulos),
  });
  const totalGeral = grupos.reduce((s, g) => s + dados.totais[g], 0);
  const base = { versao: 1, motivo: "ENCERRAMENTO" as const, calculadoEm: entrada.calculadoEm };
  return {
    ...base,
    assinatura: assinaturaDoResultado({ ...base, pesoPopular: pesos.POPULAR, pesoJuri: pesos.JURI, pesoInfantil: pesos.INFANTIL, dados }),
    pesos,
    dados,
    candidatos,
    config: entrada.config,
    modulos: entrada.modulos,
    candidatosNaDisputa: dados.ranking.length,
    totalGeral,
    votosPorMinutoSimulados: repartir(totalGeral, CURVA),
  };
}
