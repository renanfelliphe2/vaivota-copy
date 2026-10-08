import { paraMs } from "@/lib/tempo";
import type { ConfigApresentacao, Evento } from "./tipos";

// Etapa 1 (D5): uma função pura decide a situação do evento e da urna. Faixa, CTA, link de jurado e
// prévia da landing leem esta decisão; a Etapa 2 acrescenta a camada de sessão por cima.

export type SituacaoEvento =
  | "CONCLUIDO"
  | "EM_PREPARACAO"
  | "ENCERRADA"
  | "TEMPO_ESGOTADO"
  | "RETA_FINAL"
  | "ABERTA"
  | "ABERTURA_PENDENTE"
  | "NAO_INICIADA";

export type OpcoesSituacao = {
  /** Pula EM_PREPARACAO e decide pela urna (admin na Etapa 2). */
  ignorarRascunho?: boolean;
};

/** Avaliada nesta ordem: CONCLUIDO > EM_PREPARACAO > ENCERRADA > TEMPO_ESGOTADO > RETA_FINAL > ABERTA > ABERTURA_PENDENTE > NAO_INICIADA. */
export function resolverSituacaoEvento(
  evento: Pick<Evento, "estado" | "estadoUrna" | "janelaInicio" | "janelaFim">,
  configApresentacao: Pick<ConfigApresentacao, "limiarRetaFinalSegundos">,
  agoraMs: number,
  opcoes: OpcoesSituacao = {},
): SituacaoEvento {
  if (evento.estado === "CONCLUIDO") return "CONCLUIDO";
  if (evento.estado === "RASCUNHO" && !opcoes.ignorarRascunho) return "EM_PREPARACAO";
  if (evento.estadoUrna === "ENCERRADA") return "ENCERRADA";

  if (evento.estadoUrna === "ABERTA") {
    if (evento.janelaFim) {
      const restante = paraMs(evento.janelaFim) - agoraMs;
      if (restante <= 0) return "TEMPO_ESGOTADO";
      if (restante <= configApresentacao.limiarRetaFinalSegundos * 1000) return "RETA_FINAL";
    }
    return "ABERTA";
  }

  if (evento.janelaInicio && agoraMs >= paraMs(evento.janelaInicio)) return "ABERTURA_PENDENTE";
  return "NAO_INICIADA";
}

/**
 * Pode haver botão de votar (atalho do cabeçalho, cartões, hero)? Só com o evento ATIVO e a urna ABERTA, inclusive
 * no tempo esgotado (a urna segue aberta até a organização encerrar). Não olha sessão nem relógio.
 */
export function votacaoAberta(evento: Pick<Evento, "estado" | "estadoUrna">): boolean {
  return evento.estado === "ATIVO" && evento.estadoUrna === "ABERTA";
}

export type ChamadaSituacao = {
  /** null = sem CTA principal (e sem botão no header). */
  rotulo: "Quero votar" | "Criar conta" | "Em breve" | null;
  desabilitado: boolean;
  /** Mostra o link "Sou jurado" (também exige moduloJuri). */
  linkJurado: boolean;
  /** Mostra a prévia de candidatos. */
  previa: boolean;
};

/** Colunas da tabela 5.1 da Etapa 1. */
export function chamadaDaSituacao(situacao: SituacaoEvento): ChamadaSituacao {
  switch (situacao) {
    case "CONCLUIDO":
    case "ENCERRADA":
      return { rotulo: null, desabilitado: false, linkJurado: false, previa: true };
    case "EM_PREPARACAO":
      return { rotulo: "Em breve", desabilitado: true, linkJurado: false, previa: false };
    case "TEMPO_ESGOTADO":
    case "RETA_FINAL":
    case "ABERTA":
      return { rotulo: "Quero votar", desabilitado: false, linkJurado: true, previa: true };
    case "ABERTURA_PENDENTE":
    case "NAO_INICIADA":
      return { rotulo: "Criar conta", desabilitado: false, linkJurado: true, previa: true };
  }
}
