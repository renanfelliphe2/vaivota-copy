import { paraInstante } from "@/lib/tempo";
import { obterAmbiente } from "@/store/ambiente";
import { apurar, basesPorGrupo, criterioEfetivo } from "./apuracao";
import { contarVotos } from "./contagens";
import type { DadosResultado, EstadoApp, Grupo, Instante, MotivoResultado, RegraDesempate, ResultadoOficial } from "./tipos";

// Etapa 7 (D1, D4, D19): congela o resultado oficial como nova versão. Só dois gatilhos chamam:
// transicoes.encerrarUrna (versão 1, ENCERRAMENTO) e a desqualificação da Etapa 6 (DESQUALIFICACAO).
// A leitura nunca recalcula: telas, CSV, relatório e telão leem a maior versão.

/** Grupo ativo é o que tem categoria. */
export function gruposDoResultado(dados: DadosResultado): Grupo[] {
  return dados.categorias.map((c) => c.grupo);
}

/** Maior versão do evento (ou undefined). */
export function resultadoAtual(resultados: readonly ResultadoOficial[], eventoId: string): ResultadoOficial | undefined {
  let maior: ResultadoOficial | undefined;
  for (const r of resultados) if (r.eventoId === eventoId && (!maior || r.versao > maior.versao)) maior = r;
  return maior;
}

/**
 * Pura: acrescenta um ResultadoOficial com versao = maior + 1. Não audita (quem chamou já audita).
 * Sem `calculadoEm`, usa o relógio simulado.
 */
export function congelarResultado(
  estado: EstadoApp,
  eventoId: string,
  motivo: MotivoResultado,
  opcoes?: { calculadoPorId?: string | null; calculadoEm?: Instante },
): EstadoApp {
  const { banco } = estado;
  const evento = banco.eventos.find((e) => e.id === eventoId);
  const placar = banco.configsPlacar.find((c) => c.eventoId === eventoId);
  if (!evento || !placar) return estado;

  const gruposAtivos: Grupo[] = ["POPULAR"];
  if (evento.moduloJuri) gruposAtivos.push("JURI");
  if (evento.moduloInfantil) gruposAtivos.push("INFANTIL");
  const pesos = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
  const dados = apurar({
    candidatos: banco.candidatos
      .filter((c) => c.eventoId === eventoId && c.publicado)
      .map((c) => ({ id: c.id, ordem: c.ordem, desqualificado: c.desqualificado })),
    votos: contarVotos(banco, eventoId),
    pesos,
    gruposAtivos,
    criterio: placar.regraDesempate,
  });

  const versao = (resultadoAtual(banco.resultados, eventoId)?.versao ?? 0) + 1;
  const calculadoEm = opcoes?.calculadoEm ?? paraInstante(obterAmbiente().relogio.getAgora(), evento.fusoHorario);
  const resultado: ResultadoOficial = {
    id: `res-${eventoId}-v${versao}`,
    eventoId,
    versao,
    motivo,
    pesoPopular: pesos.POPULAR,
    pesoJuri: pesos.JURI,
    pesoInfantil: pesos.INFANTIL,
    dados,
    calculadoPorId: opcoes?.calculadoPorId ?? null,
    calculadoEm,
  };
  return { ...estado, banco: { ...banco, resultados: [...banco.resultados, resultado] } };
}

export type ResumoApuracao = {
  /** Ativos com base 0 (peso redistribuído, C3). */
  gruposSemBase: Grupo[];
  /** Soma dos pesos configurados desses grupos. */
  pesoRedistribuido: number;
  /** = dados.desqualificados (D16; não recalcula). */
  foraDaDisputa: string[];
  /** O critério aplicado de fato. */
  criterioEfetivo: RegraDesempate;
};

/** Derivados para a tela (avisos de apuração). */
export function resumirApuracao(dados: DadosResultado, pesos: Record<Grupo, number>): ResumoApuracao {
  const ativos = gruposDoResultado(dados);
  const fora = new Set(dados.desqualificados);
  const naDisputa = dados.placares.POPULAR.map((p) => p.candidatoId).filter((id) => !fora.has(id));
  const votos: Record<Grupo, Record<string, number>> = { POPULAR: {}, JURI: {}, INFANTIL: {} };
  for (const g of ativos) for (const p of dados.placares[g]) votos[g][p.candidatoId] = p.votos;
  const base = basesPorGrupo(votos, naDisputa, ativos);
  const gruposSemBase = ativos.filter((g) => base[g] === 0);
  return {
    gruposSemBase,
    pesoRedistribuido: gruposSemBase.reduce((s, g) => s + pesos[g], 0),
    foraDaDisputa: [...dados.desqualificados],
    criterioEfetivo: criterioEfetivo(dados.criterioDesempate, ativos),
  };
}

/**
 * Casas da pontuação na tela (seção 5.2): duas; quatro se dois candidatos com posições diferentes
 * ficarem com a mesma exibição em duas casas (a Etapa 8 usa a mesma regra).
 */
export function casasDaPontuacao(ranking: readonly { pontuacao: number; posicao: number }[]): 2 | 4 {
  const vistos = new Map<string, number>();
  for (const item of ranking) {
    const chave = item.pontuacao.toFixed(2);
    const posicao = vistos.get(chave);
    if (posicao !== undefined && posicao !== item.posicao) return 4;
    vistos.set(chave, item.posicao);
  }
  return 2;
}
