import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// D19 (Etapa 0): Vitest só para funções puras em src/dominio/** e src/lib/**.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/dominio/**/*.test.ts", "src/lib/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
  },
});
