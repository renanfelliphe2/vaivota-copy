// Carrega as variáveis de ambiente como o Next faz (.env.local, depois .env). Importar PRIMEIRO nos scripts.
// Variáveis já definidas no ambiente (Vercel, CI) têm precedência.
for (const arquivo of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(arquivo);
  } catch {
    // arquivo ausente
  }
}

export function argumento(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

export function temFlag(nome: string): boolean {
  return process.argv.includes(`--${nome}`);
}
