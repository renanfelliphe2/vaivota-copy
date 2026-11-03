import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import {
  convitePodeSerRevogado,
  estadoExibidoConvite,
  proximoNumeroRotulo,
  type CodigoGerado,
  type ConviteListado,
} from "@/dominio/convites";
import type { Instante } from "@/dominio/tipos";
import { exigirAcao } from "@/dominio/travas";
import { validarGeracaoConvites, validarRotuloConvite } from "@/dominio/validacoesConfig";
import { gerarCodigo, normalizarCodigo, validarFormatoCodigo } from "@/lib/codigos";
import { paraMs } from "@/lib/tempo";
import { registrarAuditoria } from "./auditoria";
import { db, type Transacao } from "./db";
import { env } from "./env";
import { comEventoTravado } from "./eventoTravado";
import { hashDoIp } from "./ip";
import { chaveDe, consumirEmMemoria, reservarTentativa, zerarTentativas } from "./limites";
import { instante } from "./mapeadores";
import { falha, falhaInterna, sucesso, type CodigoErro, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Festival: convites do júri. Só o hash do código vai ao banco (HMAC com o segredo do servidor, por evento): o código legível
// sai UMA vez, na resposta da geração, e nunca entra em log, auditoria nem resposta de lista. O resgate é atômico: o convite
// é "tomado" com um UPDATE condicional (disponível, dentro da validade), então dois resgates do mesmo código nunca passam.

const MSG_JURI_DESLIGADO = "O módulo júri está desligado neste evento.";
const RESGATES_POR_IP_POR_MINUTO = 600;

/** HMAC do código normalizado (sem hífen, maiúsculo). O evento entra na chave: o mesmo código em outro evento não colide. */
export function hashDoConvite(eventoId: string, codigo: string): string {
  return createHmac("sha256", env.authSecret).update(`convite:${eventoId}:${normalizarCodigo(codigo)}`).digest("hex");
}

/** Sorteio com `crypto` (nunca Math.random): um número em [0, 1). */
function sorteio(): number {
  return randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;
}

/** Códigos legíveis e hashes, sem repetição dentro do lote. */
function gerarLote(eventoId: string, rotulos: (string | null)[], validadeAte: Instante | null): { linhas: LinhaNovaConvite[]; codigos: CodigoGerado[] } {
  const hashes = new Set<string>();
  const linhas: LinhaNovaConvite[] = [];
  const codigos: CodigoGerado[] = [];
  for (const rotulo of rotulos) {
    let codigo = gerarCodigo(sorteio);
    let hash = hashDoConvite(eventoId, codigo);
    while (hashes.has(hash)) {
      codigo = gerarCodigo(sorteio);
      hash = hashDoConvite(eventoId, codigo);
    }
    hashes.add(hash);
    linhas.push({ eventoId, hashCodigo: hash, rotulo, validadeAte: validadeAte ? new Date(validadeAte) : null });
    codigos.push({ rotulo, codigo, validadeAte });
  }
  return { linhas, codigos };
}

type LinhaNovaConvite = { eventoId: string; hashCodigo: string; rotulo: string | null; validadeAte: Date | null };

export async function listarConvites(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<ConviteListado[]>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  try {
    const agoraMs = Date.now();
    const linhas = await db().conviteJurado.findMany({
      where: { eventoId },
      include: { participacao: { select: { usuario: { select: { nome: true } } } } },
    });
    const fuso = evento.fusoHorario;
    return sucesso(
      linhas
        .sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime() || (a.rotulo ?? "").localeCompare(b.rotulo ?? "", "pt-BR", { numeric: true }) || a.id.localeCompare(b.id))
        .map((c) => {
          const validadeAte = c.validadeAte ? instante(c.validadeAte, fuso) : null;
          return {
            id: c.id,
            rotulo: c.rotulo,
            estado: estadoExibidoConvite({ estado: c.estado, validadeAte }, agoraMs),
            validadeAte,
            resgatadoPor: c.participacao?.usuario.nome ?? null,
            resgatadoEm: c.resgatadoEm ? instante(c.resgatadoEm, fuso) : null,
          };
        }),
    );
  } catch (e) {
    return falhaInterna(e, "listarConvites");
  }
}

export type EntradaGeracao = { quantidade: number; rotuloBase?: string; validadeAte: Instante | null };

export async function gerarConvites(
  usuario: UsuarioSessao | null,
  eventoId: string,
  entrada: EntradaGeracao,
  ctx: { ip: string },
): Promise<Resultado<{ codigos: CodigoGerado[] }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CONVITES_GERAR");
  if (!trava.ok) return trava;
  if (!evento.moduloJuri) return falha("TRAVADO", { mensagem: MSG_JURI_DESLIGADO });
  const rotuloBase = entrada.rotuloBase?.trim() ?? "";
  if (entrada.validadeAte !== null && Number.isNaN(Date.parse(entrada.validadeAte))) return falha("VALIDACAO", { campos: { validadeAte: "Data inválida." } });
  const erros = validarGeracaoConvites({
    quantidade: entrada.quantidade,
    rotuloBase,
    validadeAteMs: entrada.validadeAte ? paraMs(entrada.validadeAte) : null,
    agoraMs: Date.now(),
  });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  return comEventoTravado(eventoId, "CONVITES_GERAR", async (tx) => {
    const inicio = rotuloBase ? proximoNumeroRotulo((await tx.conviteJurado.findMany({ where: { eventoId }, select: { rotulo: true } })).map((c) => c.rotulo), rotuloBase) : 0;
    const rotulos = Array.from({ length: entrada.quantidade }, (_, i) => (rotuloBase ? `${rotuloBase} ${inicio + i}` : null));
    const { linhas, codigos } = gerarLote(eventoId, rotulos, entrada.validadeAte);
    await tx.conviteJurado.createMany({ data: linhas });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONVITES_GERADOS",
      entidade: "convite_jurado",
      detalhes: { quantidade: linhas.length, rotuloBase: rotuloBase || null, validadeAte: entrada.validadeAte },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso({ codigos });
  });
}

/** "Baixar CSV": audita a exportação; nunca recebe nem registra códigos. */
export async function registrarExportacaoConvites(
  usuario: UsuarioSessao | null,
  eventoId: string,
  quantidade: number,
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  if (admin.dados.evento.estado === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  try {
    await registrarAuditoria(db(), {
      eventoId,
      usuarioId: admin.dados.usuarioId,
      acao: "EXPORTACAO_CSV",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { arquivo: "convites", quantidade },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "registrarExportacaoConvites");
  }
}

export async function renomearConvite(usuario: UsuarioSessao | null, eventoId: string, conviteId: string, rotulo: string): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CONVITES_RENOMEAR");
  if (!trava.ok) return trava;
  const e1 = validarRotuloConvite(rotulo);
  if (e1) return falha("VALIDACAO", { campos: { rotulo: e1 } });
  return comEventoTravado(eventoId, "CONVITES_RENOMEAR", async (tx) => {
    const { count } = await tx.conviteJurado.updateMany({ where: { id: conviteId, eventoId }, data: { rotulo: rotulo.trim() || null } });
    return count === 1 ? sucesso(null) : falha("NAO_ENCONTRADO");
  });
}

/** Só convite DISPONIVEL (inclui o expirado). Substituto: mesmo rótulo; validade original se ainda no futuro, senão o fim da janela. */
export async function revogarConvite(
  usuario: UsuarioSessao | null,
  eventoId: string,
  conviteId: string,
  opcoes: { gerarSubstituto: boolean; motivo?: string },
  ctx: { ip: string },
): Promise<Resultado<{ substituto: CodigoGerado | null }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CONVITES_REVOGAR");
  if (!trava.ok) return trava;
  if (!evento.moduloJuri) return falha("TRAVADO", { mensagem: MSG_JURI_DESLIGADO });

  return comEventoTravado(eventoId, "CONVITES_REVOGAR", async (tx, atual) => {
    const convite = await tx.conviteJurado.findFirst({ where: { id: conviteId, eventoId } });
    if (!convite) return falha("NAO_ENCONTRADO");
    if (!convitePodeSerRevogado(convite)) return falha("CONFLITO", { mensagem: "Só convites disponíveis podem ser revogados." });
    // O resgate concorrente pode ter tomado o convite entre a leitura e aqui: a condição fica no próprio UPDATE.
    const { count } = await tx.conviteJurado.updateMany({ where: { id: conviteId, estado: "DISPONIVEL" }, data: { estado: "REVOGADO" } });
    if (count === 0) return falha("CONFLITO", { mensagem: "Só convites disponíveis podem ser revogados." });

    const agoraMs = Date.now();
    const futuro = (d: Date | null) => (d && d.getTime() > agoraMs ? d : null);
    const validade = futuro(convite.validadeAte) ?? futuro(atual.janelaFim);
    const validadeIso = validade ? instante(validade, atual.fusoHorario) : null;
    const lote = opcoes.gerarSubstituto ? gerarLote(eventoId, [convite.rotulo], validadeIso) : null;
    if (lote) await tx.conviteJurado.createMany({ data: lote.linhas });

    const ipHash = hashDoIp(ctx.ip);
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONVITE_REVOGADO",
      entidade: "convite_jurado",
      entidadeId: conviteId,
      detalhes: { rotulo: convite.rotulo, substituto: Boolean(lote), motivo: opcoes.motivo?.trim() || null },
      ipHash,
    });
    if (lote)
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CONVITES_GERADOS",
        entidade: "convite_jurado",
        detalhes: { quantidade: 1, rotuloBase: convite.rotulo, validadeAte: validadeIso, substitutoDe: conviteId },
        ipHash,
      });
    return sucesso({ substituto: lote?.codigos[0] ?? null });
  });
}

// ─────────────────────────────────────────────
// Resgate (o jurado)
// ─────────────────────────────────────────────

/** Resgate sem efeito: a transação desfaz tudo (inclusive a participação criada) e carrega o motivo para fora. */
class ConviteRecusado extends Error {
  constructor(readonly codigo: CodigoErro) {
    super(codigo);
  }
}

type CodigoDeConvite = "CODIGO_INVALIDO" | "CODIGO_USADO" | "CODIGO_REVOGADO" | "CODIGO_EXPIRADO";

/** Por que o UPDATE condicional não tomou o convite. */
async function motivoDaRecusa(tx: Transacao, eventoId: string, hash: string): Promise<CodigoDeConvite> {
  const convite = await tx.conviteJurado.findUnique({ where: { eventoId_hashCodigo: { eventoId, hashCodigo: hash } }, select: { estado: true } });
  if (!convite) return "CODIGO_INVALIDO";
  if (convite.estado === "USADO") return "CODIGO_USADO";
  if (convite.estado === "REVOGADO") return "CODIGO_REVOGADO";
  return "CODIGO_EXPIRADO";
}

function recusaDoEvento(e: { estado: string; estadoUrna: string; moduloJuri: boolean }): CodigoErro | null {
  if (e.estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (e.estado === "RASCUNHO") return "EVENTO_INDISPONIVEL";
  if (e.estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  if (!e.moduloJuri) return "CODIGO_INVALIDO";
  return null;
}

function recusaDePapel(p: { papel: string; votou: boolean }): CodigoErro | null {
  if (p.papel === "ADMIN") return "PAPEL_INVALIDO";
  if (p.papel === "JURADO") return "JA_E_JURADO";
  if (p.votou) return "JA_VOTOU_COMO_PUBLICO";
  return null;
}

/**
 * Resgata o convite: a participação passa a JURADO (ou nasce JURADO, se ainda não existe). Quem já votou como público,
 * o admin e quem já é jurado são recusados. Cinco tentativas por sequência; a sexta bloqueia por 60 s. Todo código recusado
 * dá a mesma mensagem ao usuário; o motivo exato fica só na auditoria.
 */
export async function resgatarConvite(
  usuario: UsuarioSessao | null,
  ctx: { ip: string },
  entrada: { eventoId: string; codigo: string },
): Promise<Resultado<{ papel: "JURADO" }>> {
  if (!usuario || !usuario.emailVerificado) return falha("NAO_AUTORIZADO", { detalhe: "resgate de convite sem sessão verificada" });
  if (!consumirEmMemoria(`convite-ip:${ctx.ip}`, RESGATES_POR_IP_POR_MINUTO, 60_000)) return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });

  try {
    const evento = await db().evento.findUnique({ where: { id: entrada.eventoId }, select: { id: true, estado: true, estadoUrna: true, moduloJuri: true } });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    const recusaEvento = recusaDoEvento(evento);
    if (recusaEvento) return falha(recusaEvento, { detalhe: `resgate de convite: ${recusaEvento}` });
    const participacao = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      select: { papel: true, votou: true },
    });
    const recusaPapel = participacao ? recusaDePapel(participacao) : null;
    if (recusaPapel) return falha(recusaPapel, { detalhe: `resgate de convite com papel ${participacao?.papel}` });

    // Formato errado não gasta tentativa; o resto gasta ANTES de verificar (atômico), senão uma rajada passaria toda.
    if (!validarFormatoCodigo(entrada.codigo)) return falha("VALIDACAO", { campos: { codigo: "Digite o código completo, no formato XXXX-XXXX." } });
    const chave = chaveDe("convite", `${usuario.id}:${evento.id}`);
    const reserva = await reservarTentativa(chave);
    const ipHash = hashDoIp(ctx.ip);
    if (!reserva.permitido) {
      if (reserva.primeiraRecusa)
        await registrarAuditoria(db(), {
          eventoId: evento.id,
          usuarioId: usuario.id,
          acao: "BLOQUEIO_RATE_LIMIT",
          entidade: "convite_jurado",
          detalhes: { alvo: "CODIGO_CONVITE", segundos: 60 },
          ipHash,
        });
      return falha("LIMITE_TENTATIVAS", { parametros: { n: reserva.restanteSegundos } });
    }

    const hash = hashDoConvite(evento.id, entrada.codigo);
    try {
      await db().$transaction(async (tx) => {
        // Trava compartilhada: o encerramento da urna espera este resgate terminar (e o relê já travado).
        const linhas = await tx.$queryRaw<{ estado: string; estado_urna: string; modulo_juri: boolean }[]>`
          SELECT estado::text AS estado, estado_urna::text AS estado_urna, modulo_juri FROM evento WHERE id = ${evento.id} FOR SHARE`;
        const atual = linhas[0];
        const recusa = atual ? recusaDoEvento({ estado: atual.estado, estadoUrna: atual.estado_urna, moduloJuri: atual.modulo_juri }) : "NAO_ENCONTRADO";
        if (recusa) throw new ConviteRecusado(recusa);

        // A participação nasce no acesso (C2); aqui, se faltar, nasce já para virar jurado. A linha fica travada até o fim.
        await tx.participacao.createMany({ data: [{ usuarioId: usuario.id, eventoId: evento.id, papel: "PUBLICO" }], skipDuplicates: true });
        const minhas = await tx.$queryRaw<{ id: string; papel: string; votou: boolean }[]>`
          SELECT id, papel::text AS papel, votou FROM participacao WHERE usuario_id = ${usuario.id} AND evento_id = ${evento.id} FOR UPDATE`;
        const minha = minhas[0];
        if (!minha) throw new ConviteRecusado("NAO_AUTORIZADO");
        const recusaPapelAtual = recusaDePapel(minha);
        if (recusaPapelAtual) throw new ConviteRecusado(recusaPapelAtual);

        const tomado = await tx.conviteJurado.updateMany({
          where: {
            eventoId: evento.id,
            hashCodigo: hash,
            estado: "DISPONIVEL",
            OR: [{ validadeAte: null }, { validadeAte: { gte: new Date() } }],
          },
          data: { estado: "USADO", participacaoId: minha.id, resgatadoEm: new Date() },
        });
        if (tomado.count === 0) throw new ConviteRecusado(await motivoDaRecusa(tx, evento.id, hash));

        const promovida = await tx.participacao.updateMany({ where: { id: minha.id, papel: "PUBLICO", votou: false }, data: { papel: "JURADO" } });
        if (promovida.count === 0) throw new ConviteRecusado("JA_VOTOU_COMO_PUBLICO");

        const convite = await tx.conviteJurado.findUniqueOrThrow({
          where: { eventoId_hashCodigo: { eventoId: evento.id, hashCodigo: hash } },
          select: { id: true, rotulo: true },
        });
        await registrarAuditoria(tx, {
          eventoId: evento.id,
          usuarioId: usuario.id,
          acao: "CONVITE_RESGATADO",
          entidade: "convite_jurado",
          entidadeId: convite.id,
          detalhes: { rotulo: convite.rotulo },
          ipHash,
        });
      });
    } catch (e) {
      if (!(e instanceof ConviteRecusado)) throw e;
      if (e.codigo.startsWith("CODIGO_"))
        await registrarAuditoria(db(), {
          eventoId: evento.id,
          usuarioId: usuario.id,
          acao: "TENTATIVA_CODIGO_INVALIDA",
          entidade: "convite_jurado",
          detalhes: { motivo: e.codigo },
          ipHash,
        });
      return falha(e.codigo, { detalhe: `convite recusado: ${e.codigo}` });
    }
    await zerarTentativas(chave);
    return sucesso({ papel: "JURADO" });
  } catch (e) {
    return falhaInterna(e, "resgatarConvite");
  }
}
