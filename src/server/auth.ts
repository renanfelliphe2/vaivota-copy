import "server-only";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { after } from "next/server";
import { db } from "./db";
import { enviarEmail, montarEmailCodigo } from "./email";
import { env } from "./env";
import { capturarErro } from "./observabilidade";

// Better Auth (ST1): e-mail e senha + Google, com código de 6 números por e-mail (Resend) para verificar o e-mail e
// recuperar a senha. Só a conta `credential` guarda senha (scrypt, tabela `account`); `usuario` é o `user` do Better Auth.
//
// As rotas HTTP do Better Auth (`/api/auth/*`) só expõem o que o navegador precisa chamar direto (Google, sessão, sair;
// ver src/app/api/auth/[...all]/route.ts). Os fluxos de e-mail e senha passam por src/server/acesso.ts, que acrescenta
// o bloqueio por tentativas, a auditoria e o contexto do evento.

const SETE_DIAS = 60 * 60 * 24 * 7;
export const VALIDADE_CODIGO_SEGUNDOS = 10 * 60;
export const TENTATIVAS_CODIGO = 5;

function criar() {
  return betterAuth({
    appName: "VaiVota",
    baseURL: env.appUrl,
    secret: env.authSecret,
    trustedOrigins: [env.appUrl, ...env.originsConfiaveis],
    database: prismaAdapter(db(), { provider: "postgresql" }),

    user: {
      modelName: "usuario",
      fields: {
        name: "nome",
        emailVerified: "emailVerificado",
        image: "imagem",
        createdAt: "criadoEm",
        updatedAt: "atualizadoEm",
      },
    },
    // Cache assinado no cookie por 5 minutos: o polling do público não vira uma leitura de sessão no banco a cada vez.
    session: { expiresIn: SETE_DIAS, updateAge: 60 * 60 * 24, cookieCache: { enabled: true, maxAge: 5 * 60 } },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 72,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: { autoSignInAfterVerification: true },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: VALIDADE_CODIGO_SEGUNDOS,
        // 5 recusas seguidas invalidam o código: é preciso pedir outro (que tem limite próprio).
        allowedAttempts: TENTATIVAS_CODIGO,
        overrideDefaultEmailVerification: true,
        storeOTP: "hashed",
        async sendVerificationOTP({ email, otp, type }) {
          try {
            await enviarEmail(montarEmailCodigo(type, email, otp, VALIDADE_CODIGO_SEGUNDOS / 60));
          } catch (erro) {
            // Roda em segundo plano (o usuário já viu "código enviado"): sem isto a falha do Resend sumiria.
            capturarErro(erro, `envio de e-mail (${type})`);
            throw erro;
          }
        },
        rateLimit: { window: 60, max: 5 },
      }),
    ],

    socialProviders: env.googleAtivo
      ? { google: { clientId: env.googleClientId!, clientSecret: env.googleClientSecret!, prompt: "select_account" } }
      : {},
    // Entrar com Google numa conta que já existe por e-mail (verificado) liga as duas.
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },

    // Só as rotas do Google passam por este limite (o resto do Better Auth está fechado ou é chamado direto pelo servidor).
    // Fica em MEMÓRIA, de propósito: no banco ele dividiria a tabela `rate_limit` com os contadores do app e apagaria as
    // linhas deles a cada virada de janela. E é generoso: centenas de pessoas entrando pelo Google no mesmo Wi-Fi.
    rateLimit: {
      enabled: true,
      storage: "memory",
      window: 60,
      max: 1500,
      customRules: {
        "/sign-in/social": { window: 60, max: 1500 },
        "/callback/*": { window: 60, max: 1500 },
      },
    },

    advanced: {
      database: { generateId: () => randomUUID() },
      // Na Vercel o envio do e-mail pode terminar depois da resposta: `after` mantém a função viva até acabar.
      backgroundTasks: {
        handler: (promessa) => {
          try {
            after(promessa);
          } catch {
            void promessa.catch(() => {});
          }
        },
      },
      ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    },
  });
}

type Auth = ReturnType<typeof criar>;

const global = globalThis as unknown as { __vaivotaAuth?: Auth };

/** Instância única (criada no primeiro uso, para o `next build` não exigir segredos). */
export function auth(): Auth {
  global.__vaivotaAuth ??= criar();
  return global.__vaivotaAuth;
}
