import "server-only";

// Variáveis de ambiente do servidor, lidas na hora do uso (nunca no carregamento do módulo): o `next build` não
// precisa de segredo nenhum, e um segredo faltando só derruba a rota que o usa, com mensagem clara.

function obrigatoria(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) throw new Error(`Variável de ambiente ${nome} não configurada. Veja .env.example.`);
  return valor;
}

function opcional(nome: string): string | undefined {
  return process.env[nome]?.trim() || undefined;
}

function inteiro(nome: string, padrao: number): number {
  const bruto = opcional(nome);
  if (!bruto) return padrao;
  const n = Number(bruto);
  return Number.isInteger(n) && n > 0 ? n : padrao;
}

export type ProvedorEmail = "resend" | "smtp" | "console";
export type ProvedorStorage = "supabase" | "local";

export const env = {
  /** Pooler do Supabase (transaction mode) em produção. */
  get databaseUrl() {
    return obrigatoria("DATABASE_URL");
  },
  get dbPoolMax() {
    return inteiro("DB_POOL_MAX", 10);
  },
  /** URL pública do site, sem barra final: QR Codes, links e origem confiável da autenticação. */
  get appUrl() {
    const url = opcional("APP_URL") ?? opcional("BETTER_AUTH_URL");
    // Em produção a URL pública é obrigatória: é a origem confiável do login e vai nos links.
    if (!url && process.env.NODE_ENV === "production") throw new Error("APP_URL não configurada (o endereço público do site). Veja .env.example.");
    return (url ?? "http://localhost:3000").replace(/\/+$/, "");
  },
  get authSecret() {
    const segredo = obrigatoria("BETTER_AUTH_SECRET");
    // Segredo curto ou o texto de exemplo deixaria o cache de sessão do cookie forjável.
    if (segredo.length < 32 || /^troque-por/i.test(segredo))
      throw new Error("BETTER_AUTH_SECRET precisa ter 32+ caracteres aleatórios (openssl rand -base64 32), não o texto de exemplo.");
    return segredo;
  },
  /** Origens extras aceitas (por exemplo, o domínio `vercel.app` ao lado do domínio próprio). Separadas por vírgula. */
  get originsConfiaveis(): string[] {
    return (opcional("TRUSTED_ORIGINS") ?? "")
      .split(",")
      .map((o) => o.trim().replace(/\/+$/, ""))
      .filter(Boolean);
  },
  get googleClientId() {
    return opcional("GOOGLE_CLIENT_ID");
  },
  get googleClientSecret() {
    return opcional("GOOGLE_CLIENT_SECRET");
  },
  get googleAtivo() {
    return Boolean(opcional("GOOGLE_CLIENT_ID") && opcional("GOOGLE_CLIENT_SECRET"));
  },

  // E-mail (códigos de verificação e recuperação de senha)
  get emailProvedor(): ProvedorEmail {
    const valor = opcional("EMAIL_PROVIDER");
    // `console` só em desenvolvimento e testes: em produção imprimiria os códigos de e-mail no log em vez de enviar.
    if (valor === "console" && process.env.NODE_ENV === "production" && opcional("PERMITIR_EMAIL_CONSOLE") !== "true")
      throw new Error("EMAIL_PROVIDER=console não é permitido em produção (só em ensaio local, com PERMITIR_EMAIL_CONSOLE=true).");
    if (valor === "resend" || valor === "smtp" || valor === "console") return valor;
    // Sem configuração: com chave do Resend usa o Resend. Sem chave, só em desenvolvimento imprime o código no log;
    // em produção é erro (ninguém receberia o código e o cadastro pareceria funcionar).
    if (opcional("RESEND_API_KEY")) return "resend";
    if (process.env.NODE_ENV === "production") throw new Error("Nenhum provedor de e-mail configurado: defina RESEND_API_KEY (ou EMAIL_PROVIDER=smtp). Veja .env.example.");
    return "console";
  },
  get emailRemetente() {
    return opcional("EMAIL_FROM") ?? "VaiVota <onboarding@resend.dev>";
  },
  get resendApiKey() {
    return obrigatoria("RESEND_API_KEY");
  },
  get smtp() {
    return {
      host: obrigatoria("SMTP_HOST"),
      port: inteiro("SMTP_PORT", 465),
      secure: (opcional("SMTP_SECURE") ?? "true") !== "false",
      user: obrigatoria("SMTP_USER"),
      pass: obrigatoria("SMTP_PASS"),
    };
  },

  // Imagens dos candidatos
  get storageProvedor(): ProvedorStorage {
    const valor = opcional("STORAGE_PROVIDER");
    if (valor === "supabase" || valor === "local") return valor;
    return opcional("SUPABASE_URL") && opcional("SUPABASE_SERVICE_ROLE_KEY") ? "supabase" : "local";
  },
  get supabaseUrl() {
    return obrigatoria("SUPABASE_URL").replace(/\/+$/, "");
  },
  get supabaseServiceKey() {
    return obrigatoria("SUPABASE_SERVICE_ROLE_KEY");
  },
  get storageBucket() {
    return opcional("SUPABASE_STORAGE_BUCKET") ?? "candidatos";
  },

  /** Segredo para o hash do IP gravado em auditoria (nunca o IP em claro). */
  get ipSalt() {
    return opcional("IP_HASH_SALT") ?? opcional("BETTER_AUTH_SECRET") ?? "vaivota";
  },
};
