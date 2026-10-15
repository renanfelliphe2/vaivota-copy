import "server-only";
import { db } from "./db";
import { limparContadoresAntigos } from "./limites";

// Faxina barata, feita de vez em quando (no máximo a cada 10 minutos por instância) por quem se cadastra:
//  - contadores de limite de taxa com mais de 1 dia;
//  - códigos de e-mail vencidos;
//  - contas que nunca confirmaram o e-mail (mais de 2 horas) e não têm nenhuma participação: sem isso, um cadastro
//    abandonado, ou feito por outra pessoa com o e-mail alheio, deixaria o e-mail "ocupado" e travaria o Google dele.
// Não precisa de agendador (cron) nem de nenhuma conta a mais.

const INTERVALO_MS = 10 * 60_000;
const IDADE_CONTA_NAO_CONFIRMADA_MS = 2 * 60 * 60_000;

const global = globalThis as unknown as { __vaivotaManutencao?: number };

export async function manutencaoSeNecessario(agoraMs = Date.now()): Promise<void> {
  if (global.__vaivotaManutencao && agoraMs - global.__vaivotaManutencao < INTERVALO_MS) return;
  global.__vaivotaManutencao = agoraMs;
  try {
    await limparContadoresAntigos(agoraMs);
    await db().verification.deleteMany({ where: { expiresAt: { lt: new Date(agoraMs) } } });
    await db().usuario.deleteMany({
      where: {
        emailVerificado: false,
        criadoEm: { lt: new Date(agoraMs - IDADE_CONTA_NAO_CONFIRMADA_MS) },
        participacoes: { none: {} },
      },
    });
  } catch (erro) {
    console.error("[servidor] manutenção falhou (segue sem ela):", erro);
  }
}

/** Só para testes. */
export function reiniciarManutencao(): void {
  global.__vaivotaManutencao = undefined;
}
