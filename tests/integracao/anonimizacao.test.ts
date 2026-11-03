import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as acesso from "@/server/acesso";
import { anonimizarVencidos, emailAnonimo, NOME_ANONIMO } from "@/server/anonimizacao";
import { db, desconectarBanco } from "@/server/db";
import { manutencaoSeNecessario, reiniciarManutencao } from "@/server/manutencao";
import { usuarioDaSessao } from "@/server/sessao";
import { cadastrarPeloFluxo, cookieDe, criarAdminDireto, criarCandidatos, criarUsuarioDireto, novoContexto, semearEvento } from "./apoio";

// Retenção de dados pessoais contra um PostgreSQL de verdade: quem entra, o que muda, o que fica e o que nunca é tocado.

const DIA_MS = 86_400_000;

afterAll(async () => {
  await desconectarBanco();
});

// A rotina age em TODOS os eventos vencidos do banco; os de testes anteriores deste arquivo voltam a "concluídos agora" para não
// entrarem na conta do teste seguinte.
beforeEach(async () => {
  await db().evento.updateMany({ where: { concluidoEm: { not: null } }, data: { concluidoEm: new Date() } });
  reiniciarManutencao();
});

async function eventoConcluido(slug: string, opcoes: { diasAtras?: number; prazo?: number } = {}) {
  const eventoId = await semearEvento(slug);
  await db().evento.update({
    where: { id: eventoId },
    data: {
      estado: "CONCLUIDO",
      estadoUrna: "ENCERRADA",
      concluidoEm: new Date(Date.now() - (opcoes.diasAtras ?? 100) * DIA_MS),
      prazoAnonimizacaoDias: opcoes.prazo ?? 90,
    },
  });
  return eventoId;
}

/** Pessoa com conta de login, sessão e código de e-mail pendente, como quem se cadastrou de verdade. */
async function pessoaComRastros(eventoId: string, papel: "PUBLICO" | "JURADO" | "ADMIN" = "PUBLICO") {
  const u = await criarUsuarioDireto(eventoId, papel, "rastro");
  await db().usuario.update({ where: { id: u.id }, data: { nome: `Fulana ${u.id.slice(0, 6)}`, imagem: "https://exemplo.com/foto.png" } });
  await db().account.create({ data: { userId: u.id, accountId: u.id, providerId: "credential", password: "hash-da-senha" } });
  await db().account.create({ data: { userId: u.id, accountId: `google-${u.id}`, providerId: "google", accessToken: "token-do-google" } });
  await db().session.create({ data: { userId: u.id, token: randomUUID(), expiresAt: new Date(Date.now() + DIA_MS), ipAddress: "198.51.100.9", userAgent: "teste" } });
  await db().verification.create({ data: { identifier: `email-verification-otp-${u.email}`, value: "123456:0", expiresAt: new Date(Date.now() + 60_000) } });
  return u;
}

describe("quem entra e o que muda", () => {
  it("anonimiza nome e e-mail, apaga login, sessão e código pendente, e mantém participação, voto do júri e votos", async () => {
    const e = await eventoConcluido("teste-anon-basico");
    const [cand] = await criarCandidatos(e, 1);
    const publico = await pessoaComRastros(e);
    const jurado = await pessoaComRastros(e, "JURADO");
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } });
    await db().participacao.update({ where: { id: participacao.id }, data: { votou: true } });
    await db().votoJuri.create({ data: { eventoId: e, participacaoId: participacao.id, candidatoId: cand } });
    await db().voto.create({ data: { eventoId: e, candidatoId: cand, hashRecibo: randomUUID().replaceAll("-", "") } });
    // O código de OUTRA pessoa (de um evento em andamento) cujo e-mail só TERMINA igual não pode ser apagado junto.
    const vizinho = await criarUsuarioDireto(await semearEvento("teste-anon-basico-vizinho", { ativo: true }), "PUBLICO", "vizinho");
    await db().usuario.update({ where: { id: vizinho.id }, data: { email: `x${publico.email}` } });
    await db().verification.create({ data: { identifier: `email-verification-otp-x${publico.email}`, value: "999999:0", expiresAt: new Date(Date.now() + 60_000) } });

    const r = await anonimizarVencidos({ executar: true });
    expect(r).toMatchObject({ elegiveis: 2, anonimizados: 2, adminsPreservados: 0, eventosVencidos: [{ slug: "teste-anon-basico" }] });

    for (const u of [publico, jurado]) {
      const depois = await db().usuario.findUniqueOrThrow({ where: { id: u.id } });
      expect(depois).toMatchObject({ nome: NOME_ANONIMO, email: emailAnonimo(u.id), emailVerificado: false, imagem: null });
      expect(depois.anonimizadoEm).not.toBeNull();
      expect(await db().account.count({ where: { userId: u.id } })).toBe(0);
      expect(await db().session.count({ where: { userId: u.id } })).toBe(0);
      expect(await db().verification.count({ where: { identifier: `email-verification-otp-${u.email}` } })).toBe(0);
    }
    // O vizinho e o código dele ficam como estavam.
    expect(await db().verification.count({ where: { identifier: `email-verification-otp-x${publico.email}` } })).toBe(1);
    expect((await db().usuario.findUniqueOrThrow({ where: { id: vizinho.id } })).anonimizadoEm).toBeNull();

    // Fica: a participação (quem votou), o voto identificado do júri e o voto do público.
    expect(await db().participacao.findUniqueOrThrow({ where: { id: participacao.id } })).toMatchObject({ votou: true, papel: "JURADO", usuarioId: jurado.id });
    expect((await db().votoJuri.findFirstOrThrow({ where: { participacaoId: participacao.id } })).candidatoId).toBe(cand);
    expect(await db().voto.count({ where: { eventoId: e } })).toBe(1);
  });

  it("registra na auditoria só a quantidade, sem nome nem e-mail, uma entrada por evento", async () => {
    const e = await eventoConcluido("teste-anon-auditoria");
    const a = await pessoaComRastros(e);
    const b = await pessoaComRastros(e);
    await anonimizarVencidos({ executar: true });
    const linhas = await db().auditoria.findMany({ where: { eventoId: e, acao: "DADOS_ANONIMIZADOS" } });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ atorUsuarioId: null, entidade: "usuario", detalhes: { quantidade: 2 } });
    expect(JSON.stringify(linhas)).not.toContain(a.email);
    expect(JSON.stringify(linhas)).not.toContain(b.id);
  });

  it("a simulação conta e não escreve nada", async () => {
    const e = await eventoConcluido("teste-anon-simulacao");
    const u = await pessoaComRastros(e);
    const r = await anonimizarVencidos({ executar: false });
    expect(r).toMatchObject({ elegiveis: 1, anonimizados: 0 });
    const depois = await db().usuario.findUniqueOrThrow({ where: { id: u.id } });
    expect(depois).toMatchObject({ email: u.email, anonimizadoEm: null });
    expect(await db().account.count({ where: { userId: u.id } })).toBe(2);
    expect(await db().session.count({ where: { userId: u.id } })).toBe(1);
    expect(await db().auditoria.count({ where: { eventoId: e, acao: "DADOS_ANONIMIZADOS" } })).toBe(0);
  });

  it("é idempotente e libera o e-mail antigo para um novo cadastro", async () => {
    const e = await eventoConcluido("teste-anon-idempotente");
    const u = await pessoaComRastros(e);
    expect((await anonimizarVencidos({ executar: true })).anonimizados).toBe(1);
    const segunda = await anonimizarVencidos({ executar: true });
    expect(segunda).toMatchObject({ elegiveis: 0, anonimizados: 0 });
    expect(await db().auditoria.count({ where: { eventoId: e, acao: "DADOS_ANONIMIZADOS" } })).toBe(1);
    // O endereço volta a ficar livre: outra conta pode usá-lo.
    const novo = await db().usuario.create({ data: { nome: "Nova pessoa", email: u.email, emailVerificado: true } });
    expect(novo.email).toBe(u.email);
  });
});

describe("prazo e evento", () => {
  it("respeita o prazo de cada evento e exige o evento concluído", async () => {
    const dentro = await eventoConcluido("teste-anon-prazo-dentro", { diasAtras: 89, prazo: 90 });
    const fora = await eventoConcluido("teste-anon-prazo-fora", { diasAtras: 91, prazo: 90 });
    const curto = await eventoConcluido("teste-anon-prazo-curto", { diasAtras: 31, prazo: 30 });
    const emAndamento = await semearEvento("teste-anon-prazo-andamento", { urna: "ENCERRADA" });
    await db().evento.update({ where: { id: emAndamento }, data: { concluidoEm: new Date(Date.now() - 500 * DIA_MS) } }); // data velha, mas não concluído
    const semData = await semearEvento("teste-anon-prazo-sem-data");
    await db().evento.update({ where: { id: semData }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    const pessoas = {
      dentro: await pessoaComRastros(dentro),
      fora: await pessoaComRastros(fora),
      curto: await pessoaComRastros(curto),
      andamento: await pessoaComRastros(emAndamento),
      semData: await pessoaComRastros(semData),
    };
    const r = await anonimizarVencidos({ executar: true });
    expect(r.eventosVencidos.map((x) => x.slug).sort()).toEqual(["teste-anon-prazo-curto", "teste-anon-prazo-fora"]);
    const anonimizada = async (id: string) => (await db().usuario.findUniqueOrThrow({ where: { id } })).anonimizadoEm !== null;
    expect(await anonimizada(pessoas.fora.id)).toBe(true);
    expect(await anonimizada(pessoas.curto.id)).toBe(true);
    expect(await anonimizada(pessoas.dentro.id)).toBe(false);
    expect(await anonimizada(pessoas.andamento.id)).toBe(false);
    expect(await anonimizada(pessoas.semData.id)).toBe(false);
  });

  it("quem ainda participa de um evento que não venceu não é tocada, até o último vencer", async () => {
    const velho = await eventoConcluido("teste-anon-dois-velho");
    const novo = await eventoConcluido("teste-anon-dois-novo", { diasAtras: 10 });
    const u = await pessoaComRastros(velho);
    await db().participacao.create({ data: { usuarioId: u.id, eventoId: novo, papel: "PUBLICO" } });
    expect(await anonimizarVencidos({ executar: true })).toMatchObject({ elegiveis: 0, anonimizados: 0 });
    expect((await db().usuario.findUniqueOrThrow({ where: { id: u.id } })).email).toBe(u.email);

    await db().evento.update({ where: { id: novo }, data: { concluidoEm: new Date(Date.now() - 95 * DIA_MS) } });
    const r = await anonimizarVencidos({ executar: true });
    expect(r.anonimizados).toBe(1);
    // A auditoria registra a pessoa nos dois eventos em que ela participou.
    expect(await db().auditoria.count({ where: { eventoId: { in: [velho, novo] }, acao: "DADOS_ANONIMIZADOS" } })).toBe(2);
  });

  it("sem evento vencido não faz nada nem consulta pessoas", async () => {
    await eventoConcluido("teste-anon-nada", { diasAtras: 5 });
    expect(await anonimizarVencidos({ executar: true })).toEqual({ eventosVencidos: [], elegiveis: 0, adminsPreservados: 0, anonimizados: 0, convitesAdminAnonimizados: 0 });
  });
});

describe("administradores", () => {
  it("ficam de fora por padrão (e são contados); --incluir-admins os anonimiza junto com os convites de admin", async () => {
    const e = await eventoConcluido("teste-anon-admin");
    const publico = await pessoaComRastros(e);
    const admin = await criarAdminDireto(e);
    await db().conviteAdmin.create({ data: { eventoId: e, email: "futuro.admin@exemplo.com" } });

    const padrao = await anonimizarVencidos({ executar: true });
    expect(padrao).toMatchObject({ elegiveis: 1, anonimizados: 1, adminsPreservados: 1, convitesAdminAnonimizados: 0 });
    expect((await db().usuario.findUniqueOrThrow({ where: { id: admin.id } })).email).toBe(admin.email);
    expect((await db().usuario.findUniqueOrThrow({ where: { id: publico.id } })).anonimizadoEm).not.toBeNull();
    expect((await db().conviteAdmin.findFirstOrThrow({ where: { eventoId: e } })).email).toBe("futuro.admin@exemplo.com");

    const tudo = await anonimizarVencidos({ executar: true, incluirAdmins: true });
    expect(tudo).toMatchObject({ elegiveis: 1, anonimizados: 1, adminsPreservados: 0, convitesAdminAnonimizados: 1 });
    expect(await db().usuario.findUniqueOrThrow({ where: { id: admin.id } })).toMatchObject({ nome: NOME_ANONIMO, email: emailAnonimo(admin.id) });
    expect((await db().conviteAdmin.findFirstOrThrow({ where: { eventoId: e } })).email).toMatch(/^anonimo-.+@anonimizado\.invalid$/);
    expect((await anonimizarVencidos({ executar: true, incluirAdmins: true })).convitesAdminAnonimizados).toBe(0);
  });

  it("um admin de um evento em andamento nunca é anonimizado, mesmo com --incluir-admins", async () => {
    const velho = await eventoConcluido("teste-anon-admin-velho");
    const ativo = await semearEvento("teste-anon-admin-ativo", { ativo: true });
    const admin = await criarAdminDireto(velho);
    await db().participacao.create({ data: { usuarioId: admin.id, eventoId: ativo, papel: "ADMIN" } });
    const r = await anonimizarVencidos({ executar: true, incluirAdmins: true });
    expect(r.elegiveis).toBe(0);
    expect((await db().usuario.findUniqueOrThrow({ where: { id: admin.id } })).email).toBe(admin.email);
  });
});

describe("lotes e manutenção automática", () => {
  it("o limite corta a passada e a seguinte continua de onde parou", async () => {
    const e = await eventoConcluido("teste-anon-limite");
    for (let i = 0; i < 5; i++) await pessoaComRastros(e);
    const primeira = await anonimizarVencidos({ executar: true, limite: 2 });
    expect(primeira).toMatchObject({ elegiveis: 5, anonimizados: 2 });
    const segunda = await anonimizarVencidos({ executar: true, limite: 2 });
    expect(segunda).toMatchObject({ elegiveis: 3, anonimizados: 2 });
    expect((await anonimizarVencidos({ executar: true })).anonimizados).toBe(1);
    expect(await db().usuario.count({ where: { anonimizadoEm: { not: null }, participacoes: { some: { eventoId: e } } } })).toBe(5);
  });

  it("a manutenção periódica anonimiza sozinha e não apaga a conta anonimizada como se fosse cadastro abandonado", async () => {
    const e = await eventoConcluido("teste-anon-manutencao");
    const u = await pessoaComRastros(e);
    await db().usuario.update({ where: { id: u.id }, data: { criadoEm: new Date(Date.now() - 5 * DIA_MS) } });
    await manutencaoSeNecessario();
    const depois = await db().usuario.findUnique({ where: { id: u.id } });
    expect(depois).toMatchObject({ nome: NOME_ANONIMO, emailVerificado: false });
    expect(depois?.anonimizadoEm).not.toBeNull();
    // Mais uma passada (a conta já é "não verificada" e antiga): ela continua lá, com a participação.
    reiniciarManutencao();
    await manutencaoSeNecessario();
    expect(await db().usuario.count({ where: { id: u.id } })).toBe(1);
    expect(await db().participacao.count({ where: { usuarioId: u.id } })).toBe(1);
  });
});

describe("efeito real no acesso", () => {
  it("depois de anonimizada, a pessoa não entra mais com o e-mail antigo e a sessão dela deixa de valer", async () => {
    const e = await semearEvento("teste-anon-acesso", { ativo: true });
    const email = `anon-acesso-${randomUUID().slice(0, 8)}@teste.local`;
    const { usuario, cookies } = await cadastrarPeloFluxo(e, email, "senha-segura-1", "Pessoa Real");
    const headers = new Headers({ cookie: cookieDe(cookies) });
    expect((await usuarioDaSessao(headers))?.id).toBe(usuario.id);
    expect((await acesso.entrar(novoContexto(), { eventoId: e, email, senha: "senha-segura-1" })).ok).toBe(true);

    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA", concluidoEm: new Date(Date.now() - 100 * DIA_MS) } });
    expect((await anonimizarVencidos({ executar: true })).anonimizados).toBeGreaterThanOrEqual(1);

    expect(await usuarioDaSessao(headers)).toBeNull();
    expect((await acesso.entrar(novoContexto(), { eventoId: e, email, senha: "senha-segura-1" })).ok).toBe(false);
    expect(await db().usuario.findUnique({ where: { email } })).toBeNull();
    expect((await db().usuario.findUniqueOrThrow({ where: { id: usuario.id } })).nome).toBe(NOME_ANONIMO);
  });
});
