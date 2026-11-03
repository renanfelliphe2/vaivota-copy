import "server-only";
import type { Evento as EventoLinha } from "@/generated/prisma/client";
import { exigirAcao, type AcaoConfig } from "@/dominio/travas";
import { db, type Transacao } from "./db";
import { falhaInterna, type Resultado } from "./resultado";

/** Trava a linha do evento (`FOR NO KEY UPDATE`): configuração do júri, convites e operação não se atropelam. */
export async function travarEvento(tx: Transacao, eventoId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM evento WHERE id = ${eventoId} FOR NO KEY UPDATE`;
}

/**
 * Roda a ação com a linha do evento TRAVADA e a trava da fase conferida de novo sobre o estado relido: a fase lida antes
 * (em `exigirAdmin`) pode já ter mudado, por exemplo se a urna abriu enquanto outro admin gerava ou revogava convites.
 */
export async function comEventoTravado<T>(
  eventoId: string,
  acao: AcaoConfig,
  fn: (tx: Transacao, evento: EventoLinha) => Promise<Resultado<T>>,
): Promise<Resultado<T>> {
  try {
    return await db().$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      const evento = await tx.evento.findUniqueOrThrow({ where: { id: eventoId } });
      const trava = exigirAcao(evento, acao);
      if (!trava.ok) return trava;
      return fn(tx, evento);
    });
  } catch (e) {
    return falhaInterna(e, `evento travado: ${acao}`);
  }
}
