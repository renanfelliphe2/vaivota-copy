import type { CelulaCsv } from "@/lib/csv";
import { ROTULO_ESTADO_EVENTO, ROTULO_ESTADO_URNA } from "@/lib/rotulos";
import type { ResultadoVisao, VotosJuriVisao, OperacaoDados } from "./painel";
import { gruposDoResultado } from "./resultado";
import { totalDoPonto, type SerieVotos } from "./serie";
import type { FaseConfig } from "./travas";
import type { Evento, Grupo, RegraDesempate } from "./tipos";

// Etapa 7 (D16, seção 5.10): disponibilidade por fase e montagem das linhas dos seis CSV.
// Números com vírgula decimal e sem milhar; datas ISO 8601 com offset; colunas de módulo desligado omitidas.

export type ArquivoExportacao =
  | "resumo_evento"
  | "resultado_candidatos"
  | "votos_por_minuto"
  | "jurados"
  | "dispositivos"
  | "auditoria";

export const ARQUIVOS_EXPORTACAO: { id: ArquivoExportacao; titulo: string; descricao: string; tipo: "OPERACAO" | "RESULTADO" }[] = [
  { id: "resumo_evento", titulo: "Resumo do evento", descricao: "Janela, pesos, critério, totais e participantes.", tipo: "RESULTADO" },
  { id: "resultado_candidatos", titulo: "Classificação", descricao: "Posição, votos e pontos por grupo de cada item.", tipo: "RESULTADO" },
  { id: "jurados", titulo: "Votos do júri", descricao: "Votos identificados e histórico de alterações.", tipo: "RESULTADO" },
  { id: "votos_por_minuto", titulo: "Votos no tempo", descricao: "Série de votos por intervalo e por grupo.", tipo: "OPERACAO" },
  { id: "dispositivos", titulo: "Totens", descricao: "Estado, último uso e votos de cada totem.", tipo: "OPERACAO" },
  { id: "auditoria", titulo: "Auditoria", descricao: "Registro das ações, sem dados de voto.", tipo: "OPERACAO" },
];

export type DisponibilidadeArquivo = { id: ArquivoExportacao; disponivel: boolean; motivo: string | null };

export const MOTIVO_SEM_RESULTADO = "O resultado oficial ainda não foi calculado";

/** Arquivos que existem para os módulos ligados, com a disponibilidade na fase (5.1; C11: auditoria sempre). */
export function arquivosDisponiveis(
  fase: FaseConfig,
  resultadoDisponivel: boolean,
  modulos: { juri: boolean; infantil: boolean },
): DisponibilidadeArquivo[] {
  const encerrada = fase === "URNA_ENCERRADA" || fase === "CONCLUIDO";
  return ARQUIVOS_EXPORTACAO.filter((a) => (a.id === "jurados" ? modulos.juri : a.id === "dispositivos" ? modulos.infantil : true)).map(
    (a) => {
      if (a.id === "auditoria") return { id: a.id, disponivel: true, motivo: null };
      if (a.tipo === "OPERACAO")
        return fase === "RASCUNHO"
          ? { id: a.id, disponivel: false, motivo: "Disponível depois de ativar o evento" }
          : { id: a.id, disponivel: true, motivo: null };
      if (!encerrada)
        return {
          id: a.id,
          disponivel: false,
          motivo: fase === "RASCUNHO" ? "Disponível depois de ativar o evento" : "Disponível depois do encerramento",
        };
      if (!resultadoDisponivel) return { id: a.id, disponivel: false, motivo: MOTIVO_SEM_RESULTADO };
      return { id: a.id, disponivel: true, motivo: null };
    },
  );
}

const PADRAO_EMAIL = /[^\s@;,"'<>()[\]]+@[^\s@;,"'<>()[\]]+\.[^\s@;,"'<>()[\]]+/g;

/** Rede de proteção contra e-mail digitado (rótulos, motivos). */
export function redigirEmails(texto: string): string {
  return texto.replace(PADRAO_EMAIL, "[e-mail omitido]");
}

/** Aplica `redigirEmails` em todas as células de texto. */
export function redigirLinhas(linhas: readonly (readonly CelulaCsv[])[]): CelulaCsv[][] {
  return linhas.map((linha) => linha.map((c) => (typeof c === "string" ? redigirEmails(c) : c)));
}

/** Vírgula decimal, sem separador de milhar. */
export function numeroCsv(n: number, casas = 2): string {
  return n.toFixed(casas).replace(".", ",");
}

export function nomeArquivoCsv(slug: string, arquivo: ArquivoExportacao, dataIso: string): string {
  return `${slug}-${arquivo}-${dataIso.slice(0, 10).replace(/-/g, "")}.csv`;
}

const COLUNA_GRUPO: Record<Grupo, string> = { POPULAR: "popular", JURI: "juri", INFANTIL: "infantil" };
const ROTULO_CRITERIO: Record<RegraDesempate, string> = { JURI: "Júri", PUBLICO: "Público" };
const ROTULO_MOTIVO = { ENCERRAMENTO: "Encerramento", DESQUALIFICACAO: "Desqualificação", CORRECAO: "Correção" } as const;

export type Planilha = { cabecalho: string[]; linhas: CelulaCsv[][] };

export function planilhaResumoEvento(
  evento: Pick<Evento, "nome" | "slug" | "estado" | "estadoUrna" | "janelaInicio" | "janelaFim" | "urnaAbertaEm" | "urnaEncerradaEm">,
  r: ResultadoVisao,
): Planilha {
  const grupos = gruposDoResultado(r.dados);
  const linhas: CelulaCsv[][] = [
    ["evento", evento.nome],
    ["slug", evento.slug],
    ["estado_evento", ROTULO_ESTADO_EVENTO[evento.estado]],
    ["estado_urna", ROTULO_ESTADO_URNA[evento.estadoUrna]],
    ["janela_inicio", evento.janelaInicio],
    ["janela_fim", evento.janelaFim],
    ["urna_aberta_em", evento.urnaAbertaEm],
    ["urna_encerrada_em", evento.urnaEncerradaEm],
    ["versao_resultado", r.versao],
    ["motivo_resultado", ROTULO_MOTIVO[r.motivo]],
    ["calculado_em", r.calculadoEm],
    ...grupos.map((g): CelulaCsv[] => [`peso_${COLUNA_GRUPO[g]}`, r.pesos[g]]),
    ["criterio_desempate", ROTULO_CRITERIO[r.dados.criterioDesempate]],
    ...grupos.map((g): CelulaCsv[] => [`total_${COLUNA_GRUPO[g]}`, r.dados.totais[g]]),
    ["publico_cadastrados", r.participantes.publico.cadastrados],
    ["publico_votaram", r.participantes.publico.votaram],
    ...(grupos.includes("JURI")
      ? [
          ["jurados_cadastrados", r.participantes.jurado.cadastrados],
          ["jurados_votaram", r.participantes.jurado.votaram],
        ]
      : []),
    ["candidatos_na_disputa", r.evento.candidatosNaDisputa],
  ];
  return { cabecalho: ["campo", "valor"], linhas };
}

/** "Nao", "Resolvido" ou "Compartilhado" (D16). */
export function situacaoDeEmpate(r: Pick<ResultadoVisao, "dados">, candidatoId: string): "Nao" | "Resolvido" | "Compartilhado" {
  const item = r.dados.ranking.find((i) => i.candidatoId === candidatoId);
  if (!item) return "Nao";
  if (r.dados.ranking.some((o) => o.candidatoId !== candidatoId && o.posicao === item.posicao)) return "Compartilhado";
  return r.dados.empates.some((e) => e.candidatoIds.includes(candidatoId)) ? "Resolvido" : "Nao";
}

export function planilhaResultadoCandidatos(r: ResultadoVisao, titulo: (id: string) => string): Planilha {
  const grupos = gruposDoResultado(r.dados);
  const votos = (g: Grupo, id: string) => r.dados.placares[g].find((p) => p.candidatoId === id)?.votos ?? 0;
  const cabecalho = [
    "posicao",
    "candidato",
    "situacao",
    ...grupos.map((g) => `votos_${COLUNA_GRUPO[g]}`),
    ...grupos.map((g) => `pontos_${COLUNA_GRUPO[g]}`),
    "pontuacao_final",
    "empate",
  ];
  const linhas: CelulaCsv[][] = r.dados.ranking.map((item) => [
    item.posicao,
    titulo(item.candidatoId),
    "Na disputa",
    ...grupos.map((g) => votos(g, item.candidatoId)),
    ...grupos.map((g) => numeroCsv(item.pontosPorGrupo[g])),
    numeroCsv(item.pontuacao),
    situacaoDeEmpate(r, item.candidatoId),
  ]);
  for (const id of r.dados.desqualificados) {
    linhas.push([null, titulo(id), "Fora da disputa", ...grupos.map((g) => votos(g, id)), ...grupos.map(() => null), null, null]);
  }
  return { cabecalho, linhas };
}

export function planilhaVotosPorMinuto(serie: SerieVotos, modulos: { juri: boolean; infantil: boolean }): Planilha {
  const cabecalho = ["intervalo_inicio", "passo_minutos", "popular", ...(modulos.juri ? ["juri"] : []), ...(modulos.infantil ? ["infantil"] : []), "total"];
  const linhas = serie.pontos.map((p): CelulaCsv[] => [
    p.inicio,
    serie.passoMinutos,
    p.popular,
    ...(modulos.juri ? [p.juri] : []),
    ...(modulos.infantil ? [p.infantil] : []),
    totalDoPonto(p),
  ]);
  return { cabecalho, linhas };
}

/**
 * Uma linha por entrada de histórico; pendente sem as últimas quatro colunas. Sem e-mail. Júri por critério
 * (08/10/2026): uma linha por nota (jurado, candidato, critério) ou por escolha (jurado, critério).
 */
export function planilhaJurados(v: VotosJuriVisao, titulo: (id: string) => string): Planilha {
  if (v.modo === "NOTAS_POR_CRITERIO") {
    const linhas: CelulaCsv[][] = [];
    for (const j of v.jurados) {
      const candidatos = Object.keys(j.notas);
      if (candidatos.length === 0) linhas.push([j.nome, j.rotulo, "Pendente", null, null, null]);
      for (const candidatoId of candidatos)
        for (const c of v.criterios)
          if (j.notas[candidatoId][c.id] !== undefined) linhas.push([j.nome, j.rotulo, "Avaliou", titulo(candidatoId), c.nome, j.notas[candidatoId][c.id]]);
    }
    return { cabecalho: ["jurado", "rotulo", "situacao", "candidato", "criterio", "nota"], linhas };
  }
  if (v.modo === "MELHOR_POR_CRITERIO") {
    const linhas: CelulaCsv[][] = [];
    for (const j of v.jurados) {
      const escolhidos = v.criterios.filter((c) => j.escolhas[c.id]);
      if (escolhidos.length === 0) linhas.push([j.nome, j.rotulo, "Pendente", null, null]);
      for (const c of escolhidos) linhas.push([j.nome, j.rotulo, "Escolheu", c.nome, titulo(j.escolhas[c.id])]);
    }
    return { cabecalho: ["jurado", "rotulo", "situacao", "criterio", "candidato"], linhas };
  }
  const cabecalho = ["jurado", "rotulo", "situacao", "registro", "candidato_anterior", "candidato", "registrado_em"];
  const linhas: CelulaCsv[][] = [];
  for (const j of v.jurados) {
    if (!j.votou || j.historico.length === 0) {
      linhas.push([j.nome, j.rotulo, "Pendente", null, null, null, null]);
      continue;
    }
    j.historico.forEach((h, i) =>
      linhas.push([
        j.nome,
        j.rotulo,
        "Votou",
        i === 0 ? "Registro" : "Alteração",
        h.candidatoAnteriorId ? titulo(h.candidatoAnteriorId) : null,
        titulo(h.candidatoId),
        h.em,
      ]),
    );
  }
  return { cabecalho, linhas };
}

const ROTULO_TOTEM = { ATIVO: "Ativo", PAUSADO: "Pausado", REVOGADO: "Revogado" } as const;

export function planilhaDispositivos(totens: OperacaoDados["totens"]): Planilha {
  return {
    cabecalho: ["dispositivo", "estado", "ultimo_uso", "votos"],
    linhas: totens.map((t) => [t.nome, ROTULO_TOTEM[t.estado], t.ultimoUso, t.votos]),
  };
}

export type LinhaAuditoriaCsv = { criadoEm: string; acao: string; entidade: string | null; descricao: string; ator: string; motivo: string | null };

/** `ipHash` e `detalhes` crus nunca saem. */
export function planilhaAuditoria(itens: readonly LinhaAuditoriaCsv[]): Planilha {
  return {
    cabecalho: ["registrado_em", "acao", "entidade", "descricao", "ator", "motivo"],
    linhas: itens.map((i) => [i.criadoEm, i.acao, i.entidade, i.descricao, i.ator, i.motivo]),
  };
}

