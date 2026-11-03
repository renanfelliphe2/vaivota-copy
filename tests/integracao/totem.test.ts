import { createHash, randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ALFABETO_CODIGO } from "@/lib/codigos";
import { COOKIE_TOTEM, cookieDoTotem, hashDoPin, hashDoToken, pinConfere, tokenDoCookie } from "@/server/credenciaisTotem";
import { obterOperacao, obterResultado } from "@/server/dashboard";
import { db, desconectarBanco } from "@/server/db";
import {
  alterarPinDispositivo,
  alternarModuloInfantil,
  gerarCodigoPareamento,
  listarDispositivos,
  pausarDispositivo,
  reativarDispositivo,
  renomearDispositivo,
  revogarDispositivo,
} from "@/server/dispositivos";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { prepararExportacao } from "@/server/exportacao";
import { encerrarUrna, entradaDoChecklist } from "@/server/operacao";
import { executarServico, type ContextoRpc } from "@/server/rpc";
import { conferirPinTotem, obterEstadoTotem, parearTotem, votarInfantil, type ContextoTotem } from "@/server/totem";
import type { UsuarioSessao } from "@/server/sessao";
import { cookieDe, criarAdminDireto, criarCandidatos, criarUsuarioDireto, ligarInfantil, semearEvento } from "./apoio";

// Totem (voto infantil) contra um PostgreSQL de verdade: código de pareamento, pareamento (cookie com o token, só o hash no
// banco), voto com o aparelho ativo, pausa e revogação na hora, PIN de saída com bloqueio, gestão pelo admin, módulo infantil,
// apuração, painel e exportação. Cada grupo usa o próprio evento.

const PIN = "90817364";

afterAll(async () => {
  await desconectarBanco();
});

// IP novo por tablet: o bloqueio de pareamento é por IP e evento, e um teste não pode travar o outro.
let sequenciaIp = 0;
const novoIp = () => `198.51.100.${(++sequenciaIp % 250) + 1}`;

function tablet(cookies: string[], ip: string): ContextoTotem {
  return { headers: new Headers({ cookie: cookieDe(cookies) }), ip, cookies: [] };
}

/** Gera o código como admin e pareia um tablet novo. Devolve o contexto do tablet (com o cookie do totem). */
async function criarTotem(admin: UsuarioSessao, eventoId: string, opcoes: { nome?: string; pin?: string } = {}) {
  const ip = novoIp();
  const nome = opcoes.nome ?? `Totem ${randomUUID().slice(0, 8)}`;
  const pin = opcoes.pin ?? PIN;
  const gerado = await gerarCodigoPareamento(admin, eventoId, { nome, pin }, { ip });
  if (!gerado.ok) throw new Error(`gerarCodigoPareamento falhou: ${gerado.erro.codigo} ${gerado.erro.mensagem}`);
  const cookies: string[] = [];
  const pareado = await parearTotem({ headers: new Headers(), ip, cookies }, { eventoId, codigo: gerado.dados.codigo });
  if (!pareado.ok) throw new Error(`parearTotem falhou: ${pareado.erro.codigo} ${pareado.erro.mensagem}`);
  return { id: pareado.dados.dispositivo.id, nome, pin, ip, cookies, codigo: gerado.dados.codigo, ctx: tablet(cookies, ip) };
}

/** Um código com o formato certo que ninguém gerou. */
function codigoQueNaoExiste(n: number): string {
  let resto = n + 1;
  let sufixo = "";
  for (let i = 0; i < 4; i++) {
    sufixo = ALFABETO_CODIGO[resto % ALFABETO_CODIGO.length] + sufixo;
    resto = Math.floor(resto / ALFABETO_CODIGO.length);
  }
  return `2222-${sufixo}`;
}

async function eventoComTotens(slug: string, opcoes: { urna?: "NAO_INICIADA" | "ABERTA" | "ENCERRADA"; ativo?: boolean; pesoInfantil?: number } = {}) {
  const eventoId = await semearEvento(slug, { ativo: opcoes.ativo ?? true, urna: opcoes.urna });
  await ligarInfantil(eventoId, { pesoInfantil: opcoes.pesoInfantil });
  const admin = await criarAdminDireto(eventoId);
  return { eventoId, admin };
}

async function auditoriaDe(eventoId: string, acao: string) {
  return db().auditoria.findMany({ where: { eventoId, acao }, orderBy: { id: "asc" } });
}

// ─────────────────────────────────────────────
// Credenciais (token, PIN, cookie)
// ─────────────────────────────────────────────

describe("credenciais do totem", () => {
  it("o cookie do totem é HttpOnly e só um token com a forma certa é aceito", () => {
    const token = randomBytes(32).toString("base64url");
    const cookie = cookieDoTotem(token);
    expect(cookie).toContain(`${COOKIE_TOTEM}=${token}`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(tokenDoCookie(new Headers({ cookie: `a=1; ${COOKIE_TOTEM}=${token}; b=2` }))).toBe(token);
    expect(tokenDoCookie(new Headers({ cookie: `${COOKIE_TOTEM}=curto` }))).toBeNull();
    expect(tokenDoCookie(new Headers({ cookie: "outro=valor" }))).toBeNull();
    expect(tokenDoCookie(new Headers())).toBeNull();
    expect(hashDoToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
  });

  it("o PIN vira scrypt com sal: o mesmo PIN gera hashes diferentes e só o certo confere", async () => {
    const a = await hashDoPin(PIN);
    const b = await hashDoPin(PIN);
    expect(a).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain(PIN);
    expect(await pinConfere(a, PIN)).toBe(true);
    expect(await pinConfere(a, "00000000")).toBe(false);
    expect(await pinConfere(a, "")).toBe(false);
    expect(await pinConfere("lixo", PIN)).toBe(false);
    // Sem PIN definido sai direto.
    expect(await pinConfere(null, "qualquer")).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Módulo infantil
// ─────────────────────────────────────────────

describe("módulo infantil: ligar e desligar", () => {
  const ctx = { ip: "203.0.113.71" };

  it("liga sem mexer nos pesos, desliga redistribuindo e audita as duas trocas", async () => {
    const eventoId = await semearEvento("teste-totem-modulo", { ativo: true });
    const admin = await criarAdminDireto(eventoId);

    expect(await alternarModuloInfantil(admin, eventoId, true, ctx)).toMatchObject({ ok: true });
    let evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { configPlacar: true } });
    expect(evento.moduloInfantil).toBe(true);
    expect(evento.configPlacar).toMatchObject({ pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0 });
    // Repetir não muda nada e não audita de novo.
    expect(await alternarModuloInfantil(admin, eventoId, true, ctx)).toMatchObject({ ok: true });

    await db().configPlacar.update({ where: { eventoId }, data: { pesoPopular: 70, pesoInfantil: 30 } });
    expect(await alternarModuloInfantil(admin, eventoId, false, ctx)).toMatchObject({ ok: true });
    evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { configPlacar: true } });
    expect(evento.moduloInfantil).toBe(false);
    expect(evento.configPlacar).toMatchObject({ pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0 });

    const auditoria = await auditoriaDe(eventoId, "CONFIG_ALTERADA");
    expect(auditoria).toHaveLength(2);
    expect(auditoria[0].detalhes).toMatchObject({ campos: ["moduloInfantil"], para: { moduloInfantil: true } });
    expect(auditoria[1].detalhes).toMatchObject({ campos: ["moduloInfantil"], de: { moduloInfantil: true }, para: { moduloInfantil: false } });
  });

  it("só o admin do evento; trava com a urna aberta; leitura depois de concluído", async () => {
    const eventoId = await semearEvento("teste-totem-modulo-trava", { urna: "ABERTA" });
    const admin = await criarAdminDireto(eventoId);
    const publico = await criarUsuarioDireto(eventoId);
    const outro = await semearEvento("teste-totem-modulo-outro", { ativo: true });
    const adminDoOutro = await criarAdminDireto(outro);
    for (const quem of [publico, adminDoOutro, null])
      expect(await alternarModuloInfantil(quem, eventoId, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    expect(await alternarModuloInfantil(admin, eventoId, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    expect(await alternarModuloInfantil(admin, eventoId, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
  });

  it("com votos infantis registrados o módulo não desliga", async () => {
    const eventoId = await semearEvento("teste-totem-modulo-votos", { ativo: true });
    await ligarInfantil(eventoId);
    const admin = await criarAdminDireto(eventoId);
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const aparelho = await db().dispositivo.create({ data: { eventoId, nome: "Direto", hashToken: randomBytes(32).toString("hex") } });
    await db().votoInfantil.create({ data: { eventoId, candidatoId, dispositivoId: aparelho.id } });

    expect(await alternarModuloInfantil(admin, eventoId, false, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { configPlacar: true } });
    expect(evento.moduloInfantil).toBe(true);
    expect(evento.configPlacar?.pesoInfantil).toBe(30);
  });
});

// ─────────────────────────────────────────────
// Código de pareamento
// ─────────────────────────────────────────────

describe("código de pareamento: geração", () => {
  const ctx = { ip: "203.0.113.72" };

  it("só o admin gera; o código sai uma vez e o banco guarda só o hash (e o PIN só como scrypt)", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-codigo");
    const publico = await criarUsuarioDireto(eventoId);
    for (const quem of [publico, null])
      expect(await gerarCodigoPareamento(quem, eventoId, { nome: "Totem Hall", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    const antes = Date.now();
    const r = await gerarCodigoPareamento(admin, eventoId, { nome: "  Totem Hall  ", pin: PIN }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.nome).toBe("Totem Hall");
    expect(r.dados.codigo).toMatch(new RegExp(`^[${ALFABETO_CODIGO}]{4}-[${ALFABETO_CODIGO}]{4}$`));
    const validade = Date.parse(r.dados.validadeAte) - antes;
    expect(validade).toBeGreaterThan(14 * 60_000);
    expect(validade).toBeLessThan(16 * 60_000);

    const linhas = await db().codigoPareamento.findMany({ where: { eventoId } });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ estado: "DISPONIVEL", nome: "Totem Hall", dispositivoId: null });
    expect(linhas[0].hashCodigo).toMatch(/^[0-9a-f]{64}$/);
    expect(linhas[0].hashPin).toMatch(/^scrypt\$/);
    const guardado = JSON.stringify([linhas, await db().auditoria.findMany({ where: { eventoId } })]);
    expect(guardado).not.toContain(r.dados.codigo.replace("-", ""));
    expect(guardado).not.toContain(PIN);
    expect((await auditoriaDe(eventoId, "CODIGO_PAREAMENTO_GERADO"))).toHaveLength(1);
  });

  it("valida nome e PIN; nome repetido (também contra código pendente); módulo desligado e urna encerrada travam", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-codigo-valida");
    expect(await gerarCodigoPareamento(admin, eventoId, { nome: "A", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { nome: expect.any(String) } } });
    for (const pin of ["123", "123456789", "12ab", "", "12 34"])
      expect(await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Ok", pin }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { pin: expect.any(String) } } });

    expect((await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Pátio", pin: PIN }, ctx)).ok).toBe(true);
    expect(await gerarCodigoPareamento(admin, eventoId, { nome: "totem pátio", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { nome: "Já existe um totem com este nome." } } });

    const semModulo = await semearEvento("teste-totem-codigo-sem-modulo", { ativo: true });
    const adminSem = await criarAdminDireto(semModulo);
    expect(await gerarCodigoPareamento(adminSem, semModulo, { nome: "Totem", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });

    const encerrado = await eventoComTotens("teste-totem-codigo-encerrado", { urna: "ENCERRADA" });
    expect(await gerarCodigoPareamento(encerrado.admin, encerrado.eventoId, { nome: "Totem", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: encerrado.eventoId }, data: { estado: "CONCLUIDO" } });
    expect(await gerarCodigoPareamento(encerrado.admin, encerrado.eventoId, { nome: "Totem", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
  });

  it("no rascunho já gera (o tablet é preparado antes da urna abrir)", async () => {
    const eventoId = await semearEvento("teste-totem-codigo-rascunho");
    await ligarInfantil(eventoId);
    const admin = await criarAdminDireto(eventoId);
    expect((await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Cedo", pin: PIN }, ctx)).ok).toBe(true);
  });

  it("no máximo 20 códigos pendentes por evento; os vencidos viram EXPIRADO e liberam vaga", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-codigo-limite");
    for (let i = 1; i <= 20; i++) expect((await gerarCodigoPareamento(admin, eventoId, { nome: `Totem ${i}`, pin: PIN }, ctx)).ok).toBe(true);
    expect(await gerarCodigoPareamento(admin, eventoId, { nome: "Totem 21", pin: PIN }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });

    await db().codigoPareamento.updateMany({ where: { eventoId }, data: { validadeAte: new Date(Date.now() - 60_000) } });
    expect((await gerarCodigoPareamento(admin, eventoId, { nome: "Totem 21", pin: PIN }, ctx)).ok).toBe(true);
    expect(await db().codigoPareamento.count({ where: { eventoId, estado: "EXPIRADO" } })).toBe(20);
  });
});

// ─────────────────────────────────────────────
// Pareamento
// ─────────────────────────────────────────────

describe("pareamento do tablet", () => {
  it("troca o código por um token: cookie HttpOnly no tablet, só o hash no banco, nome e PIN do admin", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear");
    const ip = novoIp();
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Hall", pin: PIN }, { ip });
    if (!gerado.ok) throw new Error("não gerou");

    const cookies: string[] = [];
    // Aceita qualquer grafia do mesmo código.
    const r = await parearTotem({ headers: new Headers(), ip, cookies }, { eventoId, codigo: gerado.dados.codigo.toLowerCase().replace("-", " ") });
    expect(r).toMatchObject({ ok: true, dados: { dispositivo: { nome: "Totem Hall", estado: "ATIVO", eventoId } } });
    if (!r.ok) return;

    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toContain("HttpOnly");
    const token = tokenDoCookie(new Headers({ cookie: cookieDe(cookies) }));
    expect(token).not.toBeNull();

    const aparelho = await db().dispositivo.findUniqueOrThrow({ where: { id: r.dados.dispositivo.id } });
    expect(aparelho).toMatchObject({ eventoId, nome: "Totem Hall", estado: "ATIVO", ultimoUsoEm: null });
    expect(aparelho.hashToken).toBe(hashDoToken(token!));
    expect(aparelho.hashToken).not.toBe(token);
    expect(await pinConfere(aparelho.hashPin, PIN)).toBe(true);
    expect(JSON.stringify(await db().dispositivo.findMany({ where: { eventoId } }))).not.toContain(token!);

    const codigo = await db().codigoPareamento.findFirstOrThrow({ where: { eventoId } });
    expect(codigo).toMatchObject({ estado: "USADO", dispositivoId: aparelho.id });

    const pareado = await auditoriaDe(eventoId, "DISPOSITIVO_PAREADO");
    expect(pareado).toHaveLength(1);
    expect(pareado[0]).toMatchObject({ atorDispositivoId: aparelho.id, atorUsuarioId: null, entidade: "dispositivo", entidadeId: aparelho.id });
    expect(JSON.stringify(pareado)).not.toContain(token!);
  });

  it("código de uso único: o segundo uso é recusado, com a mesma mensagem de qualquer código recusado", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear-uso");
    const t = await criarTotem(admin, eventoId);
    const ip = novoIp();
    const r = await parearTotem({ headers: new Headers(), ip, cookies: [] }, { eventoId, codigo: t.codigo });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "CODIGO_USADO" } });
    const inexistente = await parearTotem({ headers: new Headers(), ip, cookies: [] }, { eventoId, codigo: codigoQueNaoExiste(1) });
    expect(inexistente.ok).toBe(false);
    if (!r.ok && !inexistente.ok) expect(r.erro.mensagem).toBe(inexistente.erro.mensagem);
    // O motivo exato fica só na auditoria.
    const recusas = await auditoriaDe(eventoId, "TENTATIVA_CODIGO_INVALIDA");
    expect(recusas.map((a) => (a.detalhes as { motivo: string }).motivo)).toEqual(["CODIGO_USADO", "CODIGO_INVALIDO"]);
    expect(await db().dispositivo.count({ where: { eventoId } })).toBe(1);
  });

  it("cinco pareamentos simultâneos com o mesmo código: só um passa", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear-corrida");
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Corrida", pin: PIN }, { ip: novoIp() });
    if (!gerado.ok) throw new Error("não gerou");
    const rs = await Promise.all(
      Array.from({ length: 5 }, () => parearTotem({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: gerado.dados.codigo })),
    );
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(rs.filter((r) => !r.ok && r.erro.codigo === "CODIGO_USADO")).toHaveLength(4);
    expect(await db().dispositivo.count({ where: { eventoId } })).toBe(1);
  });

  it("código vencido, código de outro evento e formato errado", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear-recusas");
    const outro = await eventoComTotens("teste-totem-parear-recusas-outro");
    const ip = novoIp();
    const contexto = () => ({ headers: new Headers(), ip, cookies: [] as string[] });

    const vencido = await gerarCodigoPareamento(admin, eventoId, { nome: "Vencido", pin: PIN }, { ip });
    if (!vencido.ok) throw new Error("não gerou");
    await db().codigoPareamento.updateMany({ where: { eventoId }, data: { validadeAte: new Date(Date.now() - 1000) } });
    expect(await parearTotem(contexto(), { eventoId, codigo: vencido.dados.codigo })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_EXPIRADO" } });

    const deOutro = await gerarCodigoPareamento(outro.admin, outro.eventoId, { nome: "De outro", pin: PIN }, { ip });
    if (!deOutro.ok) throw new Error("não gerou");
    expect(await parearTotem(contexto(), { eventoId, codigo: deOutro.dados.codigo })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });

    // Formato errado não gasta tentativa.
    for (let i = 0; i < 8; i++) expect(await parearTotem(contexto(), { eventoId, codigo: "ABC" })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await parearTotem(contexto(), { eventoId: randomUUID(), codigo: codigoQueNaoExiste(2) })).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
  });

  it("cinco códigos errados bloqueiam o IP por 60 s, inclusive para o código certo; o bloqueio é auditado uma vez", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear-bloqueio");
    const ip = novoIp();
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Bloq", pin: PIN }, { ip });
    if (!gerado.ok) throw new Error("não gerou");
    const contexto = () => ({ headers: new Headers(), ip, cookies: [] as string[] });

    for (let i = 0; i < 5; i++) expect(await parearTotem(contexto(), { eventoId, codigo: codigoQueNaoExiste(10 + i) })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });
    expect(await parearTotem(contexto(), { eventoId, codigo: codigoQueNaoExiste(20) })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    expect(await parearTotem(contexto(), { eventoId, codigo: gerado.dados.codigo })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    const bloqueios = await auditoriaDe(eventoId, "BLOQUEIO_RATE_LIMIT");
    expect(bloqueios).toHaveLength(1);
    expect(bloqueios[0].detalhes).toMatchObject({ alvo: "CODIGO_PAREAMENTO" });
    // Outro IP não é afetado.
    expect((await parearTotem({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: gerado.dados.codigo })).ok).toBe(true);
  });

  it("não pareia com o módulo desligado nem com o evento concluído ou a urna encerrada", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-parear-estado");
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem", pin: PIN }, { ip: novoIp() });
    if (!gerado.ok) throw new Error("não gerou");
    const tentar = () => parearTotem({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: gerado.dados.codigo });

    await db().evento.update({ where: { id: eventoId }, data: { moduloInfantil: false } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });
    await db().evento.update({ where: { id: eventoId }, data: { moduloInfantil: true, estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    await db().evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
    expect(await db().dispositivo.count({ where: { eventoId } })).toBe(0);
  });

  it("obterEstadoTotem: sem cookie ou com token desconhecido não é totem; o estado vem do banco a cada leitura", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-estado");
    const t = await criarTotem(admin, eventoId, { nome: "Totem Estado" });
    const ip = novoIp();
    expect(await obterEstadoTotem({ headers: new Headers(), ip, cookies: [] })).toEqual({ ok: true, dados: { dispositivo: null } });
    const falso = randomBytes(32).toString("base64url");
    expect(await obterEstadoTotem({ headers: new Headers({ cookie: `${COOKIE_TOTEM}=${falso}` }), ip, cookies: [] })).toEqual({ ok: true, dados: { dispositivo: null } });

    expect(await obterEstadoTotem(t.ctx)).toEqual({ ok: true, dados: { dispositivo: { id: t.id, eventoId, nome: "Totem Estado", estado: "ATIVO" } } });
    await pausarDispositivo(admin, eventoId, t.id, { ip });
    expect(await obterEstadoTotem(t.ctx)).toMatchObject({ ok: true, dados: { dispositivo: { estado: "PAUSADO" } } });
    await revogarDispositivo(admin, eventoId, t.id, {}, { ip });
    expect(await obterEstadoTotem(t.ctx)).toMatchObject({ ok: true, dados: { dispositivo: { estado: "REVOGADO" } } });
    // Nunca o hash do token nem o do PIN.
    expect(JSON.stringify(await obterEstadoTotem(t.ctx))).not.toContain("hash");
  });
});

// ─────────────────────────────────────────────
// Voto infantil
// ─────────────────────────────────────────────

describe("voto infantil", () => {
  it("grava candidato, horário e dispositivo, e nada mais; não audita a escolha", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto", { urna: "ABERTA" });
    const [a, b] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    const antes = Date.now();

    expect(await votarInfantil(t.ctx, { eventoId, candidatoId: a })).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(await votarInfantil(t.ctx, { eventoId, candidatoId: b })).toMatchObject({ ok: true });
    // Cada toque confirmado = um voto (sem edição, sem deduplicar).
    expect(await votarInfantil(t.ctx, { eventoId, candidatoId: a })).toMatchObject({ ok: true });

    const votos = await db().votoInfantil.findMany({ where: { eventoId }, orderBy: { id: "asc" } });
    expect(votos.map((v) => v.candidatoId)).toEqual([a, b, a]);
    for (const v of votos) {
      expect(v.dispositivoId).toBe(t.id);
      expect(v.criadoEm.getTime()).toBeGreaterThanOrEqual(antes - 1000);
      // Sem referência a usuário ou a qualquer dado da criança.
      expect(Object.keys(v).sort()).toEqual(["candidatoId", "criadoEm", "dispositivoId", "eventoId", "id"]);
    }
    const aparelho = await db().dispositivo.findUniqueOrThrow({ where: { id: t.id } });
    expect(aparelho.ultimoUsoEm).not.toBeNull();

    // Nenhuma auditoria de voto, nem a escolha em lugar nenhum.
    const auditoria = await db().auditoria.findMany({ where: { eventoId } });
    expect(auditoria.map((x) => x.acao).sort()).toEqual(["CODIGO_PAREAMENTO_GERADO", "DISPOSITIVO_PAREADO"]);
    expect(JSON.stringify(auditoria)).not.toContain(a);
  });

  it("sem cookie, com token falso ou de totem de outro evento: DISPOSITIVO_INATIVO", async () => {
    const { eventoId } = await eventoComTotens("teste-totem-voto-aparelho", { urna: "ABERTA" });
    const outro = await eventoComTotens("teste-totem-voto-aparelho-outro", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const doOutro = await criarTotem(outro.admin, outro.eventoId);
    const ip = novoIp();

    expect(await votarInfantil({ headers: new Headers(), ip, cookies: [] }, { eventoId, candidatoId })).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    const falso = { headers: new Headers({ cookie: `${COOKIE_TOTEM}=${randomBytes(32).toString("base64url")}` }), ip, cookies: [] };
    expect(await votarInfantil(falso, { eventoId, candidatoId })).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    // Token válido, mas pareado com outro evento.
    expect(await votarInfantil(doOutro.ctx, { eventoId, candidatoId })).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    // O cliente não escolhe o aparelho: não existe campo para isso.
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(0);
  });

  it("pausar e revogar valem na hora; retomar volta; revogado é definitivo", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-estado", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    const ctx = { ip: t.ip };
    const votar = () => votarInfantil(t.ctx, { eventoId, candidatoId });

    expect((await votar()).ok).toBe(true);
    expect(await pausarDispositivo(admin, eventoId, t.id, ctx)).toMatchObject({ ok: true });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    expect(await reativarDispositivo(admin, eventoId, t.id, ctx)).toMatchObject({ ok: true });
    expect((await votar()).ok).toBe(true);

    expect(await revogarDispositivo(admin, eventoId, t.id, { motivo: "Tablet perdido no hall" }, ctx)).toMatchObject({ ok: true });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    expect(await reativarDispositivo(admin, eventoId, t.id, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect(await pausarDispositivo(admin, eventoId, t.id, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    // Só os votos aceitos antes ficaram.
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(2);
  });

  it("segue o estado da urna e do evento: não iniciada, encerrada, concluído, rascunho e módulo desligado", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-urna", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    const votar = () => votarInfantil(t.ctx, { eventoId, candidatoId });

    await db().evento.update({ where: { id: eventoId }, data: { estadoUrna: "NAO_INICIADA" } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "URNA_NAO_ABERTA" } });
    await db().evento.update({ where: { id: eventoId }, data: { estadoUrna: "ABERTA", moduloInfantil: false } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
    await db().evento.update({ where: { id: eventoId }, data: { moduloInfantil: true, estado: "RASCUNHO" } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
    await db().evento.update({ where: { id: eventoId }, data: { estado: "ATIVO", estadoUrna: "ENCERRADA" } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    await db().evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO" } });
    expect(await votar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(0);

    await db().evento.update({ where: { id: eventoId }, data: { estado: "ATIVO", estadoUrna: "ABERTA" } });
    expect((await votar()).ok).toBe(true);
  });

  it("só vota em candidato publicado, na disputa e do próprio evento", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-candidato", { urna: "ABERTA" });
    const [ok, rascunho, fora] = await criarCandidatos(eventoId, 3);
    await db().candidato.update({ where: { id: rascunho }, data: { publicado: false } });
    await db().candidato.update({ where: { id: fora }, data: { desqualificado: true } });
    const outro = await semearEvento("teste-totem-voto-candidato-outro", { urna: "ABERTA" });
    const [doOutro] = await criarCandidatos(outro, 1);
    const t = await criarTotem(admin, eventoId);

    for (const candidatoId of [rascunho, fora, doOutro, randomUUID()])
      expect(await votarInfantil(t.ctx, { eventoId, candidatoId })).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect((await votarInfantil(t.ctx, { eventoId, candidatoId: ok })).ok).toBe(true);
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(1);
  });

  it("20 toques simultâneos do mesmo totem viram 20 votos, sem travar", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-corrida", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    const rs = await Promise.all(Array.from({ length: 20 }, () => votarInfantil(t.ctx, { eventoId, candidatoId })));
    expect(rs.every((r) => r.ok)).toBe(true);
    expect(await db().votoInfantil.count({ where: { dispositivoId: t.id } })).toBe(20);
  });

  it("pausar no meio de uma rajada: o que foi aceito está no banco e nada entra depois", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-pausa", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    const [rs] = await Promise.all([
      Promise.all(Array.from({ length: 12 }, () => votarInfantil(t.ctx, { eventoId, candidatoId }))),
      pausarDispositivo(admin, eventoId, t.id, { ip: t.ip }),
    ]);
    const aceitos = rs.filter((r) => r.ok).length;
    expect(await db().votoInfantil.count({ where: { dispositivoId: t.id } })).toBe(aceitos);
    expect(await votarInfantil(t.ctx, { eventoId, candidatoId })).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
    expect(await db().votoInfantil.count({ where: { dispositivoId: t.id } })).toBe(aceitos);
  });

  it("encerrar a urna no meio de uma rajada: o resultado congelado tem exatamente os votos aceitos", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-voto-encerra", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const a = await criarTotem(admin, eventoId);
    const b = await criarTotem(admin, eventoId);
    const votos = Array.from({ length: 10 }, (_, i) => votarInfantil((i % 2 ? a : b).ctx, { eventoId, candidatoId }));
    const [rs, encerrou] = await Promise.all([Promise.all(votos), encerrarUrna(admin, eventoId)]);
    expect(encerrou).toMatchObject({ ok: true });

    const aceitos = rs.filter((r) => r.ok).length;
    const naoAceitos = rs.filter((r) => !r.ok);
    for (const r of naoAceitos) expect(r).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(aceitos);
    const resultado = await obterResultado(admin, eventoId);
    expect(resultado).toMatchObject({ ok: true, dados: { versao: 1, dados: { totais: { INFANTIL: aceitos } } } });
  });
});

// ─────────────────────────────────────────────
// PIN de saída do quiosque
// ─────────────────────────────────────────────

describe("PIN de saída do quiosque", () => {
  it("só o PIN do admin sai; o errado é recusado e o PIN nunca vai à auditoria", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-pin", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);

    expect(await conferirPinTotem(t.ctx, { pin: "00000000" })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS", mensagem: "PIN incorreto." } });
    expect(await conferirPinTotem(t.ctx, { pin: "" })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    expect(await conferirPinTotem(t.ctx, { pin: PIN })).toEqual({ ok: true, dados: null });
    expect(JSON.stringify(await db().auditoria.findMany({ where: { eventoId } }))).not.toContain(PIN);
    // Aparelho sem totem pareado não tem quiosque a proteger.
    expect(await conferirPinTotem({ headers: new Headers(), ip: novoIp(), cookies: [] }, { pin: "0" })).toEqual({ ok: true, dados: null });
  });

  it("cinco PINs errados bloqueiam o aparelho por 60 s (inclusive para o PIN certo); trocar o PIN libera", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-pin-bloqueio", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);
    for (let i = 0; i < 5; i++) expect(await conferirPinTotem(t.ctx, { pin: `1000000${i}` })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    expect(await conferirPinTotem(t.ctx, { pin: "10000009" })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    expect(await conferirPinTotem(t.ctx, { pin: PIN })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    const bloqueios = await auditoriaDe(eventoId, "BLOQUEIO_RATE_LIMIT");
    expect(bloqueios).toHaveLength(1);
    expect(bloqueios[0]).toMatchObject({ atorDispositivoId: t.id, detalhes: { alvo: "PIN_TOTEM" } });

    expect(await alterarPinDispositivo(admin, eventoId, t.id, "55667788", { ip: t.ip })).toMatchObject({ ok: true });
    expect(await conferirPinTotem(t.ctx, { pin: PIN })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    expect(await conferirPinTotem(t.ctx, { pin: "55667788" })).toEqual({ ok: true, dados: null });
  });

  it("um totem revogado também sai do quiosque com o PIN", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-pin-revogado", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);
    await revogarDispositivo(admin, eventoId, t.id, {}, { ip: t.ip });
    expect(await conferirPinTotem(t.ctx, { pin: PIN })).toEqual({ ok: true, dados: null });
    expect(await conferirPinTotem(t.ctx, { pin: "00000000" })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
  });
});

// ─────────────────────────────────────────────
// Gestão pelo admin
// ─────────────────────────────────────────────

describe("gestão dos totens pelo admin", () => {
  it("a lista traz estado, último uso, votos e se tem PIN, sem hash nenhum", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-lista", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const a = await criarTotem(admin, eventoId, { nome: "Totem A" });
    const b = await criarTotem(admin, eventoId, { nome: "Totem B" });
    await votarInfantil(a.ctx, { eventoId, candidatoId });
    await votarInfantil(a.ctx, { eventoId, candidatoId });
    await pausarDispositivo(admin, eventoId, b.id, { ip: a.ip });
    await db().dispositivo.update({ where: { id: b.id }, data: { hashPin: null } });

    const r = await listarDispositivos(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.map((d) => ({ nome: d.nome, estado: d.estado, votos: d.votos, temPin: d.temPin }))).toEqual([
      { nome: "Totem A", estado: "ATIVO", votos: 2, temPin: true },
      { nome: "Totem B", estado: "PAUSADO", votos: 0, temPin: false },
    ]);
    expect(r.dados[0].ultimoUsoEm).not.toBeNull();
    expect(r.dados[1].ultimoUsoEm).toBeNull();
    expect(JSON.stringify(r.dados)).not.toContain("hash");
  });

  it("só o admin do próprio evento gerencia; totem de outro evento não existe para ele", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-acesso", { urna: "ABERTA" });
    const outro = await eventoComTotens("teste-totem-gestao-acesso-outro", { urna: "ABERTA" });
    const publico = await criarUsuarioDireto(eventoId);
    const t = await criarTotem(admin, eventoId);
    const ctx = { ip: t.ip };

    for (const quem of [publico, outro.admin, null]) {
      const nao = { ok: false, erro: { codigo: "NAO_AUTORIZADO" } };
      expect(await listarDispositivos(quem, eventoId)).toMatchObject(nao);
      expect(await pausarDispositivo(quem, eventoId, t.id, ctx)).toMatchObject(nao);
      expect(await reativarDispositivo(quem, eventoId, t.id, ctx)).toMatchObject(nao);
      expect(await revogarDispositivo(quem, eventoId, t.id, {}, ctx)).toMatchObject(nao);
      expect(await renomearDispositivo(quem, eventoId, t.id, "Invasor")).toMatchObject(nao);
      expect(await alterarPinDispositivo(quem, eventoId, t.id, "11112222", ctx)).toMatchObject(nao);
      expect(await gerarCodigoPareamento(quem, eventoId, { nome: "Invasor", pin: PIN }, ctx)).toMatchObject(nao);
    }
    // O admin do outro evento não alcança este totem pelo id dele.
    const nada = { ok: false, erro: { codigo: "NAO_ENCONTRADO" } };
    expect(await pausarDispositivo(outro.admin, outro.eventoId, t.id, ctx)).toMatchObject(nada);
    expect(await renomearDispositivo(outro.admin, outro.eventoId, t.id, "Invasor")).toMatchObject(nada);
    expect(await alterarPinDispositivo(outro.admin, outro.eventoId, t.id, "11112222", ctx)).toMatchObject(nada);
    expect(await db().dispositivo.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ estado: "ATIVO", nome: t.nome });
  });

  it("pausar, retomar e revogar repetidos não mudam nada nem auditam de novo; o motivo da revogação fica na auditoria", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-auditoria", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);
    const ctx = { ip: t.ip };

    await pausarDispositivo(admin, eventoId, t.id, ctx);
    await pausarDispositivo(admin, eventoId, t.id, ctx);
    expect(await auditoriaDe(eventoId, "DISPOSITIVO_PAUSADO")).toHaveLength(1);
    await reativarDispositivo(admin, eventoId, t.id, ctx);
    await reativarDispositivo(admin, eventoId, t.id, ctx);
    expect(await auditoriaDe(eventoId, "DISPOSITIVO_REATIVADO")).toHaveLength(1);

    await revogarDispositivo(admin, eventoId, t.id, { motivo: "  Tablet perdido  " }, ctx);
    expect(await revogarDispositivo(admin, eventoId, t.id, {}, ctx)).toMatchObject({ ok: true });
    const revogacoes = await auditoriaDe(eventoId, "DISPOSITIVO_REVOGADO");
    expect(revogacoes).toHaveLength(1);
    expect(revogacoes[0]).toMatchObject({ atorUsuarioId: admin.id, entidadeId: t.id, detalhes: { motivo: "Tablet perdido" } });
    // Revogado não troca de PIN, mas ainda pode ser renomeado (é só o rótulo na lista).
    expect(await alterarPinDispositivo(admin, eventoId, t.id, "11112222", ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect(await renomearDispositivo(admin, eventoId, t.id, "Totem antigo")).toMatchObject({ ok: true });
  });

  it("renomear valida, não repete nome (sem diferenciar maiúsculas) e audita de/para", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-nome", { urna: "ABERTA" });
    const a = await criarTotem(admin, eventoId, { nome: "Totem Hall" });
    const b = await criarTotem(admin, eventoId, { nome: "Totem Pátio" });

    expect(await renomearDispositivo(admin, eventoId, b.id, "X")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { nome: expect.any(String) } } });
    expect(await renomearDispositivo(admin, eventoId, b.id, "totem hall")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { nome: "Já existe um totem com este nome." } } });
    expect(await renomearDispositivo(admin, eventoId, a.id, "Totem Hall")).toMatchObject({ ok: true });
    expect(await auditoriaDe(eventoId, "DISPOSITIVO_RENOMEADO")).toHaveLength(0);

    expect(await renomearDispositivo(admin, eventoId, b.id, "  Totem Entrada ")).toMatchObject({ ok: true });
    expect((await db().dispositivo.findUniqueOrThrow({ where: { id: b.id } })).nome).toBe("Totem Entrada");
    const renomeados = await auditoriaDe(eventoId, "DISPOSITIVO_RENOMEADO");
    expect(renomeados).toHaveLength(1);
    expect(renomeados[0].detalhes).toEqual({ de: "Totem Pátio", para: "Totem Entrada" });
    // O nome de um totem já pareado também barra um código novo com o mesmo nome.
    expect(await gerarCodigoPareamento(admin, eventoId, { nome: "totem entrada", pin: PIN }, { ip: a.ip })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });

  it("trocar o PIN audita sem o PIN, valida o formato e só vale para o totem certo", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-pin", { urna: "ABERTA" });
    const a = await criarTotem(admin, eventoId);
    const b = await criarTotem(admin, eventoId);
    const ctx = { ip: a.ip };

    for (const pin of ["123", "abcdef", "123456789"]) expect(await alterarPinDispositivo(admin, eventoId, a.id, pin, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { pin: expect.any(String) } } });
    expect(await alterarPinDispositivo(admin, eventoId, a.id, "24681357", ctx)).toMatchObject({ ok: true });
    expect(await conferirPinTotem(a.ctx, { pin: "24681357" })).toMatchObject({ ok: true });
    expect(await conferirPinTotem(b.ctx, { pin: "24681357" })).toMatchObject({ ok: false });
    expect(await conferirPinTotem(b.ctx, { pin: PIN })).toMatchObject({ ok: true });
    const trocas = await auditoriaDe(eventoId, "PIN_DISPOSITIVO_ALTERADO");
    expect(trocas).toHaveLength(1);
    expect(JSON.stringify(await db().auditoria.findMany({ where: { eventoId } }))).not.toContain("24681357");
  });

  it("depois de concluído, só leitura", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-gestao-concluido", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);
    await db().evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    const ctx = { ip: t.ip };
    expect((await listarDispositivos(admin, eventoId)).ok).toBe(true);
    const concluido = { ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } };
    expect(await pausarDispositivo(admin, eventoId, t.id, ctx)).toMatchObject(concluido);
    expect(await revogarDispositivo(admin, eventoId, t.id, {}, ctx)).toMatchObject(concluido);
    expect(await renomearDispositivo(admin, eventoId, t.id, "Outro nome")).toMatchObject(concluido);
    expect(await alterarPinDispositivo(admin, eventoId, t.id, "11112222", ctx)).toMatchObject(concluido);
    expect(await votarInfantil(t.ctx, { eventoId, candidatoId: randomUUID() })).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
  });
});

// ─────────────────────────────────────────────
// Apuração, painel, exportação e estado público
// ─────────────────────────────────────────────

describe("apuração e painel", () => {
  it("o placar infantil é separado e entra na fórmula com o peso; o painel só mostra totais durante a votação", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-apuracao", { urna: "ABERTA", pesoInfantil: 40 });
    const [a, b, c] = await criarCandidatos(eventoId, 3);
    const hall = await criarTotem(admin, eventoId, { nome: "Totem Hall" });
    const patio = await criarTotem(admin, eventoId, { nome: "Totem Pátio" });
    // Público: A 3 votos, B 1. Infantil: B 2 votos (um em cada totem).
    await db().voto.createMany({
      data: [a, a, a, b].map((candidatoId) => ({ eventoId, candidatoId, hashRecibo: randomBytes(32).toString("hex") })),
    });
    await votarInfantil(hall.ctx, { eventoId, candidatoId: b });
    await votarInfantil(patio.ctx, { eventoId, candidatoId: b });

    const painel = await obterOperacao(admin, eventoId);
    expect(painel.ok).toBe(true);
    if (!painel.ok) return;
    expect(painel.dados.modulos.infantil).toBe(true);
    expect(painel.dados.totais).toEqual({ POPULAR: 4, JURI: 0, INFANTIL: 2 });
    expect(painel.dados.totens.map((t) => ({ nome: t.nome, estado: t.estado, votos: t.votos }))).toEqual([
      { nome: "Totem Hall", estado: "ATIVO", votos: 1 },
      { nome: "Totem Pátio", estado: "ATIVO", votos: 1 },
    ]);
    expect(painel.dados.serie.pontos.reduce((s, p) => s + p.infantil, 0)).toBe(2);
    // Sem contagem por candidato durante a votação, nem pela resposta de rede.
    expect(painel.dados.parcial).toBeNull();
    expect(JSON.stringify(painel.dados)).not.toContain(b);

    expect(await encerrarUrna(admin, eventoId)).toMatchObject({ ok: true });
    const resultado = await obterResultado(admin, eventoId);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const { dados, pesos } = resultado.dados;
    expect(pesos).toEqual({ POPULAR: 60, JURI: 0, INFANTIL: 40 });
    expect(dados.totais).toEqual({ POPULAR: 4, JURI: 0, INFANTIL: 2 });
    expect(dados.placares.INFANTIL).toEqual([
      { candidatoId: b, votos: 2 },
      { candidatoId: a, votos: 0 },
      { candidatoId: c, votos: 0 },
    ]);
    // B: 60 × 1/4 + 40 × 2/2 = 55. A: 60 × 3/4 = 45. C: 0.
    expect(dados.ranking.map((r) => ({ id: r.candidatoId, pontos: r.pontuacao, posicao: r.posicao }))).toEqual([
      { id: b, pontos: 55, posicao: 1 },
      { id: a, pontos: 45, posicao: 2 },
      { id: c, pontos: 0, posicao: 3 },
    ]);
    expect(dados.ranking[0].pontosPorGrupo).toMatchObject({ POPULAR: 15, INFANTIL: 40 });
    expect(dados.categorias.find((x) => x.grupo === "INFANTIL")?.vencedores).toEqual([{ candidatoId: b, votos: 2 }]);
  });

  it("os votos de um totem revogado continuam contando", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-apuracao-revogado", { urna: "ABERTA" });
    const [a, b] = await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId);
    await votarInfantil(t.ctx, { eventoId, candidatoId: a });
    await revogarDispositivo(admin, eventoId, t.id, {}, { ip: t.ip });
    await votarInfantil(t.ctx, { eventoId, candidatoId: b });
    await encerrarUrna(admin, eventoId);
    const resultado = await obterResultado(admin, eventoId);
    expect(resultado).toMatchObject({ ok: true, dados: { dados: { totais: { INFANTIL: 1 } } } });
  });

  it("com o módulo desligado, o infantil não entra no resultado nem no painel", async () => {
    const eventoId = await semearEvento("teste-totem-apuracao-desligado", { urna: "ABERTA" });
    const admin = await criarAdminDireto(eventoId);
    const [a] = await criarCandidatos(eventoId, 2);
    await db().voto.create({ data: { eventoId, candidatoId: a, hashRecibo: randomBytes(32).toString("hex") } });
    const painel = await obterOperacao(admin, eventoId);
    expect(painel).toMatchObject({ ok: true, dados: { modulos: { infantil: false }, totais: { INFANTIL: 0 }, totens: [] } });
    await encerrarUrna(admin, eventoId);
    const resultado = await obterResultado(admin, eventoId);
    if (!resultado.ok) throw new Error("sem resultado");
    expect(resultado.dados.dados.totais.INFANTIL).toBe(0);
    expect(resultado.dados.dados.placares.INFANTIL).toEqual([]);
    expect(resultado.dados.pesos.INFANTIL).toBe(0);
    expect(await prepararExportacao(admin, eventoId, "dispositivos", { ip: novoIp() })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });

  it("o CSV de totens traz estado, último uso e votos, e a série por minuto traz o infantil", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-exportacao", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const a = await criarTotem(admin, eventoId, { nome: "Totem A" });
    const b = await criarTotem(admin, eventoId, { nome: "Totem B" });
    await votarInfantil(a.ctx, { eventoId, candidatoId });
    await votarInfantil(a.ctx, { eventoId, candidatoId });
    await pausarDispositivo(admin, eventoId, b.id, { ip: a.ip });

    const r = await prepararExportacao(admin, eventoId, "dispositivos", { ip: a.ip });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.nome).toMatch(/^.*dispositivos.*\.csv$/);
    expect(r.dados.cabecalho).toEqual(["dispositivo", "estado", "ultimo_uso", "votos"]);
    expect(r.dados.linhas).toHaveLength(2);
    expect(r.dados.linhas[0]).toEqual(["Totem A", "Ativo", expect.any(String), 2]);
    expect(r.dados.linhas[1]).toEqual(["Totem B", "Pausado", null, 0]);
    expect(await auditoriaDe(eventoId, "EXPORTACAO_CSV")).toHaveLength(1);

    const serie = await prepararExportacao(admin, eventoId, "votos_por_minuto", { ip: a.ip });
    expect(serie.ok && serie.dados.cabecalho).toContain("infantil");
  });
});

describe("estado público e checklist", () => {
  it("o admin recebe os totens (sem hash); o público, não", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-publico", { urna: "ABERTA" });
    await criarCandidatos(eventoId, 2);
    const t = await criarTotem(admin, eventoId, { nome: "Totem Hall" });
    const publico = await criarUsuarioDireto(eventoId);
    invalidarEstadoPublico();

    const doAdmin = (await montarEstadoPublico(admin)).eventos.find((e) => e.evento.id === eventoId);
    expect(doAdmin?.dispositivos).toEqual([expect.objectContaining({ id: t.id, nome: "Totem Hall", estado: "ATIVO", eventoId })]);
    expect(JSON.stringify(doAdmin?.dispositivos)).not.toMatch(/hash/i);
    for (const quem of [publico, null]) {
      const visto = (await montarEstadoPublico(quem)).eventos.find((e) => e.evento.id === eventoId);
      expect(visto?.dispositivos).toEqual([]);
    }
  });

  it("o checklist de ativação conta os totens ativos", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-checklist");
    expect((await entradaDoChecklist(eventoId))?.dispositivosAtivos).toBe(0);
    const a = await criarTotem(admin, eventoId);
    await criarTotem(admin, eventoId);
    expect((await entradaDoChecklist(eventoId))?.dispositivosAtivos).toBe(2);
    await pausarDispositivo(admin, eventoId, a.id, { ip: a.ip });
    expect((await entradaDoChecklist(eventoId))?.dispositivosAtivos).toBe(1);
    await alternarModuloInfantil(admin, eventoId, false, { ip: a.ip });
    expect((await entradaDoChecklist(eventoId))?.dispositivosAtivos).toBe(0);
  });
});

// ─────────────────────────────────────────────
// Fronteira RPC
// ─────────────────────────────────────────────

describe("fronteira RPC do totem", () => {
  it("o aparelho vem só do cookie: o cookie sai na resposta do pareamento e um id enviado a mais não vale", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-rpc", { urna: "ABERTA" });
    const [candidatoId] = await criarCandidatos(eventoId, 2);
    const ip = novoIp();
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem RPC", pin: PIN }, { ip });
    if (!gerado.ok) throw new Error("não gerou");
    const outro = await criarTotem(admin, eventoId);

    const pareamento: ContextoRpc = { headers: new Headers(), ip, cookies: [] };
    const r = await executarServico("parearTotem", { eventoId, codigo: gerado.dados.codigo }, pareamento);
    expect(r).toMatchObject({ ok: true, dados: { dispositivo: { nome: "Totem RPC", estado: "ATIVO" } } });
    if (!r.ok) return;
    const pareado = (r.dados as { dispositivo: { id: string } }).dispositivo;
    expect(pareamento.cookies).toHaveLength(1);
    expect(pareamento.cookies[0]).toContain("HttpOnly");

    const ctx = (): ContextoRpc => ({ headers: new Headers({ cookie: cookieDe(pareamento.cookies) }), ip, cookies: [] });
    expect(await executarServico("obterEstadoTotem", undefined, ctx())).toMatchObject({ ok: true, dados: { dispositivo: { id: pareado.id, estado: "ATIVO" } } });

    // Mesmo com o id de outro totem nos argumentos, o voto é do aparelho do cookie.
    expect(await executarServico("votarInfantil", { eventoId, candidatoId, dispositivoId: outro.id }, ctx())).toMatchObject({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(await db().votoInfantil.count({ where: { dispositivoId: pareado.id } })).toBe(1);
    expect(await db().votoInfantil.count({ where: { dispositivoId: outro.id } })).toBe(0);
    expect(await executarServico("votarInfantil", { eventoId }, ctx())).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });

    expect(await executarServico("conferirPinTotem", { pin: "00000000" }, ctx())).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    expect(await executarServico("conferirPinTotem", { pin: PIN }, ctx())).toMatchObject({ ok: true });
  });

  it("a gestão pelo RPC exige a sessão do admin: o cookie do totem e a falta de sessão não abrem nada", async () => {
    const { eventoId, admin } = await eventoComTotens("teste-totem-rpc-admin", { urna: "ABERTA" });
    const t = await criarTotem(admin, eventoId);
    const semSessao: ContextoRpc = { headers: new Headers(), ip: novoIp(), cookies: [] };
    const comCookieDoTotem: ContextoRpc = { headers: new Headers({ cookie: cookieDe(t.cookies) }), ip: t.ip, cookies: [] };
    const nao = { ok: false, erro: { codigo: "NAO_AUTORIZADO" } };

    for (const ctx of [semSessao, comCookieDoTotem]) {
      expect(await executarServico("listarDispositivos", { eventoId }, ctx)).toMatchObject(nao);
      expect(await executarServico("gerarCodigoPareamento", { eventoId, nome: "Invasor", pin: PIN }, ctx)).toMatchObject(nao);
      expect(await executarServico("pausarDispositivo", { eventoId, dispositivoId: t.id }, ctx)).toMatchObject(nao);
      expect(await executarServico("revogarDispositivo", { eventoId, dispositivoId: t.id }, ctx)).toMatchObject(nao);
      expect(await executarServico("renomearDispositivo", { eventoId, dispositivoId: t.id, nome: "Invasor" }, ctx)).toMatchObject(nao);
      expect(await executarServico("alterarPinDispositivo", { eventoId, dispositivoId: t.id, pin: "11112222" }, ctx)).toMatchObject(nao);
      expect(await executarServico("alternarModuloInfantil", { eventoId, ligado: false }, ctx)).toMatchObject(nao);
    }
    expect(await db().dispositivo.findUniqueOrThrow({ where: { id: t.id } })).toMatchObject({ estado: "ATIVO", nome: t.nome });
    expect(await executarServico("listarDispositivos", { eventoId: "" }, semSessao)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });
});
