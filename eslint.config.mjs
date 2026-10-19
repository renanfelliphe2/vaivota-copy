import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Fronteiras de importação (uma regra só por arquivo: o flat config não mescla `no-restricted-imports`).
const PROIBE_MOCKS = {
  group: ["@/mocks", "@/mocks/*", "**/mocks/*"],
  message: "Telas, componentes e lib não importam mocks: use seletores (store/seletores) ou serviços (servicos/).",
};
// MVP Maratona Tech Tivit: o código do servidor (Prisma, segredos, Better Auth) nunca entra no pacote do navegador. Só as rotas e
// os layouts de servidor (src/app) e src/server importam `@/server`.
const PROIBE_SERVIDOR = {
  group: ["@/server", "@/server/*", "**/server/*"],
  message: "Código de servidor não pode ser importado por componentes, lib, store, servicos ou dominio.",
};
const PROIBE_PRISMA = { group: ["@/generated", "@/generated/*"], message: "O cliente Prisma só existe no servidor." };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Fronteira de dados (Etapa 0): telas, componentes e lib nunca importam os mocks.
  // Só store/, servicos/ e mocks/ podem ler o seed.
  {
    files: ["src/app/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [PROIBE_MOCKS] }] },
  },
  {
    files: ["src/components/**", "src/lib/**"],
    rules: { "no-restricted-imports": ["error", { patterns: [PROIBE_MOCKS, PROIBE_SERVIDOR, PROIBE_PRISMA] }] },
  },
  {
    files: ["src/store/**", "src/servicos/**", "src/dominio/**"],
    // Os testes de domínio leem o seed do protótipo; nada aqui importa servidor.
    ignores: ["**/*.test.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [PROIBE_SERVIDOR, PROIBE_PRISMA] }] },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cliente do Prisma gerado por `prisma generate`, build alternativo, banco local e o script do k6.
    "src/generated/**",
    ".next-build/**",
    ".pgdata/**",
    "backups/**",
    "public/uploads/**",
    "tests/carga/**",
  ]),
]);

export default eslintConfig;
