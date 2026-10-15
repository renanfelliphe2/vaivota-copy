import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de integração do MVP Semana Tech: rodam o código de `src/server/**` contra um PostgreSQL real embutido
// (embedded-postgres), com a migração de `prisma/migrations` aplicada. Separados de `pnpm test` (que é só de funções
// puras): sobem um banco e levam mais tempo. `pnpm test:integracao`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/integracao/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/integracao/globalSetup.ts"],
    pool: "forks",
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
