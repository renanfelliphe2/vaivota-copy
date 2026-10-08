import { motivoDaFase, TEXTOS_TRAVAS } from "@/lib/textosTravas";
import { mensagemDe } from "@/servicos/mensagens";
import type { Resultado } from "@/servicos/resultado";
import type { Evento } from "./tipos";

// Etapa 6 (D3, seção 5.1): fonte única das travas da configuração. Componentes só perguntam
// `nivel(acao)` e `motivo(acao)`; os serviços sempre chamam `exigirAcao` antes de validar campos.

export type FaseConfig = "RASCUNHO" | "ATIVO_NAO_INICIADA" | "URNA_ABERTA" | "URNA_ENCERRADA" | "CONCLUIDO";
export type NivelTrava = "LIVRE" | "AUDITADO" | "ESTENDER" | "EXCEPCIONAL" | "TRAVADO" | "INDISPONIVEL" | "LEITURA";

export type AcaoConfig =
  | "GERAL_NOME_DESCRICAO"
  | "GERAL_SLUG"
  | "GERAL_FUSO_INICIO"
  | "GERAL_FIM_JANELA"
  | "GERAL_ENCERRAMENTO_AUTOMATICO"
  /** Adicionar, remover, colocar e tirar da votação. */
  | "CANDIDATOS_PUBLICACAO"
  | "CANDIDATOS_REORDENAR"
  | "CANDIDATOS_CORRIGIR"
  | "CANDIDATOS_DESQUALIFICAR"
  /** Adicionar e remover campos extras. */
  | "CAMPOS_EXTRAS_ESTRUTURA"
  | "CAMPOS_EXTRAS_ROTULO"
  | "CONVITES_GERAR"
  | "CONVITES_RENOMEAR"
  | "CONVITES_REVOGAR"
  | "PLACAR"
  /** D24 (rev. 3, E32): o nível depende do dado (convite USADO), não da fase. */
  | "MODULO_JURI_DESLIGAR"
  | "TEMA"
  | "OPERACAO";

type Linha = [rascunho: NivelTrava, ativoNaoIniciada: NivelTrava, urnaAberta: NivelTrava, urnaEncerrada: NivelTrava];

/** Matriz 5.1 (as quatro primeiras fases; CONCLUIDO é sempre LEITURA). */
const MATRIZ: Record<Exclude<AcaoConfig, "MODULO_JURI_DESLIGAR">, Linha> = {
  GERAL_NOME_DESCRICAO: ["LIVRE", "LIVRE", "LIVRE", "LIVRE"],
  GERAL_SLUG: ["LIVRE", "TRAVADO", "TRAVADO", "TRAVADO"],
  GERAL_FUSO_INICIO: ["LIVRE", "LIVRE", "TRAVADO", "TRAVADO"],
  GERAL_FIM_JANELA: ["LIVRE", "LIVRE", "ESTENDER", "TRAVADO"],
  GERAL_ENCERRAMENTO_AUTOMATICO: ["LIVRE", "LIVRE", "AUDITADO", "TRAVADO"],
  CANDIDATOS_PUBLICACAO: ["LIVRE", "LIVRE", "TRAVADO", "TRAVADO"],
  CANDIDATOS_REORDENAR: ["LIVRE", "LIVRE", "LIVRE", "LIVRE"],
  CANDIDATOS_CORRIGIR: ["LIVRE", "LIVRE", "AUDITADO", "AUDITADO"],
  CANDIDATOS_DESQUALIFICAR: ["INDISPONIVEL", "INDISPONIVEL", "EXCEPCIONAL", "EXCEPCIONAL"],
  CAMPOS_EXTRAS_ESTRUTURA: ["LIVRE", "LIVRE", "TRAVADO", "TRAVADO"],
  CAMPOS_EXTRAS_ROTULO: ["LIVRE", "LIVRE", "AUDITADO", "AUDITADO"],
  CONVITES_GERAR: ["LIVRE", "LIVRE", "LIVRE", "TRAVADO"],
  CONVITES_RENOMEAR: ["LIVRE", "LIVRE", "LIVRE", "TRAVADO"],
  CONVITES_REVOGAR: ["LIVRE", "LIVRE", "AUDITADO", "TRAVADO"],
  PLACAR: ["LIVRE", "LIVRE", "TRAVADO", "TRAVADO"],
  TEMA: ["LIVRE", "LIVRE", "LIVRE", "LIVRE"],
  OPERACAO: ["LIVRE", "LIVRE", "LIVRE", "LIVRE"],
};

const INDICE_FASE: Record<Exclude<FaseConfig, "CONCLUIDO">, number> = {
  RASCUNHO: 0,
  ATIVO_NAO_INICIADA: 1,
  URNA_ABERTA: 2,
  URNA_ENCERRADA: 3,
};

export type EventoTravas = Pick<Evento, "estado" | "estadoUrna">;

/** Opções que dependem de dado público (nunca de hash). */
export type OpcoesTravas = { conviteUsado?: boolean };

/** Precedência da Etapa 1: CONCLUIDO > RASCUNHO > urna. `incoerente` = combinação só alcançável pela toolbar. */
export function resolverFaseConfig(evento: EventoTravas): { fase: FaseConfig; incoerente: boolean } {
  if (evento.estado === "CONCLUIDO") return { fase: "CONCLUIDO", incoerente: evento.estadoUrna !== "ENCERRADA" };
  if (evento.estado === "RASCUNHO") return { fase: "RASCUNHO", incoerente: evento.estadoUrna !== "NAO_INICIADA" };
  if (evento.estadoUrna === "NAO_INICIADA") return { fase: "ATIVO_NAO_INICIADA", incoerente: false };
  if (evento.estadoUrna === "ABERTA") return { fase: "URNA_ABERTA", incoerente: false };
  return { fase: "URNA_ENCERRADA", incoerente: false };
}

export function nivelDaAcao(fase: FaseConfig, acao: AcaoConfig, opcoes: OpcoesTravas = {}): NivelTrava {
  if (fase === "CONCLUIDO") return "LEITURA";
  if (acao === "MODULO_JURI_DESLIGAR") return opcoes.conviteUsado ? "TRAVADO" : "LIVRE";
  return MATRIZ[acao][INDICE_FASE[fase]];
}

export function motivoDaAcao(fase: FaseConfig, acao: AcaoConfig, opcoes: OpcoesTravas = {}): string | null {
  const nivel = nivelDaAcao(fase, acao, opcoes);
  switch (nivel) {
    case "LIVRE":
      return null;
    case "LEITURA":
      return TEXTOS_TRAVAS.concluido;
    case "ESTENDER":
      return TEXTOS_TRAVAS.estender;
    case "AUDITADO":
      return TEXTOS_TRAVAS.auditado;
    case "EXCEPCIONAL":
      return TEXTOS_TRAVAS.excepcional;
    case "INDISPONIVEL":
      return TEXTOS_TRAVAS.desqualificarIndisponivel;
    case "TRAVADO":
      if (acao === "MODULO_JURI_DESLIGAR") return TEXTOS_TRAVAS.juriComConvite;
      if (acao === "GERAL_SLUG") return TEXTOS_TRAVAS.slug;
      return motivoDaFase(fase) ?? TEXTOS_TRAVAS.urnaAberta;
  }
}

export type Travas = {
  fase: FaseConfig;
  incoerente: boolean;
  nivel: (acao: AcaoConfig) => NivelTrava;
  motivo: (acao: AcaoConfig) => string | null;
  /** Atalho: o controle pode ser usado (não TRAVADO, INDISPONIVEL nem LEITURA). */
  permite: (acao: AcaoConfig) => boolean;
};

const BLOQUEIOS: NivelTrava[] = ["TRAVADO", "INDISPONIVEL", "LEITURA"];

export function resolverTravas(evento: EventoTravas, opcoes: OpcoesTravas = {}): Travas {
  const { fase, incoerente } = resolverFaseConfig(evento);
  const nivel = (acao: AcaoConfig) => nivelDaAcao(fase, acao, opcoes);
  return {
    fase,
    incoerente,
    nivel,
    motivo: (acao) => motivoDaAcao(fase, acao, opcoes),
    permite: (acao) => !BLOQUEIOS.includes(nivel(acao)),
  };
}

/** EVENTO_CONCLUIDO se LEITURA; TRAVADO se TRAVADO ou INDISPONIVEL. */
export function exigirAcao(evento: EventoTravas, acao: AcaoConfig, opcoes: OpcoesTravas = {}): Resultado<null> {
  const { fase } = resolverFaseConfig(evento);
  const nivel = nivelDaAcao(fase, acao, opcoes);
  if (nivel === "LEITURA") return { ok: false, erro: { codigo: "EVENTO_CONCLUIDO", mensagem: mensagemDe("EVENTO_CONCLUIDO"), detalhe: acao } };
  if (nivel === "TRAVADO" || nivel === "INDISPONIVEL")
    return {
      ok: false,
      erro: { codigo: "TRAVADO", mensagem: motivoDaAcao(fase, acao, opcoes) ?? mensagemDe("TRAVADO"), detalhe: `${acao} em ${fase}` },
    };
  return { ok: true, dados: null };
}
