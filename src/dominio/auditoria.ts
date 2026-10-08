import type { AcaoAuditoria, Auditoria, Instante } from "./tipos";

// Etapa 7 (D15, seção 5.9): catálogo de exibição da auditoria de todas as ações das Etapas 0 a 8.
// `descrever` nunca devolve escolha de voto, código de convite, rótulo digitado, nome de jurado nem e-mail.

export type GrupoAuditoria = "ESTADO" | "CONFIGURACAO" | "JURI" | "SEGURANCA" | "EXPORTACAO" | "APRESENTACAO" | "OUTRAS";

export const GRUPOS_AUDITORIA: GrupoAuditoria[] = ["ESTADO", "CONFIGURACAO", "JURI", "SEGURANCA", "EXPORTACAO", "APRESENTACAO", "OUTRAS"];

export const ROTULO_GRUPO_AUDITORIA: Record<GrupoAuditoria, string> = {
  ESTADO: "Estado",
  CONFIGURACAO: "Configuração",
  JURI: "Júri",
  SEGURANCA: "Segurança",
  EXPORTACAO: "Exportação",
  APRESENTACAO: "Apresentação",
  OUTRAS: "Outras",
};

type Detalhes = Record<string, unknown> | null;

type ItemCatalogo = {
  rotulo: string;
  grupo: GrupoAuditoria;
  descrever: (detalhes: Detalhes, entidade: string | null) => string;
};

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.trim() ? valor : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

const ORIGEM_ENCERRAMENTO: Record<string, string> = {
  MANUAL: "manual",
  AUTOMATICO: "automático",
  TOOLBAR: "toolbar",
  FALHA_SIMULADA: "falha simulada",
};

const CAMPO_CONFIG: Record<string, string> = {
  nome: "nome",
  descricao: "descrição",
  slug: "endereço",
  fusoHorario: "fuso horário",
  janelaInicio: "início da janela",
  janelaFim: "fim da janela",
  encerramentoAutomatico: "encerramento automático",
  metodoIdentificacao: "identificação",
  bloquearVotoProprio: "voto próprio",
  moduloJuri: "módulo do júri",
  moduloInfantil: "módulo infantil",
};

function listaDeCampos(detalhes: Detalhes): string | null {
  const campos = detalhes?.campos;
  if (!Array.isArray(campos) || campos.length === 0) return null;
  return campos.map((c) => CAMPO_CONFIG[String(c)] ?? String(c)).join(", ");
}

export const CATALOGO_AUDITORIA: Record<AcaoAuditoria, ItemCatalogo> = {
  EVENTO_ATIVADO: { rotulo: "Evento ativado", grupo: "ESTADO", descrever: () => "Evento ativado" },
  URNA_ABERTA: { rotulo: "Urna aberta", grupo: "ESTADO", descrever: () => "Urna aberta" },
  URNA_ENCERRADA: {
    rotulo: "Urna encerrada",
    grupo: "ESTADO",
    descrever: (d) => {
      const origem = ORIGEM_ENCERRAMENTO[String(d?.origem)];
      return origem ? `Urna encerrada (${origem})` : "Urna encerrada";
    },
  },
  EVENTO_CONCLUIDO: { rotulo: "Evento concluído", grupo: "ESTADO", descrever: () => "Evento concluído" },
  CONFIG_ALTERADA: {
    rotulo: "Configuração alterada",
    grupo: "CONFIGURACAO",
    descrever: (d, entidade) => {
      if (entidade === "config_placar") return "Pesos ou critério de desempate alterados";
      if (entidade === "campo_candidato") return "Campos extras alterados";
      if (d?.janela) return "Janela alterada";
      const campos = listaDeCampos(d);
      return campos ? `Alterado: ${campos}` : "Configuração alterada";
    },
  },
  TEMA_ALTERADO: { rotulo: "Tema alterado", grupo: "CONFIGURACAO", descrever: () => "Tema alterado" },
  CONVITES_GERADOS: {
    rotulo: "Convites gerados",
    grupo: "CONFIGURACAO",
    descrever: (d) => {
      const n = numero(d?.quantidade);
      if (d?.substitutoDe) return "Convite substituto gerado";
      return n === null ? "Convites gerados" : `Convites gerados: ${n}`;
    },
  },
  CONVITE_REVOGADO: { rotulo: "Convite revogado", grupo: "CONFIGURACAO", descrever: () => "Convite revogado" },
  CANDIDATO_DESQUALIFICADO: {
    rotulo: "Tirado da disputa",
    grupo: "CONFIGURACAO",
    descrever: () => "Item tirado da disputa",
  },
  CANDIDATO_CORRIGIDO: { rotulo: "Item corrigido", grupo: "CONFIGURACAO", descrever: () => "Dados de um item corrigidos" },
  CONVITE_RESGATADO: { rotulo: "Convite resgatado", grupo: "JURI", descrever: () => "Convite de jurado resgatado" },
  VOTO_JURI_REGISTRADO: { rotulo: "Voto de jurado", grupo: "JURI", descrever: () => "Voto de jurado registrado" },
  VOTO_JURI_ALTERADO: { rotulo: "Voto de jurado alterado", grupo: "JURI", descrever: () => "Voto de jurado alterado" },
  TENTATIVA_CODIGO_INVALIDA: { rotulo: "Código recusado", grupo: "SEGURANCA", descrever: () => "Código recusado" },
  BLOQUEIO_RATE_LIMIT: {
    rotulo: "Bloqueio por tentativas",
    grupo: "SEGURANCA",
    descrever: (d) =>
      d?.alvo === "CODIGO_LOGIN"
        ? "Código de login bloqueado por excesso de tentativas"
        : "Campo bloqueado por excesso de tentativas",
  },
  EXPORTACAO_CSV: {
    rotulo: "Arquivo exportado",
    grupo: "EXPORTACAO",
    descrever: (d) => {
      const arquivo = texto(d?.arquivo);
      return arquivo ? `Arquivo ${arquivo} baixado` : "Arquivo baixado";
    },
  },
  RELATORIO_GERADO: {
    rotulo: "Relatório gerado",
    grupo: "EXPORTACAO",
    descrever: (d) => {
      const versao = numero(d?.versao);
      return versao === null ? "Relatório gerado" : `Relatório gerado (versão ${versao})`;
    },
  },
  REVELACAO_INICIADA: { rotulo: "Revelação iniciada", grupo: "APRESENTACAO", descrever: () => "Revelação do resultado iniciada" },
  REVELACAO_CONCLUIDA: { rotulo: "Revelação concluída", grupo: "APRESENTACAO", descrever: () => "Revelação do resultado concluída" },
  REVELACAO_REFEITA: { rotulo: "Revelação refeita", grupo: "APRESENTACAO", descrever: () => "Revelação recomeçada do início" },
  EMERGENCIA_ACIONADA: {
    rotulo: "Emergência",
    grupo: "APRESENTACAO",
    descrever: () => "Emergência acionada: final exibido direto",
  },
};

/** Ação desconhecida (de uma etapa futura): o código e "Ação registrada", no grupo OUTRAS. */
export function itemDoCatalogo(acao: string): ItemCatalogo {
  return (
    (CATALOGO_AUDITORIA as Record<string, ItemCatalogo | undefined>)[acao] ?? {
      rotulo: acao,
      grupo: "OUTRAS",
      descrever: () => "Ação registrada",
    }
  );
}

export function grupoDaAcao(acao: string): GrupoAuditoria {
  return itemDoCatalogo(acao).grupo;
}

export function descreverAuditoria(entrada: Pick<Auditoria, "acao" | "detalhes" | "entidade">): string {
  return itemDoCatalogo(entrada.acao).descrever(entrada.detalhes, entrada.entidade);
}

export type ResumoAuditoria = {
  porGrupo: Record<GrupoAuditoria, number>;
  bloqueiosRateLimit: number;
  alteracoesVotoJuri: number;
  ultimaEm: Instante | null;
};

export function resumirAuditoria(entradas: readonly Pick<Auditoria, "acao" | "criadoEm">[]): ResumoAuditoria {
  const porGrupo = Object.fromEntries(GRUPOS_AUDITORIA.map((g) => [g, 0])) as Record<GrupoAuditoria, number>;
  let ultimaEm: Instante | null = null;
  let ultimaMs = -Infinity;
  let bloqueiosRateLimit = 0;
  let alteracoesVotoJuri = 0;
  for (const e of entradas) {
    porGrupo[grupoDaAcao(e.acao)]++;
    if (e.acao === "BLOQUEIO_RATE_LIMIT") bloqueiosRateLimit++;
    if (e.acao === "VOTO_JURI_ALTERADO") alteracoesVotoJuri++;
    const ms = Date.parse(e.criadoEm);
    if (ms > ultimaMs) {
      ultimaMs = ms;
      ultimaEm = e.criadoEm;
    }
  }
  return { porGrupo, bloqueiosRateLimit, alteracoesVotoJuri, ultimaEm };
}

/** Motivo informado pelo admin (para a coluna `motivo` do CSV), se houver. */
export function motivoDaAuditoria(detalhes: Detalhes): string | null {
  return texto(detalhes?.motivo);
}
