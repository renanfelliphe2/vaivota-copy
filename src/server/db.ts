import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "./env";

// Um cliente por processo (o hot reload do `next dev` não pode abrir conexões novas a cada recarga).
// Em produção `DATABASE_URL` é o pooler do Supabase (transaction mode, porta 6543): a Vercel é serverless e não
// pode abrir uma conexão direta por requisição. A migração usa `DIRECT_URL` (prisma.config.ts).

const global = globalThis as unknown as { __vaivotaDb?: PrismaClient };

function criar(): PrismaClient {
  const adaptador = new PrismaPg({
    connectionString: env.databaseUrl,
    max: env.dbPoolMax,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });
  // Transações com folga: numa rajada na abertura da urna o voto espera conexão do pool (maxWait) antes de começar.
  return new PrismaClient({ adapter: adaptador, transactionOptions: { maxWait: 10_000, timeout: 20_000 } });
}

/** Cliente do banco, criado no primeiro uso. */
export function db(): PrismaClient {
  global.__vaivotaDb ??= criar();
  return global.__vaivotaDb;
}

export type Banco = PrismaClient;
/** Cliente de uma transação interativa (`db().$transaction(async (tx) => ...)`). */
export type Transacao = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Fecha o pool (scripts e testes). */
export async function desconectarBanco(): Promise<void> {
  if (global.__vaivotaDb) {
    await global.__vaivotaDb.$disconnect();
    global.__vaivotaDb = undefined;
  }
}
