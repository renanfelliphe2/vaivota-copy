import "server-only";
import { APIError } from "better-auth/api";
import type { AcaoAuditoria } from "@/dominio/tipos";
import {
  canonicoGmail,
  normalizarEmail,
  validarCodigoLogin,
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarSenha,
} from "@/lib/validarAcesso";
import { registrarAuditoria } from "./auditoria";
import { auth } from "./auth";
import { db } from "./db";
import { hashDoIp } from "./ip";
import { manutencaoSeNecessario } from "./manutencao";
import {
  BLOQUEIO_SENHA_MS,
  chaveDeEmail,
  consumirJanela,
  reservarTentativaDeSenha,
  zerarRecusasDeSenha,
} from "./limites";
import { garantirParticipacao } from "./participacao";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";

// ST1: fluxos de e-mail e senha sobre o Better Auth, com bloqueio por tentativas, limite de envio de código e auditoria.
// Nenhum devolve se uma conta existe, exceto o cadastro com e-mail já usado (a tela pede "entre" nesse caso).

/** Contexto da requisição: cabeçalhos (cookie, IP) e os `Set-Cookie` que a resposta precisa repassar ao navegador. */
export type ContextoAcesso = { headers: Headers; ip: string; cookies: string[] };

export const COOLDOWN_REENVIO_MS = 30_000;
const MENSAGEM_LOGIN_RECUSADO = "E-mail ou senha incorretos.";
const MENSAGEM_CODIGO_RECUSADO = "Código incorreto ou expirado.";
const MENSAGEM_CODIGOS_ESGOTADOS = "Muitas tentativas com este código. Peça um código novo.";

// Limites por pessoa (e-mail) e por IP. O IP é MUITO generoso de propósito: o público de um evento divide o mesmo Wi-Fi
// (ou o mesmo NAT da operadora), e centenas de pessoas se cadastrando nos primeiros minutos vêm do mesmo endereço. O
// limite que protege de verdade é o por e-mail; o do IP só barra uma máquina disparando milhares de pedidos.
const LIMITE_CODIGOS_POR_EMAIL_HORA = 8;
const LIMITE_ENVIOS_POR_IP_10MIN = 3000;
const LIMITE_CADASTROS_POR_IP_10MIN = 3000;
const LIMITE_LOGINS_POR_IP_MINUTO = 1500;
const LIMITE_TENTATIVAS_CODIGO_POR_IP_MINUTO = 1500;

// ─────────────────────────────────────────────
// Apoio
// ─────────────────────────────────────────────

type ErroBetterAuth = { status: number; codigo: string | null };

function lerErro(e: unknown): ErroBetterAuth | null {
  if (e instanceof APIError) {
    const corpo = e.body as { code?: string } | undefined;
    return { status: e.statusCode, codigo: corpo?.code ?? null };
  }
  return null;
}

async function eventoDoAcesso(eventoId: string) {
  return db().evento.findUnique({ where: { id: eventoId }, select: { id: true, slug: true, estado: true, metodoIdentificacao: true } });
}

function guardarCookies(ctx: ContextoAcesso, headers: Headers | undefined) {
  if (!headers) return;
  for (const cookie of headers.getSetCookie()) ctx.cookies.push(cookie);
}

async function auditarBloqueio(ctx: ContextoAcesso, eventoId: string, alvo: string, segundos: number | null) {
  await registrarAuditoria(db(), {
    eventoId,
    usuarioId: null,
    acao: "BLOQUEIO_RATE_LIMIT" satisfies AcaoAuditoria,
    entidade: alvo === "SENHA" ? "login" : "codigo_login",
    detalhes: { alvo, ...(segundos !== null ? { segundos } : {}) },
    ipHash: hashDoIp(ctx.ip),
  });
}

/** Limite por IP (generoso) e por e-mail. Devolve a falha pronta, ou null se pode seguir. */
async function limitarEnvioDeCodigo(ctx: ContextoAcesso, email: string, tipo: string) {
  const porIp = await consumirJanela(`ip:codigo:${ctx.ip}`, { max: LIMITE_ENVIOS_POR_IP_10MIN, janelaMs: 10 * 60_000 });
  if (!porIp.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porIp.restanteSegundos } });
  const cooldown = await consumirJanela(chaveDeEmail(`codigo:${tipo}`, email), { max: 1, janelaMs: COOLDOWN_REENVIO_MS });
  if (!cooldown.permitido) return falha("CONFLITO");
  const porHora = await consumirJanela(chaveDeEmail("codigo-hora", email), { max: LIMITE_CODIGOS_POR_EMAIL_HORA, janelaMs: 60 * 60_000 });
  if (!porHora.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porHora.restanteSegundos } });
  return null;
}

type Campos = Record<string, string>;

function validarCredenciais(email: string, senha: string): Campos {
  const campos: Campos = {};
  const erroEmail = validarEmail(email);
  if (erroEmail) campos.email = erroEmail;
  if (!senha) campos.senha = "Informe a senha.";
  return campos;
}

// ─────────────────────────────────────────────
// Entrar
// ─────────────────────────────────────────────

/**
 * Login com e-mail e senha. Conta inexistente, conta só do Google e senha errada dão a mesma mensagem. Cinco recusas
 * seguidas bloqueiam o e-mail por 60 s. Cria a participação PUBLICO se faltar (ou ADMIN, se há convite de admin).
 */
export async function entrar(
  ctx: ContextoAcesso,
  entrada: { eventoId: string; email: string; senha: string },
): Promise<Resultado<{ emailVerificado: true }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
  const campos = validarCredenciais(entrada.email, entrada.senha);
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });
  if (evento.metodoIdentificacao === "SOMENTE_GOOGLE")
    return falha("VALIDACAO", { campos: { email: "Este evento aceita só a entrada com Google." } });

  const email = normalizarEmail(entrada.email);
  const porIp = await consumirJanela(`ip:login:${ctx.ip}`, { max: LIMITE_LOGINS_POR_IP_MINUTO, janelaMs: 60_000 });
  if (!porIp.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porIp.restanteSegundos } });
  // Reserva a tentativa antes de verificar a senha (atômico): uma rajada simultânea não passa toda pela verificação.
  const reserva = await reservarTentativaDeSenha(email);
  if (!reserva.permitido) {
    if (reserva.primeiraRecusa) await auditarBloqueio(ctx, evento.id, "SENHA", BLOQUEIO_SENHA_MS / 1000);
    return falha("LIMITE_TENTATIVAS", { parametros: { n: reserva.restanteSegundos } });
  }

  let usuarioId: string;
  try {
    const r = await auth().api.signInEmail({ body: { email, password: entrada.senha }, headers: ctx.headers, returnHeaders: true });
    guardarCookies(ctx, r.headers);
    usuarioId = r.response.user.id;
  } catch (e) {
    const erro = lerErro(e);
    if (erro?.status === 403) {
      // Senha certa, e-mail ainda não confirmado: manda um código novo (respeitando o limite) e leva à confirmação.
      await enviarCodigoDeVerificacao(ctx, email);
      return falha("EMAIL_NAO_VERIFICADO", { detalhe: "login com e-mail não verificado" });
    }
    if (erro && erro.status < 500) {
      return falha("CREDENCIAIS_INVALIDAS", {
        mensagem: MENSAGEM_LOGIN_RECUSADO,
        detalhe: `login recusado (${erro.codigo ?? erro.status})`,
      });
    }
    return falhaInterna(e, "entrar");
  }

  await zerarRecusasDeSenha(email);
  const participacao = await garantirParticipacao({ id: usuarioId, nome: "", email, emailVerificado: true }, evento.id);
  if (!participacao.ok) return participacao;
  return sucesso({ emailVerificado: true });
}

// ─────────────────────────────────────────────
// Registrar
// ─────────────────────────────────────────────

export type DadosRegistro = { nome: string; email: string; senha: string; confirmacaoSenha: string; aceite: boolean };

/**
 * Cria a conta e envia o código de confirmação do e-mail. NÃO abre a sessão: ela só nasce quando o código é confirmado
 * (sem isso, contas falsas permitiriam votos repetidos). Uma conta antiga que nunca confirmou o e-mail é substituída.
 */
export async function registrar(
  ctx: ContextoAcesso,
  entrada: { eventoId: string } & DadosRegistro,
): Promise<Resultado<{ email: string }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });

  const campos: Campos = {};
  const erroNome = validarNome(entrada.nome);
  const erroEmail = validarEmail(entrada.email);
  const erroSenha = validarSenha(entrada.senha);
  const erroConfirmacao = erroSenha ? null : validarConfirmacaoSenha(entrada.senha, entrada.confirmacaoSenha);
  if (erroNome) campos.nome = erroNome;
  if (erroEmail) campos.email = erroEmail;
  if (erroSenha) campos.senha = erroSenha;
  if (erroConfirmacao) campos.confirmacaoSenha = erroConfirmacao;
  if (!entrada.aceite) campos.aceite = "Marque a caixa para continuar.";
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  if (evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (evento.metodoIdentificacao === "SOMENTE_GOOGLE")
    return falha("VALIDACAO", { campos: { email: "Este evento aceita só a entrada com Google." } });

  const email = normalizarEmail(entrada.email);
  // Antes de ativar o evento só cria conta quem a organização convidou como admin (`promover-admin`): é como o primeiro
  // admin entra para poder ativar o evento. O público espera a ativação.
  if (evento.estado !== "ATIVO") {
    const convite = await db().conviteAdmin.findUnique({ where: { eventoId_email: { eventoId: evento.id, email } }, select: { estado: true } });
    if (convite?.estado !== "PENDENTE") return falha("EVENTO_INDISPONIVEL");
  }
  await manutencaoSeNecessario();
  const porIp = await consumirJanela(`ip:registro:${ctx.ip}`, { max: LIMITE_CADASTROS_POR_IP_10MIN, janelaMs: 10 * 60_000 });
  if (!porIp.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porIp.restanteSegundos } });

  const existente = await db().usuario.findUnique({ where: { email }, select: { id: true, emailVerificado: true } });
  if (existente?.emailVerificado) return falha("CADASTRO_NAO_CONCLUIDO", { detalhe: "e-mail já cadastrado" });
  // Mesmo e-mail com outra grafia no Gmail (pontos e +etiqueta chegam na mesma caixa): uma caixa, uma conta, um voto.
  const canonico = canonicoGmail(email);
  if (canonico) {
    const parecida = await db().$queryRaw<{ id: string }[]>`
      SELECT id FROM usuario
      WHERE email_verificado = true AND email <> ${email}
        AND split_part(email, '@', 2) IN ('gmail.com', 'googlemail.com')
        AND replace(split_part(split_part(email, '@', 1), '+', 1), '.', '') = ${canonico}
      LIMIT 1`;
    if (parecida.length > 0) return falha("CADASTRO_NAO_CONCLUIDO", { detalhe: "variação de um e-mail do Gmail já cadastrado" });
  }
  if (existente) {
    // Há um cadastro em andamento com código ainda valendo: NÃO se substitui a conta enquanto o código vive. Senão, quem
    // chegasse segundo trocaria a senha da conta que a primeira pessoa está prestes a confirmar (e confirmaria por ela).
    const codigoVivo = await db().verification.findFirst({
      where: { identifier: `email-verification-otp-${email}`, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (codigoVivo)
      return falha("CONFLITO", {
        mensagem:
          "Já existe um cadastro em andamento com este e-mail. Se foi você, entre com seu e-mail e senha para receber um código novo. Se não foi, aguarde 10 minutos e tente de novo.",
        detalhe: "registro sobre cadastro pendente com código vivo",
      });
  }
  // O limite vem ANTES de apagar a conta antiga: quem só quer incomodar não derruba o cadastro em andamento de outra pessoa.
  const limite = await limitarEnvioDeCodigo(ctx, email, "verificacao");
  if (limite) return limite;
  if (existente) {
    // Cadastro abandonado (e-mail nunca confirmado): a conta nova substitui a antiga, para a senha digitada valer.
    const comParticipacao = await db().participacao.count({ where: { usuarioId: existente.id } });
    if (comParticipacao === 0) await db().usuario.delete({ where: { id: existente.id } });
    else return falha("CADASTRO_NAO_CONCLUIDO", { detalhe: "conta não confirmada, mas já com participação" });
  }

  try {
    await auth().api.signUpEmail({ body: { name: entrada.nome.trim(), email, password: entrada.senha }, headers: ctx.headers });
  } catch (e) {
    const erro = lerErro(e);
    if (erro && erro.status < 500) return falha("CADASTRO_NAO_CONCLUIDO", { detalhe: `cadastro recusado (${erro.codigo ?? erro.status})` });
    return falhaInterna(e, "registrar");
  }
  return sucesso({ email });
}

// ─────────────────────────────────────────────
// Códigos por e-mail
// ─────────────────────────────────────────────

/** Envia o código de confirmação do e-mail, respeitando o cooldown. Falha de limite não aparece ao usuário. */
async function enviarCodigoDeVerificacao(ctx: ContextoAcesso, email: string) {
  const limite = await limitarEnvioDeCodigo(ctx, email, "verificacao");
  if (limite) return limite;
  try {
    await auth().api.sendVerificationOTP({ body: { email, type: "email-verification" }, headers: ctx.headers });
  } catch (e) {
    return falhaInterna(e, "enviarCodigoDeVerificacao");
  }
  return null;
}

function falhaDeCodigo(e: unknown, contexto: string) {
  const erro = lerErro(e);
  if (erro?.codigo === "TOO_MANY_ATTEMPTS") return { tipo: "ESGOTADO" as const };
  if (erro && erro.status < 500) return { tipo: "RECUSADO" as const };
  return { tipo: "INTERNO" as const, resposta: falhaInterna(e, contexto) };
}

/**
 * Confirma o e-mail de quem acabou de se cadastrar: abre a sessão e cria a participação. Cinco códigos errados seguidos
 * invalidam o código (é preciso pedir outro, que tem limite próprio).
 */
export async function confirmarCodigo(
  ctx: ContextoAcesso,
  entrada: { eventoId: string; email: string; codigo: string },
): Promise<Resultado<{ emailVerificado: true }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
  const erroFormato = validarCodigoLogin(entrada.codigo);
  if (erroFormato) return falha("VALIDACAO", { campos: { codigo: erroFormato } });
  const erroEmail = validarEmail(entrada.email);
  if (erroEmail) return falha("VALIDACAO", { campos: { email: erroEmail } });

  const email = normalizarEmail(entrada.email);
  const porIp = await consumirJanela(`ip:otp:${ctx.ip}`, { max: LIMITE_TENTATIVAS_CODIGO_POR_IP_MINUTO, janelaMs: 60_000 });
  if (!porIp.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porIp.restanteSegundos } });

  let usuarioId: string;
  try {
    const r = await auth().api.verifyEmailOTP({ body: { email, otp: entrada.codigo.trim() }, headers: ctx.headers, returnHeaders: true });
    guardarCookies(ctx, r.headers);
    usuarioId = r.response.user.id;
  } catch (e) {
    const f = falhaDeCodigo(e, "confirmarCodigo");
    if (f.tipo === "INTERNO") return f.resposta;
    if (f.tipo === "ESGOTADO") {
      await auditarBloqueio(ctx, evento.id, "CODIGO_LOGIN", null);
      return falha("LIMITE_TENTATIVAS", { mensagem: MENSAGEM_CODIGOS_ESGOTADOS, detalhe: "código de confirmação esgotado" });
    }
    return falha("CREDENCIAIS_INVALIDAS", { mensagem: MENSAGEM_CODIGO_RECUSADO, detalhe: "código de confirmação recusado" });
  }

  const participacao = await garantirParticipacao({ id: usuarioId, nome: "", email, emailVerificado: true }, evento.id);
  if (!participacao.ok) return participacao;
  return sucesso({ emailVerificado: true });
}

/** Reenvia o código (verificação ou recuperação), com cooldown de 30 s por e-mail. */
export async function reenviarCodigo(
  ctx: ContextoAcesso,
  entrada: { eventoId: string; email: string; tipo: "verificacao" | "recuperacao" },
): Promise<Resultado<{ ateMs: number }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
  const erroEmail = validarEmail(entrada.email);
  if (erroEmail) return falha("VALIDACAO", { campos: { email: erroEmail } });
  const email = normalizarEmail(entrada.email);

  const limite = await limitarEnvioDeCodigo(ctx, email, entrada.tipo);
  if (limite) return limite;
  try {
    if (entrada.tipo === "recuperacao") await auth().api.requestPasswordResetEmailOTP({ body: { email }, headers: ctx.headers });
    else await auth().api.sendVerificationOTP({ body: { email, type: "email-verification" }, headers: ctx.headers });
  } catch (e) {
    return falhaInterna(e, "reenviarCodigo");
  }
  return sucesso({ ateMs: Date.now() + COOLDOWN_REENVIO_MS });
}

// ─────────────────────────────────────────────
// Recuperação de senha
// ─────────────────────────────────────────────

/** Passo 1: envia o código. E-mail desconhecido tem o mesmo comportamento (não revela se a conta existe). */
export async function solicitarRecuperacao(
  ctx: ContextoAcesso,
  entrada: { eventoId: string; email: string },
): Promise<Resultado<{ email: string; ateMs: number }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
  const erroEmail = validarEmail(entrada.email);
  if (erroEmail) return falha("VALIDACAO", { campos: { email: erroEmail } });
  const email = normalizarEmail(entrada.email);

  const limite = await limitarEnvioDeCodigo(ctx, email, "recuperacao");
  if (limite) {
    // Cooldown ou limite horário: a tela segue para o passo do código com o aviso de reenvio (sem revelar nada).
    return limite.erro.codigo === "CONFLITO" ? sucesso({ email, ateMs: Date.now() + COOLDOWN_REENVIO_MS }) : limite;
  }
  try {
    await auth().api.requestPasswordResetEmailOTP({ body: { email }, headers: ctx.headers });
  } catch (e) {
    return falhaInterna(e, "solicitarRecuperacao");
  }
  return sucesso({ email, ateMs: Date.now() + COOLDOWN_REENVIO_MS });
}

/** Passo 2: código + senha nova. Grava a senha, confirma o e-mail e já entra. */
export async function redefinirSenha(
  ctx: ContextoAcesso,
  entrada: { eventoId: string; email: string; codigo: string; senha: string; confirmacaoSenha: string },
): Promise<Resultado<{ emailVerificado: true }>> {
  const evento = await eventoDoAcesso(entrada.eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });

  const campos: Campos = {};
  const erroCodigo = validarCodigoLogin(entrada.codigo);
  const erroSenha = validarSenha(entrada.senha);
  const erroConfirmacao = erroSenha ? null : validarConfirmacaoSenha(entrada.senha, entrada.confirmacaoSenha);
  if (erroCodigo) campos.codigo = erroCodigo;
  if (erroSenha) campos.senha = erroSenha;
  if (erroConfirmacao) campos.confirmacaoSenha = erroConfirmacao;
  if (validarEmail(entrada.email)) campos.email = "Informe um e-mail válido.";
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  const email = normalizarEmail(entrada.email);
  const porIp = await consumirJanela(`ip:otp:${ctx.ip}`, { max: LIMITE_TENTATIVAS_CODIGO_POR_IP_MINUTO, janelaMs: 60_000 });
  if (!porIp.permitido) return falha("LIMITE_TENTATIVAS", { parametros: { n: porIp.restanteSegundos } });

  try {
    await auth().api.resetPasswordEmailOTP({ body: { email, otp: entrada.codigo.trim(), password: entrada.senha }, headers: ctx.headers });
  } catch (e) {
    const f = falhaDeCodigo(e, "redefinirSenha");
    if (f.tipo === "INTERNO") return f.resposta;
    if (f.tipo === "ESGOTADO") {
      await auditarBloqueio(ctx, evento.id, "CODIGO_LOGIN", null);
      return falha("LIMITE_TENTATIVAS", { mensagem: MENSAGEM_CODIGOS_ESGOTADOS, detalhe: "código de recuperação esgotado" });
    }
    return falha("CREDENCIAIS_INVALIDAS", { mensagem: MENSAGEM_CODIGO_RECUSADO, detalhe: "código de recuperação recusado" });
  }

  await zerarRecusasDeSenha(email);
  let usuarioId: string;
  try {
    const r = await auth().api.signInEmail({ body: { email, password: entrada.senha }, headers: ctx.headers, returnHeaders: true });
    guardarCookies(ctx, r.headers);
    usuarioId = r.response.user.id;
  } catch (e) {
    return falhaInterna(e, "redefinirSenha: entrar com a senha nova");
  }
  const participacao = await garantirParticipacao({ id: usuarioId, nome: "", email, emailVerificado: true }, evento.id);
  if (!participacao.ok) return participacao;
  return sucesso({ emailVerificado: true });
}

// ─────────────────────────────────────────────
// Sair
// ─────────────────────────────────────────────

export async function sair(ctx: ContextoAcesso): Promise<Resultado<null>> {
  try {
    const r = await auth().api.signOut({ headers: ctx.headers, returnHeaders: true });
    guardarCookies(ctx, r.headers);
  } catch (e) {
    return falhaInterna(e, "sair");
  }
  return sucesso(null);
}
