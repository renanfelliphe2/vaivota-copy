import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// D19 (Etapa 0): Vitest só para funções puras: src/dominio, src/lib, o estado real do navegador (src/store) e a fronteira
// com o servidor (src/servicos). O código do servidor roda contra um PostgreSQL real em `pnpm test:integracao`
// (vitest.integracao.config.mts).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/dominio/**/*.test.ts", "src/lib/**/*.test.ts", "src/store/**/*.test.ts", "src/servicos/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
