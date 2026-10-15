import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { AcaoAuditoria } from "@/dominio/tipos";
import type { Banco, Transacao } from "./db";

// Trilha de auditoria (separada dos logs técnicos). NUNCA registrar a escolha de voto popular, nem quem votou e quando.

export type EntradaAuditoria = {
  eventoId: string | null;
  usuarioId: string | null;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId?: string;
  detalhes?: Record<string, unknown>;
  ipHash?: string;
};

export async function registrarAuditoria(cliente: Banco | Transacao, entrada: EntradaAuditoria): Promise<void> {
  await cliente.auditoria.create({
    data: {
      eventoId: entrada.eventoId,
      atorUsuarioId: entrada.usuarioId,
      acao: entrada.acao,
      entidade: entrada.entidade,
      entidadeId: entrada.entidadeId ?? null,
      detalhes: (entrada.detalhes ?? undefined) as Prisma.InputJsonValue | undefined,
      ipHash: entrada.ipHash ?? null,
    },
  });
}
