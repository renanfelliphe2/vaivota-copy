import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import nodemailer from "nodemailer";
import { montarRemetente } from "@/lib/remetente";
import { env } from "./env";

// Envio de e-mail (ST1). Dois provedores reais e um para desenvolvimento:
//  - resend  (principal): domínio próprio verificado no Resend (SPF/DKIM). O remetente de teste `onboarding@resend.dev`
//            só entrega para o dono da conta e NÃO serve para o evento.
//  - smtp    (plano B): SMTP de um Gmail dedicado (senha de app), cerca de 500 destinatários por dia. Só esta função muda.
//  - console (desenvolvimento): imprime o código no log do servidor, sem enviar nada.
//
// O "From" usa o ENDEREÇO do EMAIL_FROM e o NOME do evento (src/lib/remetente.ts): cada evento manda com o próprio nome.

/** `nomeRemetente`: nome do evento, que vira o nome do "From" (o endereço é sempre o do EMAIL_FROM). */
export type MensagemEmail = { para: string; assunto: string; texto: string; html: string; nomeRemetente?: string | null };

function remetente(m: MensagemEmail): string {
  return montarRemetente(env.emailRemetente, m.nomeRemetente);
}

async function enviarPeloResend(m: MensagemEmail): Promise<void> {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: remetente(m), to: [m.para], subject: m.assunto, text: m.texto, html: m.html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`Resend respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
}

async function enviarPorSmtp(m: MensagemEmail): Promise<void> {
  const { host, port, secure, user, pass } = env.smtp;
  const transporte = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  await transporte.sendMail({ from: remetente(m), to: m.para, subject: m.assunto, text: m.texto, html: m.html });
}

export type MensagemEnviada = MensagemEmail & { de: string };

const global = globalThis as unknown as {
  __vaivotaCaixaDeSaida?: MensagemEnviada[];
  __vaivotaFalharEnvio?: boolean;
  __vaivotaEnvioDoEvento?: AsyncLocalStorage<EnvioDoEvento>;
};

/** Só no provedor `console` (desenvolvimento e testes): o que foi "enviado", para os testes lerem o código. */
export function caixaDeSaida(): MensagemEnviada[] {
  global.__vaivotaCaixaDeSaida ??= [];
  return global.__vaivotaCaixaDeSaida;
}

/** Só nos testes (provedor `console`, fora de produção): faz os próximos envios falharem, como um Resend fora do ar. */
export function simularFalhaNoEnvio(ligado: boolean) {
  global.__vaivotaFalharEnvio = ligado;
}

export async function enviarEmail(m: MensagemEmail): Promise<void> {
  const provedor = env.emailProvedor;
  if (provedor === "console") {
    if (process.env.NODE_ENV !== "production") {
      if (global.__vaivotaFalharEnvio) throw new Error("falha simulada no envio (testes)");
      caixaDeSaida().push({ ...m, de: remetente(m) });
    }
    console.info(`[e-mail:console] de ${remetente(m)} para ${m.para} | ${m.assunto}\n${m.texto}`);
    return;
  }
  if (provedor === "smtp") return enviarPorSmtp(m);
  return enviarPeloResend(m);
}

// ─────────────────────────────────────────────
// Envio dentro de um fluxo de acesso
// ─────────────────────────────────────────────
//
// O Better Auth manda o código "em segundo plano" e engole o erro: sem isto a tela diria "código enviado" mesmo com o
// Resend recusando. Dentro de `comEnvioDoEvento`, o envio é guardado (auth.ts) e esperado aqui antes da resposta, e a
// falha volta para quem chamou. O contexto também leva o nome do evento até o remetente.
// Fica no globalThis: a instância do Better Auth é única por processo e sobrevive ao recarregamento do módulo em dev.

export type EnvioDoEvento = { nomeEvento: string | null; pendentes: Promise<unknown>[]; falhou: boolean };

function armazenamento(): AsyncLocalStorage<EnvioDoEvento> {
  global.__vaivotaEnvioDoEvento ??= new AsyncLocalStorage<EnvioDoEvento>();
  return global.__vaivotaEnvioDoEvento;
}

/** O fluxo de acesso em andamento (ou null fora de um). */
export function envioEmAndamento(): EnvioDoEvento | null {
  return armazenamento().getStore() ?? null;
}

/** Roda `fn` com o nome do evento no remetente e espera os e-mails que ela disparou. `enviado` é false se algum falhou. */
export async function comEnvioDoEvento<T>(nomeEvento: string | null, fn: () => Promise<T>): Promise<{ valor: T; enviado: boolean }> {
  const envio: EnvioDoEvento = { nomeEvento, pendentes: [], falhou: false };
  const valor = await armazenamento().run(envio, fn);
  // Um envio pode disparar outro (o cadastro chama a verificação, que chama o envio): espera até não sobrar nenhum.
  while (envio.pendentes.length > 0) await Promise.allSettled(envio.pendentes.splice(0));
  return { valor, enviado: !envio.falhou };
}

// ─────────────────────────────────────────────
// Modelos (mensagem curta, remetente com o nome do evento: ajuda a não cair no spam)
// ─────────────────────────────────────────────

export type TipoCodigo = "email-verification" | "forget-password" | "sign-in" | "change-email";

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function montarEmailCodigo(
  tipo: TipoCodigo,
  para: string,
  codigo: string,
  minutosValidade: number,
  nomeEvento: string | null = null,
): MensagemEmail {
  const recuperacao = tipo === "forget-password";
  const evento = nomeEvento?.trim() || null;
  const assunto =
    (recuperacao ? `${codigo} é o código para criar sua senha nova` : `${codigo} é o código para confirmar seu e-mail`) +
    (evento ? ` | ${evento}` : "");
  // O nome do evento vai numa linha própria, no topo ("no"/"na" dependeria do nome).
  const abertura = recuperacao ? "Use este código para criar uma senha nova:" : "Use este código para confirmar seu e-mail:";
  const rodape = `O código vale por ${minutosValidade} minutos. Se você não pediu, ignore esta mensagem.`;
  const texto = `${evento ? `${evento}\n\n` : ""}${abertura}\n\n${codigo}\n\n${rodape}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111827">` +
    (evento ? `<p style="font-size:14px;font-weight:600;color:#4b5563;margin:0 0 12px">${escapar(evento)}</p>` : "") +
    `<p style="font-size:16px;margin:0 0 16px">${escapar(abertura)}</p>` +
    `<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${escapar(codigo)}</p>` +
    `<p style="font-size:14px;color:#4b5563;margin:0">${escapar(rodape)}</p>` +
    `</div>`;
  return { para, assunto, texto, html, nomeRemetente: evento };
}
