import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { argumento } from "./_ambiente";

// ST6: backup do banco com `pg_dump` (formato custom). `pnpm db:backup --rotulo antes-da-urna` e de novo
// `--rotulo depois-do-encerramento`. Usa DIRECT_URL (conexão direta; o pooler em modo transação não serve para pg_dump).
// Restaurar: `pg_restore --clean --if-exists --no-owner -d "<URL>" backups/arquivo.dump`.
// Exige o cliente do PostgreSQL (pg_dump) instalado e na versão do servidor (Supabase: 17). Alternativa: o backup
// diário do próprio Supabase (painel > Database > Backups), mas este é o que se faz antes de abrir a urna.

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DIRECT_URL (ou DATABASE_URL) no .env.local.");
  process.exit(1);
}

const versao = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
if (versao.error || versao.status !== 0) {
  console.error("pg_dump não encontrado. Instale o cliente do PostgreSQL (https://www.postgresql.org/download/) e tente de novo.");
  process.exit(1);
}

const rotulo = (argumento("rotulo") ?? "manual").replace(/[^a-z0-9-]/gi, "-");
const carimbo = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("backups", { recursive: true });
const arquivo = path.join("backups", `vaivota-${rotulo}-${carimbo}.dump`);

const r = spawnSync("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--file=${arquivo}`, url], { stdio: "inherit" });
if (r.status !== 0) {
  console.error("O pg_dump falhou (confira a URL, a senha e a versão do cliente).");
  process.exit(r.status ?? 1);
}
console.info(`Backup gravado em ${arquivo}. Guarde uma cópia fora deste computador.`);
