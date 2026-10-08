import { hashMock } from "@/lib/hash";
import type { Dispositivo, Evento } from "./tipos";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6 e §9): regras puras do modo quiosque.

/**
 * O que o totem mostra. Só VOTANDO aceita voto; as demais são telas neutras de bloqueio.
 * Ordem de precedência: aparelho, módulo, evento, aparelho pausado, urna, candidatos.
 */
export type SituacaoTotem =
  | "NAO_PAREADO"
  | "DISPOSITIVO_REVOGADO"
  | "MODULO_DESLIGADO"
  | "EVENTO_INDISPONIVEL"
  | "EVENTO_CONCLUIDO"
  | "DISPOSITIVO_PAUSADO"
  | "URNA_NAO_INICIADA"
  | "URNA_ENCERRADA"
  | "SEM_CANDIDATOS"
  | "VOTANDO";

export function situacaoTotem(
  evento: Pick<Evento, "id" | "estado" | "estadoUrna" | "moduloInfantil">,
  dispositivo: Pick<Dispositivo, "eventoId" | "estado"> | null,
  totalVotaveis: number,
): SituacaoTotem {
  // Um aparelho pareado com outro evento não vale aqui.
  if (!dispositivo || dispositivo.eventoId !== evento.id) return "NAO_PAREADO";
  if (dispositivo.estado === "REVOGADO") return "DISPOSITIVO_REVOGADO";
  if (!evento.moduloInfantil) return "MODULO_DESLIGADO";
  if (evento.estado === "RASCUNHO") return "EVENTO_INDISPONIVEL";
  // §9: concluir o evento bloqueia todos os totens.
  if (evento.estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (dispositivo.estado === "PAUSADO") return "DISPOSITIVO_PAUSADO";
  if (evento.estadoUrna === "NAO_INICIADA") return "URNA_NAO_INICIADA";
  if (evento.estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  if (totalVotaveis === 0) return "SEM_CANDIDATOS";
  return "VOTANDO";
}

/** Hash do PIN de saída do quiosque. Só do mock (D12): em produção, hash com sal no servidor. */
export function hashPinTotem(dispositivoId: string, pin: string): string {
  return hashMock(`pin:${dispositivoId}:${pin}`);
}

/** Totem sem PIN definido sai direto; com PIN, só com o PIN certo (§6). */
export function pinConfere(dispositivo: Pick<Dispositivo, "id" | "hashPin">, pin: string): boolean {
  if (dispositivo.hashPin === null) return true;
  return hashPinTotem(dispositivo.id, pin) === dispositivo.hashPin;
}

/** §6 (pendência §12: tempos provisórios). */
export const TEMPOS_TOTEM = {
  /** Sucesso → tela inicial. */
  retornoMs: 6_000,
  /** Sem toque na escolha ou na confirmação → tela inicial. */
  inatividadeMs: 30_000,
  /** Erro → tela inicial. */
  erroMs: 8_000,
} as const;
