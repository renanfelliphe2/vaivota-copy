import EmbeddedPostgres from "embedded-postgres";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { temFlag } from "./_ambiente";

// Desenvolvimento sem Supabase: sobe um PostgreSQL de verdade (embedded-postgres), com os dados em .pgdata/, aplica as
// migrações e o seed e fica rodando até Ctrl+C. `pnpm db:local` (use `--resetar` para recomeçar do zero).
// Depois, no .env.local:
//   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/vaivota
//   DIRECT_URL=postgres://postgres:postgres@127.0.0.1:54329/vaivota

const PORTA = 54329;
const DIR = ".pgdata";
const URL = `postgres://postgres:postgres@127.0.0.1:${PORTA}/vaivota`;

async function main() {
  if (temFlag("resetar")) fs.rmSync(DIR, { recursive: true, force: true });
  const novo = !fs.existsSync(DIR);
  const pg = new EmbeddedPostgres({
    databaseDir: DIR,
    user: "postgres",
    password: "postgres",
    port: PORTA,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });
  if (novo) await pg.initialise();
  await pg.start();
  if (novo) await pg.createDatabase("vaivota");

  const env = { ...process.env, DATABASE_URL: URL, DIRECT_URL: URL };
  const executar = (args: string[]) => spawnSync("pnpm", args, { stdio: "inherit", env, shell: true });
  const migrar = executar(["exec", "prisma", "migrate", "deploy"]);
  if (migrar.status !== 0) throw new Error("A migração falhou.");
  const semear = executar(["db:seed"]);
  if (semear.status !== 0) throw new Error("O seed falhou.");

  console.info(`\nBanco local no ar em ${URL}\nColoque no .env.local:\n  DATABASE_URL=${URL}\n  DIRECT_URL=${URL}\nCtrl+C para parar.`);
  const parar = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void parar());
  process.on("SIGTERM", () => void parar());
  await new Promise(() => {});
}

main().catch((erro) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
