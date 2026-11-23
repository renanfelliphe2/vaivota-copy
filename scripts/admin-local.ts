import "./_ambiente-dev";
import "./_ambiente";
import { hashPassword } from "better-auth/crypto";
import { db, desconectarBanco } from "@/server/db";
import { promoverAdminEmTodos } from "@/server/semente";

// Só desenvolvimento: `pnpm db:admin-local`. Cria (ou refaz) a conta admin@admin.com.br, senha 123, com e-mail já confirmado e
// admin de TODOS os eventos do banco, para entrar sem Google nem e-mail. RECUSA rodar fora de um banco local: uma conta com senha
// "123" num banco de verdade seria uma porta aberta.

const EMAIL = "admin@admin.com.br";
const SENHA = "123";

function bancoEhLocal(): boolean {
  try {
    const host = new URL(process.env.DATABASE_URL ?? "").hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

async function main() {
  if (!bancoEhLocal())
    throw new Error("DATABASE_URL não é um banco local (127.0.0.1/localhost). Recusado: a conta de senha 123 só existe no banco de desenvolvimento.");

  const hash = await hashPassword(SENHA);
  const usuario = await db().usuario.upsert({
    where: { email: EMAIL },
    update: { emailVerificado: true },
    create: { nome: "Admin Local", email: EMAIL, emailVerificado: true },
    select: { id: true },
  });
  await db().account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: usuario.id } },
    update: { password: hash },
    create: { userId: usuario.id, accountId: usuario.id, providerId: "credential", password: hash },
  });

  const resultados = await promoverAdminEmTodos(EMAIL);
  if (resultados.length === 0) console.warn("Nenhum evento no banco ainda: rode o seed e depois `pnpm db:admin-local` de novo.");
  for (const { slug, resultado } of resultados) {
    if ("erro" in resultado) {
      console.error(`[${slug}] ${resultado.erro}`);
      process.exitCode = 1;
    } else console.info(`[${slug}] ${resultado.acao === "ja_era_admin" ? "já era admin" : "admin"}`);
  }
  console.info(`\nConta local pronta: ${EMAIL} / ${SENHA}`);
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => desconectarBanco());
