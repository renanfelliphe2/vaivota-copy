import type { AcaoAuditoria, EstadoApp, Instante } from "@/dominio/tipos";
import { FUSO_PADRAO, paraInstante } from "@/lib/tempo";
import { obterAmbiente } from "./ambiente";

export type EntradaAuditoria = {
  eventoId: string | null;
  usuarioId: string | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
  ipHash?: string;
  /** Sem criadoEm, usa o relógio simulado; com ele (seed de volume da Etapa 7), grava o instante pedido. */
  criadoEm?: Instante;
};

/**
 * Acrescenta uma entrada de auditoria (pura sobre o estado). Nunca registrar a escolha de voto popular ou infantil.
 * Reexportada por store/acoes.ts (nome do contrato).
 */
export function registrarAuditoria(estado: EstadoApp, entrada: EntradaAuditoria): EstadoApp {
  const fuso = estado.banco.eventos.find((e) => e.id === entrada.eventoId)?.fusoHorario ?? FUSO_PADRAO;
  const criadoEm = entrada.criadoEm ?? paraInstante(obterAmbiente().relogio.getAgora(), fuso);
  const id = estado.banco.sequencias.auditoria + 1;
  return {
    ...estado,
    banco: {
      ...estado.banco,
      sequencias: { ...estado.banco.sequencias, auditoria: id },
      auditoria: [
        ...estado.banco.auditoria,
        {
          id,
          eventoId: entrada.eventoId,
          atorUsuarioId: entrada.usuarioId,
          atorDispositivoId: null,
          acao: entrada.acao,
          entidade: entrada.entidade,
          entidadeId: entrada.entidadeId ?? null,
          detalhes: entrada.detalhes ?? null,
          ipHash: entrada.ipHash ?? null,
          criadoEm,
        },
      ],
    },
  };
}
