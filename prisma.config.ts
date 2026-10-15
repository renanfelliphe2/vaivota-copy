import { defineConfig } from "prisma/config";

// Prisma 7: a CLI não lê o .env sozinha. Carrega o mesmo arquivo que o Next usa (.env.local, depois .env);
// variáveis já definidas no ambiente (Vercel, CI) têm precedência.
for (const arquivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(arquivo);
  } catch {
    // arquivo ausente: segue com o que já está no ambiente
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server scripts/semear.ts",
  },
  datasource: {
    // Migração usa a conexão direta (porta 5432 ou o pooler em modo sessão). A aplicação usa DATABASE_URL (src/server/db.ts).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
