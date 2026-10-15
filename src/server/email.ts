import "server-only";
import nodemailer from "nodemailer";
import { env } from "./env";

// Envio de e-mail (ST1). Dois provedores reais e um para desenvolvimento:
//  - resend  (principal): domínio próprio verificado no Resend (SPF/DKIM). O remetente de teste `onboarding@resend.dev`
//            só entrega para o dono da conta e NÃO serve para o evento.
//  - smtp    (plano B): SMTP de um Gmail dedicado (senha de app), cerca de 500 destinatários por dia. Só esta função muda.
//  - console (desenvolvimento): imprime o código no log do servidor, sem enviar nada.

export type MensagemEmail = { para: string; assunto: string; texto: string; html: string };

async function enviarPeloResend(m: MensagemEmail): Promise<void> {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailRemetente, to: [m.para], subject: m.assunto, text: m.texto, html: m.html }),
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
  await transporte.sendMail({ from: env.emailRemetente, to: m.para, subject: m.assunto, text: m.texto, html: m.html });
}

const global = globalThis as unknown as { __vaivotaCaixaDeSaida?: MensagemEmail[] };

/** Só no provedor `console` (desenvolvimento e testes): o que foi "enviado", para os testes lerem o código. */
export function caixaDeSaida(): MensagemEmail[] {
  global.__vaivotaCaixaDeSaida ??= [];
  return global.__vaivotaCaixaDeSaida;
}

export async function enviarEmail(m: MensagemEmail): Promise<void> {
  const provedor = env.emailProvedor;
  if (provedor === "console") {
    if (process.env.NODE_ENV !== "production") caixaDeSaida().push(m);
    console.info(`[e-mail:console] para ${m.para} | ${m.assunto}\n${m.texto}`);
    return;
  }
  if (provedor === "smtp") return enviarPorSmtp(m);
  return enviarPeloResend(m);
}

// ─────────────────────────────────────────────
// Modelos (mensagem curta, remetente com o nome do evento: ajuda a não cair no spam)
// ─────────────────────────────────────────────

export type TipoCodigo = "email-verification" | "forget-password" | "sign-in" | "change-email";

function escapar(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function montarEmailCodigo(tipo: TipoCodigo, para: string, codigo: string, minutosValidade: number): MensagemEmail {
  const recuperacao = tipo === "forget-password";
  const assunto = recuperacao ? `${codigo} é o código para criar sua senha nova` : `${codigo} é o código para confirmar seu e-mail`;
  const abertura = recuperacao ? "Use este código para criar uma senha nova:" : "Use este código para confirmar seu e-mail:";
  const rodape = `O código vale por ${minutosValidade} minutos. Se você não pediu, ignore esta mensagem.`;
  const texto = `${abertura}\n\n${codigo}\n\n${rodape}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#111827">` +
    `<p style="font-size:16px;margin:0 0 16px">${escapar(abertura)}</p>` +
    `<p style="font-size:34px;font-weight:700;letter-spacing:8px;margin:0 0 16px">${escapar(codigo)}</p>` +
    `<p style="font-size:14px;color:#4b5563;margin:0">${escapar(rodape)}</p>` +
    `</div>`;
  return { para, assunto, texto, html };
}
