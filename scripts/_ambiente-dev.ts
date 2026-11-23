// Carrega o .env.development.local (o banco local do `next dev`) ANTES do _ambiente, que não sobrescreve o que já está definido.
// Só para scripts de desenvolvimento; os de produção (migrar, backup, promover-admin) seguem no .env.local.
try {
  process.loadEnvFile(".env.development.local");
} catch {
  // arquivo ausente
}
