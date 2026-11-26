import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { OPCOES_RESET_VAZIAS } from "@/dominio/resetEvento";
import { funilVazio } from "@/dominio/sessaoTotem";
import { novoIdEnvio } from "@/dominio/totem";
import { db, desconectarBanco } from "@/server/db";
import { gerarCodigoPareamento } from "@/server/dispositivos";
import { resetarEvento } from "@/server/operacao";
import {
  abrirSessaoTotem,
  analisarTotem,
  configurarTotem,
  encerrarSessaoTotem,
  parearTotem,
  sincronizarTotem,
  votarInfantil,
  type ContextoTotem,
} from "@/server/totem";
import { cookieDe, criarAdminDireto, criarCandidatos, ligarInfantil, semearEvento } from "./apoio";

// Sessões do totem (logTotem.md, 26/11/2026) contra um PostgreSQL de verdade: o voto abre a sessão e devolve o contador, a
// inatividade encerra e abre a seguinte, o menu do PIN encerra/abre/configura, a análise nunca traz o item votado e o funil
// só entra na sessão do próprio aparelho.

const PIN = "24681357";

afterAll(async () => {
  await desconectarBanco();
});

let sequenciaIp = 0;
const novoIp = () => `198.51.101.${(++sequenciaIp % 250) + 1}`;

async function eventoComTotem(slug: string) {
  const eventoId = await semearEvento(slug, { ativo: true, urna: "ABERTA" });
  await ligarInfantil(eventoId);
  await db().categoria.updateMany({ where: { eventoId }, data: { canal: "TOTEM" } });
  const admin = await criarAdminDireto(eventoId);
  const candidatos = await criarCandidatos(eventoId, 3);
  const categoriaIds = (await db().categoria.findMany({ where: { eventoId, canal: "TOTEM" }, select: { id: true } })).map((c) => c.id);
  async function novoTotem(): Promise<{ id: string; ctx: ContextoTotem }> {
    const ip = novoIp();
    const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: `Totem ${randomUUID().slice(0, 6)}`, pin: PIN, categoriaIds }, { ip });
    if (!gerado.ok) throw new Error(gerado.erro.mensagem);
    const cookies: string[] = [];
    const pareado = await parearTotem({ headers: new Headers(), ip, cookies }, { eventoId, codigo: gerado.dados.codigo });
    if (!pareado.ok) throw new Error(pareado.erro.mensagem);
    return { id: pareado.dados.dispositivo.id, ctx: { headers: new Headers({ cookie: cookieDe(cookies) }), ip, cookies: [] } };
  }
  return { eventoId, admin, candidatos, novoTotem };
}

function idsDe(candidatos: unknown): string[] {
  return candidatos as string[];
}

async function votar(ctx: ContextoTotem, eventoId: string, candidatoId: string, idEnvio = novoIdEnvio()) {
  const r = await votarInfantil(ctx, { eventoId, candidatoId, idEnvio });
  if (!r.ok) throw new Error(`voto recusado: ${r.erro.codigo}`);
  if (!r.dados.sessaoId) throw new Error("voto sem sessão");
  return { ...r.dados, sessaoId: r.dados.sessaoId };
}

describe("sessões no voto", () => {
  it("o 1º voto abre a sessão 1 e cada voto devolve o contador da sessão e do aparelho", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-contador");
    const [a, b] = idsDe(candidatos);
    const totem = await novoTotem();

    const v1 = await votar(totem.ctx, eventoId, a!);
    expect(v1).toMatchObject({ resultado: "REGISTRADO", numeroSessao: 1, votosSessao: 1, votosTotal: 1 });
    const v2 = await votar(totem.ctx, eventoId, b!);
    expect(v2).toMatchObject({ numeroSessao: 1, votosSessao: 2, votosTotal: 2, sessaoId: v1.sessaoId });
    expect(await db().sessaoTotem.count({ where: { dispositivoId: totem.id } })).toBe(1);
  });

  it("o reenvio com a mesma chave não conta outro voto e devolve o mesmo contador", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-reenvio");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    const chave = novoIdEnvio();
    const primeiro = await votar(totem.ctx, eventoId, a!, chave);
    const reenvio = await votar(totem.ctx, eventoId, a!, chave);
    expect(reenvio).toMatchObject({ votosSessao: 1, votosTotal: 1, sessaoId: primeiro.sessaoId });
  });

  it("parado além do limite do aparelho: o voto encerra a sessão (INATIVIDADE, no horário do último voto) e abre a próxima", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-inatividade");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    const v1 = await votar(totem.ctx, eventoId, a!);
    // Padrão: 60 min. O voto da sessão 1 "aconteceu" há 61 min.
    expect((await db().dispositivo.findUniqueOrThrow({ where: { id: totem.id } })).inatividadeSessaoMin).toBe(60);
    const antigo = new Date(Date.now() - 61 * 60_000);
    await db().votoInfantil.updateMany({ where: { sessaoId: v1.sessaoId }, data: { criadoEm: antigo } });
    await db().sessaoTotem.update({ where: { id: v1.sessaoId }, data: { abertaEm: antigo } });

    const v2 = await votar(totem.ctx, eventoId, a!);
    expect(v2).toMatchObject({ numeroSessao: 2, votosSessao: 1, votosTotal: 2 });
    const s1 = await db().sessaoTotem.findUniqueOrThrow({ where: { id: v1.sessaoId } });
    expect(s1).toMatchObject({ motivoEncerramento: "INATIVIDADE", encerradaEm: antigo });
  });

  it("dentro do limite, a mesma sessão continua", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-dentro");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    const v1 = await votar(totem.ctx, eventoId, a!);
    await db().votoInfantil.updateMany({ where: { sessaoId: v1.sessaoId }, data: { criadoEm: new Date(Date.now() - 59 * 60_000) } });
    expect(await votar(totem.ctx, eventoId, a!)).toMatchObject({ numeroSessao: 1, votosSessao: 2 });
  });
});

describe("menu do PIN", () => {
  it("encerrar devolve o resumo; o voto seguinte abre a próxima sozinho (a sessão nunca trava o voto)", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-encerrar");
    const [a, b] = idsDe(candidatos);
    const totem = await novoTotem();
    await votar(totem.ctx, eventoId, a!);
    await votar(totem.ctx, eventoId, b!);
    await votar(totem.ctx, eventoId, a!);

    const r = await encerrarSessaoTotem(totem.ctx, { pin: PIN });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.resumo).toMatchObject({ numero: 1, votos: 3, votosAntes: 0, motivo: "MANUAL", variacaoAnterior: null });
    expect(r.dados.resumo.intervalos?.quantidade).toBe(2);

    // Sem sessão aberta: encerrar de novo avisa, e o voto abre a 2.
    expect(await encerrarSessaoTotem(totem.ctx, { pin: PIN })).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
    expect(await votar(totem.ctx, eventoId, a!)).toMatchObject({ numeroSessao: 2, votosSessao: 1, votosTotal: 4 });

    const r2 = await encerrarSessaoTotem(totem.ctx, { pin: PIN });
    expect(r2.ok && r2.dados.resumo).toMatchObject({ numero: 2, votos: 1, votosAntes: 3, variacaoAnterior: -66.7 });
  });

  it("abrir com crianças esperadas: o resumo mostra o percentual; abrir com uma aberta só atualiza as esperadas", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-esperadas");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    const aberta = await abrirSessaoTotem(totem.ctx, { pin: PIN, criancasEsperadas: 4 });
    expect(aberta).toMatchObject({ ok: true, dados: { numero: 1 } });
    expect(await abrirSessaoTotem(totem.ctx, { pin: PIN, criancasEsperadas: 5 })).toMatchObject({ ok: true, dados: { numero: 1 } });
    await votar(totem.ctx, eventoId, a!);
    await votar(totem.ctx, eventoId, a!);
    const r = await encerrarSessaoTotem(totem.ctx, { pin: PIN });
    expect(r.ok && r.dados.resumo).toMatchObject({ votos: 2, criancasEsperadas: 5, percentualEsperadas: 40 });
  });

  it("PIN errado recusa tudo e conta para o bloqueio", async () => {
    const { novoTotem } = await eventoComTotem("sessao-pin");
    const totem = await novoTotem();
    expect(await analisarTotem(totem.ctx, { pin: "00000000" })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    expect(await encerrarSessaoTotem(totem.ctx, { pin: "00000000" })).toMatchObject({ ok: false });
    expect(await configurarTotem(totem.ctx, { pin: "00000000", inatividadeMin: 30 })).toMatchObject({ ok: false });
    for (let i = 0; i < 3; i++) await analisarTotem(totem.ctx, { pin: "00000000" });
    expect(await analisarTotem(totem.ctx, { pin: PIN })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
  });

  it("sem cookie de totem, o menu não responde", async () => {
    const semCookie: ContextoTotem = { headers: new Headers(), ip: novoIp(), cookies: [] };
    expect(await analisarTotem(semCookie, { pin: PIN })).toMatchObject({ ok: false, erro: { codigo: "DISPOSITIVO_INATIVO" } });
  });

  it("configurar a inatividade muda o limite do aparelho", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-configurar");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    expect(await configurarTotem(totem.ctx, { pin: PIN, inatividadeMin: 10 })).toMatchObject({ ok: true, dados: { inatividadeMin: 10 } });
    const v1 = await votar(totem.ctx, eventoId, a!);
    await db().votoInfantil.updateMany({ where: { sessaoId: v1.sessaoId }, data: { criadoEm: new Date(Date.now() - 11 * 60_000) } });
    expect(await votar(totem.ctx, eventoId, a!)).toMatchObject({ numeroSessao: 2 });
    const auditoria = await db().auditoria.findFirst({ where: { eventoId, acao: "TOTEM_CONFIGURADO" } });
    expect(auditoria?.detalhes).toEqual({ inatividadeMin: 10 });
  });
});

describe("análise", () => {
  it("traz sessões, intervalos e faixas, e nunca o item votado", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-analise");
    const ids = idsDe(candidatos);
    const totem = await novoTotem();
    await votar(totem.ctx, eventoId, ids[0]!);
    await votar(totem.ctx, eventoId, ids[1]!);
    // Um voto de antes das sessões (sessao_id nulo), como os 96 da 1ª sessão do Festival.
    await db().votoInfantil.create({
      data: { eventoId, candidatoId: ids[2]!, dispositivoId: totem.id, criadoEm: new Date(Date.now() - 3 * 60 * 60_000) },
    });

    const r = await analisarTotem(totem.ctx, { pin: PIN });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados).toMatchObject({ votosTotal: 3, votosSemSessao: 1, inatividadeMin: 60 });
    expect(r.dados.sessoes).toHaveLength(1);
    expect(r.dados.sessoes[0]).toMatchObject({ numero: 1, votos: 2, votosAntes: 1, encerradaEm: null });
    expect(r.dados.faixasAtual.reduce((s, f) => s + f.votos, 0)).toBe(2);
    const json = JSON.stringify(r.dados);
    for (const id of ids) expect(json).not.toContain(id);
    expect(json).not.toMatch(/candidato/i);
  });

  it("o funil do relatório entra só na sessão do próprio aparelho", async () => {
    const { eventoId, candidatos, novoTotem } = await eventoComTotem("sessao-funil");
    const [a] = idsDe(candidatos);
    const t1 = await novoTotem();
    const t2 = await novoTotem();
    const v1 = await votar(t1.ctx, eventoId, a!);
    const funil = { ...funilVazio(), comecou: 5, escolheu: 4, registrado: 1, erros: { REDE: 2 } };

    expect((await sincronizarTotem(t2.ctx, { situacao: "VOTANDO", telaCheia: true, funil: { sessaoId: v1.sessaoId, contagens: funil } })).ok).toBe(true);
    expect((await db().sessaoTotem.findUniqueOrThrow({ where: { id: v1.sessaoId } })).funil).toBeNull();

    await sincronizarTotem(t1.ctx, { situacao: "VOTANDO", telaCheia: true, funil: { sessaoId: v1.sessaoId, contagens: funil } });
    const r = await analisarTotem(t1.ctx, { pin: PIN });
    expect(r.ok && r.dados.sessoes[0]!.funil).toEqual(funil);
    // O relatório antigo, sem funil, continua aceito.
    expect((await sincronizarTotem(t1.ctx, { situacao: "VOTANDO", telaCheia: false })).ok).toBe(true);
  });
});

describe("reset do evento", () => {
  it("apagar votos e totens leva as sessões junto", async () => {
    const { eventoId, admin, candidatos, novoTotem } = await eventoComTotem("sessao-reset");
    const [a] = idsDe(candidatos);
    const totem = await novoTotem();
    await votar(totem.ctx, eventoId, a!);
    const { nome } = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, select: { nome: true } });
    const r = await resetarEvento(admin, eventoId, nome, { ...OPCOES_RESET_VAZIAS, votos: true, totens: true });
    expect(r.ok).toBe(true);
    expect(await db().sessaoTotem.count({ where: { eventoId } })).toBe(0);
  });
});
