import "server-only";
import { randomBytes } from "node:crypto";
import type { OperacaoDados } from "@/dominio/painel";
import { redistribuirPesos } from "@/dominio/placar";
import {
  ehSituacaoTotem,
  MAX_CODIGOS_PENDENTES,
  type CodigoPareamentoGerado,
  type CodigoPendente,
  type DispositivoListado,
} from "@/dominio/totem";
import type { AcaoAuditoria, EstadoDispositivo } from "@/dominio/tipos";
import { exigirAcao } from "@/dominio/travas";
import { validarNomeDispositivo, validarPinTotem, type Erros } from "@/dominio/validacoesConfig";
import { gerarCodigo } from "@/lib/codigos";
import { registrarAuditoria } from "./auditoria";
import { hashDoCodigoPareamento, hashDoPin } from "./credenciaisTotem";
import { db, type Banco, type Transacao } from "./db";
import { invalidarEstadoPublico } from "./estadoPublico";
import { comEventoTravado } from "./eventoTravado";
import { hashDoIp } from "./ip";
import { chaveDe, zerarTentativas } from "./limites";
import { instante, instanteOuNulo } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Totem (Base/VotoInfantil.md §4 e §10): o lado do admin. Gerar o código de pareamento, listar, pausar, reativar, revogar,
// renomear e trocar o PIN dos totens, e ligar ou desligar o módulo infantil. Tudo revalida a participação ADMIN do evento, passa
// pela trava da fase e deixa trilha na auditoria (nunca o PIN, nunca o código legível, nunca a escolha de voto). O dispositivo não
// é um `Usuario` nem tem `Participacao`: é uma entidade própria do evento.

const MSG_INFANTIL_DESLIGADO = "O módulo infantil está desligado neste evento.";
const MSG_REVOGADO = "Um totem revogado não pode mais ser alterado.";

/** Sorteio com `crypto` (nunca Math.random): um número em [0, 1). */
function sorteio(): number {
  return randomBytes(4).readUInt32BE(0) / 0x1_0000_0000;
}

const mesmoNome = (a: string, b: string) => a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");

/**
 * Código ainda à espera do tablet: disponível e sem validade (25/11/2026: o código não vence mais) ou, nos gerados antes, dentro
 * da validade de 15 minutos.
 */
export function codigoVigente(agora: Date) {
  return { estado: "DISPONIVEL" as const, OR: [{ validadeAte: null }, { validadeAte: { gte: agora } }] };
}

/** Nomes já usados no evento: totens (em qualquer estado) e códigos de pareamento ainda válidos. */
async function nomesEmUso(cliente: Banco | Transacao, eventoId: string, agora: Date, ignorarDispositivoId?: string): Promise<string[]> {
  const [dispositivos, pendentes] = await Promise.all([
    cliente.dispositivo.findMany({ where: { eventoId, ...(ignorarDispositivoId ? { id: { not: ignorarDispositivoId } } : {}) }, select: { nome: true } }),
    cliente.codigoPareamento.findMany({ where: { eventoId, ...codigoVigente(agora) }, select: { nome: true } }),
  ]);
  return [...dispositivos.map((d) => d.nome), ...pendentes.flatMap((c) => (c.nome ? [c.nome] : []))];
}

/** As categorias escolhidas para um totem existem no evento e são TOTEM? Devolve a mensagem do erro ou null. */
async function conferirCategoriasTotem(cliente: Banco | Transacao, eventoId: string, categoriaIds: readonly string[]): Promise<string | null> {
  if (categoriaIds.length === 0) return "Escolha ao menos uma categoria para o totem.";
  const validas = await cliente.categoria.count({ where: { eventoId, canal: "TOTEM", id: { in: [...categoriaIds] } } });
  return validas === categoriaIds.length ? null : "Escolha só categorias votadas no totem. Atualize a tela e tente de novo.";
}

// ─────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────

/** Totens do evento para o painel e a exportação: nome, estado, último uso e votos. Os votos de um totem pausado ou revogado seguem contando. */
export async function totensDoEvento(cliente: Banco, eventoId: string, fuso: string): Promise<OperacaoDados["totens"]> {
  const [linhas, votos] = await Promise.all([
    cliente.dispositivo.findMany({ where: { eventoId }, orderBy: [{ criadoEm: "asc" }, { id: "asc" }] }),
    cliente.votoInfantil.groupBy({ by: ["dispositivoId"], where: { eventoId }, _count: { _all: true } }),
  ]);
  const porTotem = new Map(votos.map((v) => [v.dispositivoId, v._count._all]));
  return linhas.map((d) => ({ nome: d.nome, estado: d.estado, ultimoUso: instanteOuNulo(d.ultimoUsoEm, fuso), votos: porTotem.get(d.id) ?? 0 }));
}

export async function listarDispositivos(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<DispositivoListado[]>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const fuso = admin.dados.evento.fusoHorario;
  try {
    const [linhas, votos] = await Promise.all([
      db().dispositivo.findMany({
        where: { eventoId },
        orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
        include: { categorias: { select: { categoriaId: true } } },
      }),
      db().votoInfantil.groupBy({ by: ["dispositivoId"], where: { eventoId }, _count: { _all: true } }),
    ]);
    const porTotem = new Map(votos.map((v) => [v.dispositivoId, v._count._all]));
    return sucesso(
      linhas.map((d) => ({
        id: d.id,
        nome: d.nome,
        estado: d.estado,
        ultimoUsoEm: instanteOuNulo(d.ultimoUsoEm, fuso),
        criadoEm: instante(d.criadoEm, fuso),
        votos: porTotem.get(d.id) ?? 0,
        temPin: d.hashPin !== null,
        categoriaIds: d.categorias.map((c) => c.categoriaId),
        ultimoSinalEm: instanteOuNulo(d.ultimoSinalEm, fuso),
        situacaoRelatada: ehSituacaoTotem(d.situacaoRelatada) ? d.situacaoRelatada : null,
        telaCheia: d.telaCheia,
        sincronizacaoPedidaEm: instanteOuNulo(d.sincronizacaoPedidaEm, fuso),
      })),
    );
  } catch (e) {
    return falhaInterna(e, "listarDispositivos");
  }
}

/**
 * "Forçar sincronização" (página Totens): marca o pedido nos totens não revogados do evento (ou num só). Cada totem vê o pedido
 * na próxima consulta (a cada 10 s) e responde com um relatório. Não muda voto, estado nem configuração: vale em qualquer fase.
 */
export async function forcarSincronizacaoTotens(usuario: UsuarioSessao | null, eventoId: string, dispositivoId?: string): Promise<Resultado<{ pedidos: number }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  try {
    const { count } = await db().dispositivo.updateMany({
      where: { eventoId, estado: { not: "REVOGADO" }, ...(dispositivoId ? { id: dispositivoId } : {}) },
      data: { sincronizacaoPedidaEm: new Date() },
    });
    if (dispositivoId && count === 0) return falha("NAO_ENCONTRADO", { mensagem: "Este totem não existe mais ou foi revogado." });
    return sucesso({ pedidos: count });
  } catch (e) {
    return falhaInterna(e, "forcarSincronizacaoTotens");
  }
}

// ─────────────────────────────────────────────
// Código de pareamento
// ─────────────────────────────────────────────

/**
 * Gera o código de pareamento (curto e de uso único). O admin já define o nome e o PIN de saída do quiosque do totem.
 * 25/11/2026: o código não vence mais: vale até o tablet usá-lo ou o admin descartá-lo. O tablet é conferido pelo hash; o código
 * legível fica guardado só enquanto estiver à espera, para o admin vê-lo de novo na tela Totens (apagado ao ser usado ou descartado).
 */
export async function gerarCodigoPareamento(
  usuario: UsuarioSessao | null,
  eventoId: string,
  entrada: { nome: string; pin: string; categoriaIds: readonly string[] },
  ctx: { ip: string },
): Promise<Resultado<CodigoPareamentoGerado>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "DISPOSITIVOS_PAREAR");
  if (!trava.ok) return trava;
  if (!evento.moduloInfantil) return falha("TRAVADO", { mensagem: MSG_INFANTIL_DESLIGADO });

  const nome = entrada.nome.trim();
  const campos: Erros = {};
  const erroNome = validarNomeDispositivo(nome);
  if (erroNome) campos.nome = erroNome;
  const erroPin = validarPinTotem(entrada.pin);
  if (erroPin) campos.pin = erroPin;
  const categoriaIds = [...new Set(entrada.categoriaIds)];
  if (categoriaIds.length === 0) campos.categorias = "Escolha ao menos uma categoria para o totem.";
  if (Object.keys(campos).length) return falha("VALIDACAO", { campos });

  // O scrypt é caro: fora da transação, que segura a linha do evento.
  const hashPin = await hashDoPin(entrada.pin);

  return comEventoTravado(eventoId, "DISPOSITIVOS_PAREAR", async (tx, atual) => {
    if (!atual.moduloInfantil) return falha("TRAVADO", { mensagem: MSG_INFANTIL_DESLIGADO });
    const erroCategorias = await conferirCategoriasTotem(tx, eventoId, categoriaIds);
    if (erroCategorias) return falha("VALIDACAO", { campos: { categorias: erroCategorias } });
    const agora = new Date();
    // Arrumação: os gerados antes de 25/11/2026 que venceram sem uso passam a EXPIRADO.
    await tx.codigoPareamento.updateMany({ where: { eventoId, estado: "DISPONIVEL", validadeAte: { lt: agora } }, data: { estado: "EXPIRADO", codigo: null } });
    const pendentes = await tx.codigoPareamento.count({ where: { eventoId, estado: "DISPONIVEL" } });
    if (pendentes >= MAX_CODIGOS_PENDENTES)
      return falha("CONFLITO", { mensagem: "Há códigos demais esperando para ser usados. Pareie os tablets ou descarte os códigos que não vai usar." });
    if ((await nomesEmUso(tx, eventoId, agora)).some((n) => mesmoNome(n, nome))) return falha("VALIDACAO", { campos: { nome: "Já existe um totem com este nome." } });

    let codigo = gerarCodigo(sorteio);
    let hash = hashDoCodigoPareamento(eventoId, codigo);
    for (let tentativas = 0; await tx.codigoPareamento.findUnique({ where: { eventoId_hashCodigo: { eventoId, hashCodigo: hash } }, select: { id: true } }); tentativas++) {
      if (tentativas >= 5) throw new Error("não foi possível sortear um código de pareamento livre");
      codigo = gerarCodigo(sorteio);
      hash = hashDoCodigoPareamento(eventoId, codigo);
    }
    const criado = await tx.codigoPareamento.create({ data: { eventoId, hashCodigo: hash, codigo, nome, hashPin, categoriaIds, validadeAte: null } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CODIGO_PAREAMENTO_GERADO",
      entidade: "codigo_pareamento",
      entidadeId: criado.id,
      detalhes: { categorias: categoriaIds.length },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso({ codigo, nome });
  });
}

/** Os códigos à espera do tablet, do mais antigo ao mais novo (tela Totens: ver de novo ou descartar). */
export async function listarCodigosPareamento(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<CodigoPendente[]>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const fuso = admin.dados.evento.fusoHorario;
  try {
    const linhas = await db().codigoPareamento.findMany({
      where: { eventoId, ...codigoVigente(new Date()) },
      orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
      select: { id: true, codigo: true, nome: true, categoriaIds: true, criadoEm: true, validadeAte: true },
    });
    return sucesso(
      linhas.map((c) => ({
        id: c.id,
        codigo: c.codigo,
        nome: c.nome ?? "Totem",
        categoriaIds: c.categoriaIds,
        criadoEm: instante(c.criadoEm, fuso),
        validadeAte: instanteOuNulo(c.validadeAte, fuso),
      })),
    );
  } catch (e) {
    return falhaInterna(e, "listarCodigosPareamento");
  }
}

/** Descarta um código que ainda não foi usado: o tablet não consegue mais parear com ele, e o nome fica livre de novo. */
export async function descartarCodigoPareamento(usuario: UsuarioSessao | null, eventoId: string, codigoId: string, ctx: { ip: string }): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  try {
    return await db().$transaction(async (tx) => {
      const { count } = await tx.codigoPareamento.updateMany({ where: { id: codigoId, eventoId, estado: "DISPONIVEL" }, data: { estado: "EXPIRADO", codigo: null } });
      // Já usado, já descartado ou inexistente: nada a fazer (a lista se atualiza).
      if (count === 0) return sucesso(null);
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CODIGO_PAREAMENTO_DESCARTADO",
        entidade: "codigo_pareamento",
        entidadeId: codigoId,
        ipHash: hashDoIp(ctx.ip),
      });
      return sucesso(null);
    });
  } catch (e) {
    return falhaInterna(e, "descartarCodigoPareamento");
  }
}

// ─────────────────────────────────────────────
// Pausar, reativar, revogar
// ─────────────────────────────────────────────

type Transicao = { de: EstadoDispositivo[]; para: EstadoDispositivo; acao: AcaoAuditoria };

const PAUSAR: Transicao = { de: ["ATIVO"], para: "PAUSADO", acao: "DISPOSITIVO_PAUSADO" };
const REATIVAR: Transicao = { de: ["PAUSADO"], para: "ATIVO", acao: "DISPOSITIVO_REATIVADO" };
const REVOGAR: Transicao = { de: ["ATIVO", "PAUSADO"], para: "REVOGADO", acao: "DISPOSITIVO_REVOGADO" };

/**
 * A troca de estado é um UPDATE condicional na linha do totem: espera o voto em andamento daquele aparelho e o voto seguinte já a
 * enxerga (a votação confere o estado do aparelho com a linha travada). Repetir a mesma ação não muda nada e não audita.
 * Revogado é definitivo.
 */
async function mudarEstado(
  usuario: UsuarioSessao | null,
  eventoId: string,
  dispositivoId: string,
  t: Transicao,
  opcoes: { motivo?: string; ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "DISPOSITIVOS_GERIR");
  if (!trava.ok) return trava;
  const { usuarioId } = admin.dados;
  try {
    return await db().$transaction(async (tx) => {
      const { count } = await tx.dispositivo.updateMany({ where: { id: dispositivoId, eventoId, estado: { in: t.de } }, data: { estado: t.para } });
      if (count === 0) {
        const atual = await tx.dispositivo.findFirst({ where: { id: dispositivoId, eventoId }, select: { estado: true } });
        if (!atual) return falha("NAO_ENCONTRADO", { detalhe: `totem ${dispositivoId} não existe em ${eventoId}` });
        if (atual.estado === t.para) return sucesso(null);
        return falha("CONFLITO", { mensagem: MSG_REVOGADO, detalhe: `${t.acao} em totem ${atual.estado}` });
      }
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: t.acao,
        entidade: "dispositivo",
        entidadeId: dispositivoId,
        detalhes: opcoes.motivo?.trim() ? { motivo: opcoes.motivo.trim() } : undefined,
        ipHash: hashDoIp(opcoes.ip),
      });
      return sucesso(null);
    });
  } catch (e) {
    return falhaInterna(e, t.acao);
  }
}

export function pausarDispositivo(usuario: UsuarioSessao | null, eventoId: string, dispositivoId: string, ctx: { ip: string }) {
  return mudarEstado(usuario, eventoId, dispositivoId, PAUSAR, ctx);
}

export function reativarDispositivo(usuario: UsuarioSessao | null, eventoId: string, dispositivoId: string, ctx: { ip: string }) {
  return mudarEstado(usuario, eventoId, dispositivoId, REATIVAR, ctx);
}

export function revogarDispositivo(usuario: UsuarioSessao | null, eventoId: string, dispositivoId: string, opcoes: { motivo?: string }, ctx: { ip: string }) {
  return mudarEstado(usuario, eventoId, dispositivoId, REVOGAR, { ...opcoes, ip: ctx.ip });
}

// ─────────────────────────────────────────────
// Renomear e trocar o PIN
// ─────────────────────────────────────────────

export async function renomearDispositivo(usuario: UsuarioSessao | null, eventoId: string, dispositivoId: string, nomeBruto: string): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "DISPOSITIVOS_GERIR");
  if (!trava.ok) return trava;
  const nome = nomeBruto.trim();
  const erro = validarNomeDispositivo(nome);
  if (erro) return falha("VALIDACAO", { campos: { nome: erro } });
  const { usuarioId } = admin.dados;

  return comEventoTravado(eventoId, "DISPOSITIVOS_GERIR", async (tx) => {
    const atual = await tx.dispositivo.findFirst({ where: { id: dispositivoId, eventoId }, select: { nome: true } });
    if (!atual) return falha("NAO_ENCONTRADO", { detalhe: `totem ${dispositivoId} não existe em ${eventoId}` });
    if (atual.nome === nome) return sucesso(null);
    if ((await nomesEmUso(tx, eventoId, new Date(), dispositivoId)).some((n) => mesmoNome(n, nome))) return falha("VALIDACAO", { campos: { nome: "Já existe um totem com este nome." } });
    await tx.dispositivo.update({ where: { id: dispositivoId }, data: { nome } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "DISPOSITIVO_RENOMEADO",
      entidade: "dispositivo",
      entidadeId: dispositivoId,
      detalhes: { de: atual.nome, para: nome },
    });
    return sucesso(null);
  });
}

/**
 * Troca as categorias que um totem exibe (25/11/2026): ao menos uma, todas TOTEM. Vale com a votação aberta (como pausar): o voto
 * seguinte do aparelho já usa a lista nova, e o quiosque a recebe na próxima consulta.
 */
export async function alterarCategoriasDispositivo(
  usuario: UsuarioSessao | null,
  eventoId: string,
  dispositivoId: string,
  categoriaIdsBrutas: readonly string[],
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "DISPOSITIVOS_GERIR");
  if (!trava.ok) return trava;
  const { usuarioId } = admin.dados;
  const categoriaIds = [...new Set(categoriaIdsBrutas)];

  return comEventoTravado(eventoId, "DISPOSITIVOS_GERIR", async (tx) => {
    const erro = await conferirCategoriasTotem(tx, eventoId, categoriaIds);
    if (erro) return falha("VALIDACAO", { campos: { categorias: erro } });
    // Trava a linha do aparelho: o voto em andamento dele termina antes, e o seguinte já vê a lista nova.
    const linhas = await tx.$queryRaw<{ estado: string }[]>`
      SELECT estado::text AS estado FROM dispositivo WHERE id = ${dispositivoId} AND evento_id = ${eventoId} FOR NO KEY UPDATE`;
    if (!linhas[0]) return falha("NAO_ENCONTRADO", { detalhe: `totem ${dispositivoId} não existe em ${eventoId}` });
    if (linhas[0].estado === "REVOGADO") return falha("CONFLITO", { mensagem: MSG_REVOGADO });
    const antes = await tx.dispositivoCategoria.findMany({ where: { dispositivoId }, select: { categoriaId: true } });
    const de = antes.map((c) => c.categoriaId).sort();
    const para = [...categoriaIds].sort();
    if (de.join() === para.join()) return sucesso(null);
    await tx.dispositivoCategoria.deleteMany({ where: { dispositivoId } });
    await tx.dispositivoCategoria.createMany({ data: categoriaIds.map((categoriaId) => ({ dispositivoId, categoriaId, eventoId })) });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "dispositivo",
      entidadeId: dispositivoId,
      detalhes: { campos: ["categorias"], de, para },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
}

/** Novo PIN de saída do quiosque. O PIN nunca vai à auditoria nem a log. Trocar o PIN também limpa o bloqueio por tentativas. */
export async function alterarPinDispositivo(
  usuario: UsuarioSessao | null,
  eventoId: string,
  dispositivoId: string,
  pin: string,
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "DISPOSITIVOS_GERIR");
  if (!trava.ok) return trava;
  const erro = validarPinTotem(pin);
  if (erro) return falha("VALIDACAO", { campos: { pin: erro } });
  const { usuarioId } = admin.dados;
  const hashPin = await hashDoPin(pin);
  try {
    const r = await db().$transaction(async (tx) => {
      const { count } = await tx.dispositivo.updateMany({ where: { id: dispositivoId, eventoId, estado: { not: "REVOGADO" } }, data: { hashPin } });
      if (count === 0) {
        const atual = await tx.dispositivo.findFirst({ where: { id: dispositivoId, eventoId }, select: { estado: true } });
        return atual ? falha("CONFLITO", { mensagem: MSG_REVOGADO }) : falha("NAO_ENCONTRADO", { detalhe: `totem ${dispositivoId} não existe em ${eventoId}` });
      }
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "PIN_DISPOSITIVO_ALTERADO",
        entidade: "dispositivo",
        entidadeId: dispositivoId,
        ipHash: hashDoIp(ctx.ip),
      });
      return sucesso(null);
    });
    if (r.ok) await zerarTentativas(chaveDe("pin-totem", dispositivoId));
    return r;
  } catch (e) {
    return falhaInterna(e, "alterarPinDispositivo");
  }
}

// ─────────────────────────────────────────────
// Módulo infantil (ligado ou desligado por evento, §3)
// ─────────────────────────────────────────────

/**
 * Liga ou desliga o módulo infantil. Muda o placar, então trava com a urna aberta, como os pesos. Ao ligar, o peso infantil fica
 * em 0 e o admin ajusta no Placar (o checklist cobra). Ao desligar, o peso infantil volta a 0 e o resto se redistribui (soma 100).
 * Com votos infantis registrados o módulo não desliga: votos nunca se apagam, e deixá-los de fora do placar mudaria o resultado.
 */
export async function alternarModuloInfantil(usuario: UsuarioSessao | null, eventoId: string, ligado: boolean, ctx: { ip: string }): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "PLACAR");
  if (!trava.ok) return trava;
  const { usuarioId } = admin.dados;

  const r = await comEventoTravado(eventoId, "PLACAR", async (tx, atual) => {
    if (atual.moduloInfantil === ligado) return sucesso(null);
    const placar = await tx.configPlacar.findUnique({ where: { eventoId } });
    if (!placar) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} sem ConfigPlacar` });
    if (!ligado && (await tx.votoInfantil.count({ where: { eventoId } })) > 0)
      return falha("CONFLITO", { mensagem: "Já há votos infantis registrados. Desligue o módulo só se não houver nenhum voto." });

    const de = { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil };
    const para = redistribuirPesos(de, { POPULAR: true, JURI: atual.moduloJuri, INFANTIL: ligado });
    await tx.evento.update({ where: { id: eventoId }, data: { moduloInfantil: ligado } });
    await tx.configPlacar.update({ where: { eventoId }, data: { pesoPopular: para.POPULAR, pesoJuri: para.JURI, pesoInfantil: para.INFANTIL } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { campos: ["moduloInfantil"], de: { moduloInfantil: !ligado, pesos: de }, para: { moduloInfantil: ligado, pesos: para } },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
