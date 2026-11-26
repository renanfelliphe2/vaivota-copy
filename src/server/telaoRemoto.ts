import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { Prisma, type Evento } from "@/generated/prisma/client";
import { gerarCodigo, normalizarCodigo, validarFormatoCodigo } from "@/lib/codigos";
import {
  SEM_SINAL_REMOTO_MS,
  type ComandoTelao,
  type ConsultaTelaoRemoto,
  type CopiaApresentacao,
  type EstadoTelao,
  type ModoPalco,
  type SinalTelaoPareado,
  type StatusTelaoRemoto,
} from "@/dominio/telaoRemoto";
import { registrarAuditoria } from "./auditoria";
import { cookieDeAparelho, gerarToken, hashDoToken, tokenDoCookie } from "./credenciaisTotem";
import { db } from "./db";
import { env } from "./env";
import { hashDoIp } from "./ip";
import { chaveDe, consumirEmMemoria, reservarTentativa, zerarTentativas } from "./limites";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Telão em outro aparelho (25/11/2026). O palco aberto pelo admin mostra um código; outro aparelho o digita em
// /e/<slug>/telao/parear e vira o telão, comandado pelo controle remoto do navegador que gerou o código. Como o totem, o aparelho
// não tem login: o pareamento grava um token num cookie HttpOnly e o banco guarda só o hash. O token só abre as leituras do telão
// deste evento (`exigirAdminOuTelao`) enquanto a sessão estiver PAREADO e o aparelho tiver dado sinal nas últimas horas.
// Ida e volta por polling: o telão manda um sinal por segundo (o que mostra) e recebe os botões apertados desde o último; o
// controle pergunta o estado do telão. A apresentação (`ui.apresentacao`: modo, avanço, progresso da revelação) é copiada nos dois
// sentidos, com a versão subindo a cada escrita.

export const COOKIE_TELAO = "vaivota_telao";
/** O servidor encerra a sessão antes disso (sem sinal por VALIDADE_SEM_SINAL_MS); o cookie só não pode vencer no meio do evento. */
const VALIDADE_COOKIE_S = 7 * 24 * 60 * 60;
/** O aparelho fechado por tanto tempo perde o pareamento: um computador do local não guarda acesso ao resultado para sempre. */
const VALIDADE_SEM_SINAL_MS = 12 * 60 * 60_000;
/** Código mostrado e nunca usado sai de circulação depois de um dia (o palco gera outro sozinho). */
const VALIDADE_CODIGO_MS = 24 * 60 * 60_000;
/** Botão apertado com o telão sem internet não dispara quando ele volta: só valem os comandos recentes. */
const VALIDADE_COMANDO_MS = 15_000;
/** O sinal sai a cada segundo (e a cada mudança): o teto só barra um laço. */
const SINAIS_POR_MINUTO = 400;
const COMANDOS_POR_MINUTO = 120;
const PAREAMENTOS_POR_IP_POR_MINUTO = 60;
/** A cópia de `ui.apresentacao` é pequena (algumas centenas de bytes); o teto barra lixo. */
export const LIMITE_APRESENTACAO_BYTES = 4000;

type LinhaTelao = {
  id: string;
  eventoId: string;
  criadoPorId: string;
  codigo: string | null;
  estado: "AGUARDANDO" | "PAREADO" | "ENCERRADO";
  instancia: string | null;
  modo: Prisma.JsonValue;
  apresentacao: Prisma.JsonValue;
  versaoApresentacao: number;
  estadoPalco: Prisma.JsonValue;
  ultimoSinalEm: Date | null;
  criadoEm: Date;
};

const SELECAO = {
  id: true,
  eventoId: true,
  criadoPorId: true,
  codigo: true,
  estado: true,
  instancia: true,
  modo: true,
  apresentacao: true,
  versaoApresentacao: true,
  estadoPalco: true,
  ultimoSinalEm: true,
  criadoEm: true,
} as const;

/** HMAC do código normalizado, por evento. O prefixo separa do código do totem: um nunca vale pelo outro. */
function hashDoCodigoTelao(eventoId: string, codigo: string): string {
  return createHmac("sha256", env.authSecret).update(`telao:${eventoId}:${normalizarCodigo(codigo)}`).digest("hex");
}

/** Sorteio com `crypto` (nunca Math.random): um número em [0, 1). */
function sorteio(): number {
  return randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;
}

function lerModo(v: Prisma.JsonValue): ModoPalco {
  if (v && typeof v === "object" && !Array.isArray(v) && v.tipo === "ENSAIO" && typeof v.cenarioId === "string") return { tipo: "ENSAIO", cenarioId: v.cenarioId };
  return { tipo: "REAL" };
}

const mesmoModo = (a: ModoPalco, b: ModoPalco) => a.tipo === b.tipo && (a.tipo === "REAL" || a.cenarioId === (b as { cenarioId: string }).cenarioId);

function json(v: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue);
}

/** Pareado e com sinal recente (ou recém-pareado). Fora disso o token não vale mais nada. */
function pareadoVigente(t: Pick<LinhaTelao, "estado" | "ultimoSinalEm">, agora: number): boolean {
  return t.estado === "PAREADO" && t.ultimoSinalEm !== null && agora - t.ultimoSinalEm.getTime() < VALIDADE_SEM_SINAL_MS;
}

function situacaoVista(t: LinhaTelao, agora: number): StatusTelaoRemoto["situacao"] {
  if (t.estado === "PAREADO") return pareadoVigente(t, agora) ? "PAREADO" : "ENCERRADO";
  if (t.estado === "AGUARDANDO" && agora - t.criadoEm.getTime() >= VALIDADE_CODIGO_MS) return "ENCERRADO";
  return t.estado;
}

function statusDe(t: LinhaTelao, agora: number): StatusTelaoRemoto {
  const situacao = situacaoVista(t, agora);
  return {
    id: t.id,
    situacao,
    codigo: situacao === "AGUARDANDO" ? t.codigo : null,
    sinalHaMs: t.ultimoSinalEm ? Math.max(0, agora - t.ultimoSinalEm.getTime()) : null,
  };
}

function copiaDe(t: Pick<LinhaTelao, "apresentacao" | "versaoApresentacao">, versaoConhecida: number): CopiaApresentacao | null {
  return t.versaoApresentacao > versaoConhecida && t.apresentacao !== null ? { versao: t.versaoApresentacao, dados: t.apresentacao } : null;
}

// ─────────────────────────────────────────────
// Lado do admin (o palco que mostra o código e o controle remoto)
// ─────────────────────────────────────────────

async function sessaoDoAdmin(usuario: UsuarioSessao | null, eventoId: string, id: string) {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const telao = await db().telaoRemoto.findFirst({ where: { id, eventoId }, select: SELECAO });
  if (!telao) return falha("NAO_ENCONTRADO", { detalhe: `telão remoto ${id} não existe no evento` });
  return sucesso({ ...admin.dados, telao: telao as LinhaTelao });
}

/**
 * O palco do admin abriu (ou quer mostrar o código). Com `id` de uma sessão ainda viva, devolve a mesma (e passa a ela o modo
 * do palco: trocar de modo na sala e apresentar de novo muda também o telão do outro aparelho). Sem `id`, ou com uma sessão já
 * encerrada, só cria outra se `criar`: o código nasce quando o admin pede para vê-lo, nunca sozinho na tela do telão.
 */
export async function prepararTelaoRemoto(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string; id: string | null; modo: ModoPalco; apresentacao: unknown; criar: boolean },
): Promise<Resultado<StatusTelaoRemoto | null>> {
  const admin = await exigirAdmin(usuario, entrada.eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const { eventoId, modo } = entrada;
  try {
    const agora = Date.now();
    if (entrada.id) {
      const atual = (await db().telaoRemoto.findFirst({ where: { id: entrada.id, eventoId }, select: SELECAO })) as LinhaTelao | null;
      if (atual && situacaoVista(atual, agora) !== "ENCERRADO") {
        const trocarModo = !mesmoModo(lerModo(atual.modo), modo);
        // Antes do pareamento, a cópia acompanha o palco; depois, quem escreve são os dois lados (espelharApresentacaoTelao).
        const copiar = atual.estado === "AGUARDANDO" && entrada.apresentacao !== null;
        if (trocarModo || copiar) {
          await db().telaoRemoto.update({
            where: { id: atual.id },
            data: {
              ...(trocarModo ? { modo: modo as Prisma.InputJsonValue } : {}),
              ...(copiar ? { apresentacao: json(entrada.apresentacao), versaoApresentacao: { increment: 1 } } : {}),
            },
          });
        }
        return sucesso(statusDe(atual, agora));
      }
      if (atual && atual.estado !== "ENCERRADO") await encerrar(atual.id);
    }
    if (!entrada.criar) return sucesso(null);

    // Arrumação: códigos deste evento mostrados e nunca usados saem de circulação.
    await db().telaoRemoto.updateMany({
      where: { eventoId, estado: "AGUARDANDO", criadoEm: { lt: new Date(agora - VALIDADE_CODIGO_MS) } },
      data: { estado: "ENCERRADO", codigo: null },
    });
    let codigo = gerarCodigo(sorteio);
    let hash = hashDoCodigoTelao(eventoId, codigo);
    for (let tentativas = 0; await db().telaoRemoto.findUnique({ where: { eventoId_hashCodigo: { eventoId, hashCodigo: hash } }, select: { id: true } }); tentativas++) {
      if (tentativas >= 5) throw new Error("não foi possível sortear um código de telão livre");
      codigo = gerarCodigo(sorteio);
      hash = hashDoCodigoTelao(eventoId, codigo);
    }
    const criado = await db().telaoRemoto.create({
      data: {
        eventoId,
        criadoPorId: usuarioId,
        hashCodigo: hash,
        codigo,
        modo: modo as Prisma.InputJsonValue,
        apresentacao: json(entrada.apresentacao),
        versaoApresentacao: entrada.apresentacao === null ? 0 : 1,
      },
      select: SELECAO,
    });
    return sucesso(statusDe(criado as LinhaTelao, agora));
  } catch (e) {
    return falhaInterna(e, "prepararTelaoRemoto");
  }
}

async function encerrar(id: string): Promise<void> {
  await db().telaoRemoto.update({ where: { id }, data: { estado: "ENCERRADO", codigo: null } });
}

/** Polling do controle remoto (e do palco que mostra o código): a situação, o que o telão mostra e a apresentação, se mudou. */
export async function consultarTelaoRemoto(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string; id: string; versaoApresentacao: number },
): Promise<Resultado<ConsultaTelaoRemoto>> {
  try {
    const r = await sessaoDoAdmin(usuario, entrada.eventoId, entrada.id);
    if (!r.ok) return r;
    const { telao } = r.dados;
    const agora = Date.now();
    const status = statusDe(telao, agora);
    const comSinal = status.situacao === "PAREADO" && status.sinalHaMs !== null && status.sinalHaMs < SEM_SINAL_REMOTO_MS;
    return sucesso({
      ...status,
      palco: comSinal ? (telao.estadoPalco as EstadoTelao | null) : null,
      apresentacao: status.situacao === "ENCERRADO" ? null : copiaDe(telao, entrada.versaoApresentacao),
    });
  } catch (e) {
    return falhaInterna(e, "consultarTelaoRemoto");
  }
}

/** Um botão do controle remoto para o telão pareado. Só com o telão no ar: com a sessão à espera, não há quem execute. */
export async function comandarTelaoRemoto(usuario: UsuarioSessao | null, entrada: { eventoId: string; id: string; comando: ComandoTelao }): Promise<Resultado<null>> {
  if (!consumirEmMemoria(`telao-comando:${entrada.id}`, COMANDOS_POR_MINUTO, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const r = await sessaoDoAdmin(usuario, entrada.eventoId, entrada.id);
    if (!r.ok) return r;
    if (situacaoVista(r.dados.telao, Date.now()) !== "PAREADO")
      return falha("CONFLITO", { mensagem: "O telão do outro aparelho não está conectado.", detalhe: `comando com a sessão ${r.dados.telao.estado}` });
    await db().comandoTelao.create({ data: { telaoId: entrada.id, comando: entrada.comando } });
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "comandarTelaoRemoto");
  }
}

/** A apresentação mudou do lado do admin (a sala trocou o avanço, recomeçou a revelação...). Devolve a versão gravada. */
export async function espelharApresentacaoTelao(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string; id: string; apresentacao: unknown },
): Promise<Resultado<{ versao: number }>> {
  try {
    const r = await sessaoDoAdmin(usuario, entrada.eventoId, entrada.id);
    if (!r.ok) return r;
    if (situacaoVista(r.dados.telao, Date.now()) === "ENCERRADO") return falha("CONFLITO", { detalhe: "apresentação para uma sessão encerrada" });
    const salvo = await db().telaoRemoto.update({
      where: { id: entrada.id },
      data: { apresentacao: json(entrada.apresentacao), versaoApresentacao: { increment: 1 } },
      select: { versaoApresentacao: true },
    });
    return sucesso({ versao: salvo.versaoApresentacao });
  } catch (e) {
    return falhaInterna(e, "espelharApresentacaoTelao");
  }
}

/**
 * Encerra a sessão: o código some e o aparelho pareado para na próxima consulta. Com `soSeAguardando` (o admin vai apresentar no
 * próprio computador, ou escondeu o código), só um código ainda não usado; um telão que acabou de parear continua, e o status
 * devolvido diz isso a quem chamou.
 */
export async function desconectarTelaoRemoto(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string; id: string; soSeAguardando: boolean },
  ctx: { ip: string },
): Promise<Resultado<StatusTelaoRemoto>> {
  try {
    const r = await sessaoDoAdmin(usuario, entrada.eventoId, entrada.id);
    if (!r.ok) return r;
    const { telao, usuarioId } = r.dados;
    const agora = Date.now();
    const permitidos = entrada.soSeAguardando ? (["AGUARDANDO"] as const) : (["AGUARDANDO", "PAREADO"] as const);
    const feito = await db().telaoRemoto.updateMany({ where: { id: telao.id, estado: { in: [...permitidos] } }, data: { estado: "ENCERRADO", codigo: null } });
    if (feito.count === 0) {
      const atual = (await db().telaoRemoto.findUniqueOrThrow({ where: { id: telao.id }, select: SELECAO })) as LinhaTelao;
      return sucesso(statusDe(atual, agora));
    }
    if (telao.estado === "PAREADO")
      await registrarAuditoria(db(), {
        eventoId: telao.eventoId,
        usuarioId,
        acao: "TELAO_REMOTO_DESCONECTADO",
        entidade: "telao_remoto",
        entidadeId: telao.id,
        ipHash: hashDoIp(ctx.ip),
      });
    return sucesso({ id: telao.id, situacao: "ENCERRADO", codigo: null, sinalHaMs: null });
  } catch (e) {
    return falhaInterna(e, "desconectarTelaoRemoto");
  }
}

// ─────────────────────────────────────────────
// Lado do aparelho pareado
// ─────────────────────────────────────────────

type ContextoAparelho = { headers: Headers; ip: string; cookies: string[] };

function hashDoCookie(headers: Headers): string | null {
  const token = tokenDoCookie(headers, COOKIE_TELAO);
  return token ? hashDoToken(token) : null;
}

/** O telão do cookie, se ainda vale. */
async function telaoDoCookie(headers: Headers): Promise<LinhaTelao | null> {
  const hash = hashDoCookie(headers);
  if (!hash) return null;
  const t = (await db().telaoRemoto.findUnique({ where: { hashToken: hash }, select: SELECAO })) as LinhaTelao | null;
  return t && pareadoVigente(t, Date.now()) ? t : null;
}

/**
 * Troca o código mostrado no palco por um token de longa duração, gravado no cookie deste aparelho. Cinco códigos errados bloqueiam
 * por 60 s; todo código recusado dá a mesma mensagem. Um aparelho que já era o telão de outra sessão deixa de ser.
 */
export async function parearTelao(ctx: ContextoAparelho, entrada: { eventoId: string; codigo: string }): Promise<Resultado<null>> {
  if (!consumirEmMemoria(`pareamento-telao-ip:${ctx.ip}`, PAREAMENTOS_POR_IP_POR_MINUTO, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const evento = await db().evento.findUnique({ where: { id: entrada.eventoId }, select: { id: true } });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    if (!validarFormatoCodigo(entrada.codigo)) return falha("VALIDACAO", { campos: { codigo: "Digite o código completo, no formato XXXX-XXXX." } });

    const chave = chaveDe("pareamento-telao", `${ctx.ip}:${evento.id}`);
    const reserva = await reservarTentativa(chave);
    const ipHash = hashDoIp(ctx.ip);
    if (!reserva.permitido) {
      if (reserva.primeiraRecusa)
        await registrarAuditoria(db(), {
          eventoId: evento.id,
          usuarioId: null,
          acao: "BLOQUEIO_RATE_LIMIT",
          entidade: "telao_remoto",
          detalhes: { alvo: "CODIGO_TELAO", segundos: 60 },
          ipHash,
        });
      return falha("LIMITE_TENTATIVAS", { parametros: { n: reserva.restanteSegundos } });
    }

    const hash = hashDoCodigoTelao(evento.id, entrada.codigo);
    const token = gerarToken();
    const agora = new Date();
    // UPDATE condicional: dois aparelhos com o mesmo código nunca passam.
    const tomado = await db().telaoRemoto.updateMany({
      where: { eventoId: evento.id, hashCodigo: hash, estado: "AGUARDANDO", criadoEm: { gte: new Date(agora.getTime() - VALIDADE_CODIGO_MS) } },
      data: { estado: "PAREADO", codigo: null, hashToken: hashDoToken(token), pareadoEm: agora, ultimoSinalEm: agora, instancia: null, estadoPalco: Prisma.DbNull },
    });
    if (tomado.count === 0) {
      await registrarAuditoria(db(), {
        eventoId: evento.id,
        usuarioId: null,
        acao: "TENTATIVA_CODIGO_INVALIDA",
        entidade: "telao_remoto",
        detalhes: { motivo: "CODIGO_TELAO" },
        ipHash,
      });
      return falha("CODIGO_INVALIDO", { campos: { codigo: "Código inválido ou já usado. Confira o código na tela da apresentação." }, detalhe: "pareamento do telão recusado" });
    }
    const pareado = await db().telaoRemoto.findUniqueOrThrow({ where: { eventoId_hashCodigo: { eventoId: evento.id, hashCodigo: hash } }, select: { id: true } });

    // O aparelho só é o telão de uma sessão por vez.
    const anterior = hashDoCookie(ctx.headers);
    if (anterior) await db().telaoRemoto.updateMany({ where: { hashToken: anterior, estado: "PAREADO", id: { not: pareado.id } }, data: { estado: "ENCERRADO" } });

    await registrarAuditoria(db(), {
      eventoId: evento.id,
      usuarioId: null,
      acao: "TELAO_REMOTO_PAREADO",
      entidade: "telao_remoto",
      entidadeId: pareado.id,
      ipHash,
    });
    await zerarTentativas(chave);
    ctx.cookies.push(cookieDeAparelho(COOKIE_TELAO, token, VALIDADE_COOKIE_S));
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "parearTelao");
  }
}

/**
 * O sinal do telão pareado (a cada segundo e a cada mudança): grava o que ele mostra e devolve os botões apertados desde
 * `desde`, o modo e a apresentação, se mudou. `instancia` é a aba: outra aba do mesmo aparelho que comece assume, e a anterior
 * recebe CONFLITO (nunca dois palcos executando os mesmos botões). No primeiro sinal da aba (`desde` null) nenhum botão antigo
 * dispara; e um botão de mais de VALIDADE_COMANDO_MS (apertado com o telão sem internet) é descartado.
 */
export async function sincronizarTelao(
  ctx: ContextoAparelho,
  entrada: { instancia: string; desde: number | null; estado: EstadoTelao | null; versaoApresentacao: number },
): Promise<Resultado<SinalTelaoPareado>> {
  const hash = hashDoCookie(ctx.headers);
  if (!hash) return falha("NAO_AUTORIZADO", { detalhe: "telão sem cookie" });
  if (!consumirEmMemoria(`telao-sinal:${hash}`, SINAIS_POR_MINUTO, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const telao = await telaoDoCookie(ctx.headers);
    if (!telao) {
      ctx.cookies.push(cookieDeAparelho(COOKIE_TELAO, "", 0));
      return falha("NAO_AUTORIZADO", { detalhe: "telão não pareado ou desconectado" });
    }
    if (telao.instancia && telao.instancia !== entrada.instancia && entrada.desde !== null)
      return falha("CONFLITO", { mensagem: "O telão foi aberto em outra aba deste aparelho.", detalhe: "instância substituída" });

    const agora = new Date();
    let comandos: ComandoTelao[] = [];
    let ultimoComando: number;
    if (entrada.desde === null) {
      const ultimo = await db().comandoTelao.findFirst({ where: { telaoId: telao.id }, orderBy: { id: "desc" }, select: { id: true } });
      ultimoComando = ultimo?.id ?? 0;
    } else {
      const novos = await db().comandoTelao.findMany({
        where: { telaoId: telao.id, id: { gt: entrada.desde } },
        orderBy: { id: "asc" },
        take: 50,
        select: { id: true, comando: true, criadoEm: true },
      });
      ultimoComando = novos.at(-1)?.id ?? entrada.desde;
      comandos = novos.filter((c) => agora.getTime() - c.criadoEm.getTime() <= VALIDADE_COMANDO_MS).map((c) => c.comando as ComandoTelao);
      // Os já entregues saem: a tabela fica com os poucos em trânsito.
      await db().comandoTelao.deleteMany({ where: { telaoId: telao.id, id: { lte: entrada.desde } } });
    }
    await db().telaoRemoto.update({
      where: { id: telao.id },
      data: { ultimoSinalEm: agora, estadoPalco: json(entrada.estado), instancia: entrada.instancia },
    });
    return sucesso({
      eventoId: telao.eventoId,
      dono: telao.criadoPorId,
      modo: lerModo(telao.modo),
      comandos,
      ultimoComando,
      apresentacao: copiaDe(telao, entrada.versaoApresentacao),
    });
  } catch (e) {
    return falhaInterna(e, "sincronizarTelao");
  }
}

/** A apresentação mudou no telão pareado (o palco avançou a revelação). Devolve a versão gravada. */
export async function espelharApresentacaoTelaoPareado(ctx: ContextoAparelho, entrada: { instancia: string; apresentacao: unknown }): Promise<Resultado<{ versao: number }>> {
  try {
    const telao = await telaoDoCookie(ctx.headers);
    if (!telao) return falha("NAO_AUTORIZADO", { detalhe: "telão não pareado ou desconectado" });
    if (telao.instancia !== entrada.instancia) return falha("CONFLITO", { mensagem: "O telão foi aberto em outra aba deste aparelho.", detalhe: "instância substituída" });
    const salvo = await db().telaoRemoto.update({
      where: { id: telao.id },
      data: { apresentacao: json(entrada.apresentacao), versaoApresentacao: { increment: 1 } },
      select: { versaoApresentacao: true },
    });
    return sucesso({ versao: salvo.versaoApresentacao });
  } catch (e) {
    return falhaInterna(e, "espelharApresentacaoTelaoPareado");
  }
}

/**
 * As leituras do telão (status, ao vivo, resultado, ensaio, trilha): o admin do evento ou, sem ele, o aparelho pareado com este
 * evento. No aparelho, quem responde pela trilha é o admin que gerou o código.
 */
export async function exigirAdminOuTelao(
  usuario: UsuarioSessao | null,
  headers: Headers | null,
  eventoId: string,
): Promise<Resultado<{ evento: Evento; usuarioId: string }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (admin.ok || admin.erro.codigo !== "NAO_AUTORIZADO" || !headers) return admin;
  const telao = await telaoDoCookie(headers);
  if (!telao || telao.eventoId !== eventoId) return admin;
  const evento = await db().evento.findUnique({ where: { id: eventoId } });
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });
  return sucesso({ evento, usuarioId: telao.criadoPorId });
}
