// Com `--local`, carrega o .env.development.local (o banco local do `next dev`) ANTES do _ambiente, que não sobrescreve o que já
// está definido. Sem a flag, o script segue no .env.local (produção), como os outros scripts de produção.
if (process.argv.includes("--local")) {
  try {
    process.loadEnvFile(".env.development.local");
  } catch {
    // arquivo ausente
  }
}
