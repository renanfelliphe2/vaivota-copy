import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, desconectarBanco } from "@/server/db";
import { encerrarUrna } from "@/server/operacao";
import { consultarEstadoVoto, votarPopular } from "@/server/votacao";
import { zerarMemoria } from "@/server/limites";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, semearEvento } from "./apoio";

// ST3: votação popular contra um PostgreSQL de verdade.

const ctx = { ip: "203.0.113.7" };
let eventoId: string;
let candidatos: string[];

beforeAll(async () => {
  eventoId = await semearEvento("teste-votacao", { urna: "ABERTA" });
  candidatos = await criarCandidatos(eventoId, 8);
});

afterAll(async () => {
  await desconectarBanco();
});

describe("votarPopular", () => {
  it("registra o voto e marca a participação, sem ligar o voto ao usuário", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    const r = await votarPopular(eu, { eventoId, candidatoId: candidatos[0] }, ctx);
    expect(r).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });

    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: eu.id, eventoId } });
    expect(participacao.votou).toBe(true);

    // Sigilo: a tabela voto não tem coluna de usuário nem de participação; a participação não tem nenhum horário.
    const colunasVoto = await db().$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'voto'`;
    expect(colunasVoto.map((c) => c.column_name).sort()).toEqual(["candidato_id", "criado_em", "evento_id", "hash_recibo", "id"]);
    const colunasParticipacao = await db().$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'participacao'`;
    expect(colunasParticipacao.map((c) => c.column_name).sort()).toEqual(["evento_id", "id", "papel", "usuario_id", "votou"]);
  });

  it("o recibo é aleatório de 32 bytes (64 hexadecimais) e único", async () => {
    const votos = await db().voto.findMany({ where: { eventoId } });
    expect(votos.length).toBeGreaterThan(0);
    for (const v of votos) expect(v.hashRecibo).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(votos.map((v) => v.hashRecibo)).size).toBe(votos.length);
  });

  it("o segundo voto é recusado (JA_VOTOU)", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    expect((await votarPopular(eu, { eventoId, candidatoId: candidatos[1] }, ctx)).ok).toBe(true);
    const segundo = await votarPopular(eu, { eventoId, candidatoId: candidatos[2] }, ctx);
    expect(segundo).toMatchObject({ ok: false, erro: { codigo: "JA_VOTOU" } });
    expect(await db().voto.count({ where: { eventoId, candidatoId: candidatos[2] } })).toBe(0);
  });

  it("requisições simultâneas da mesma pessoa gravam um voto só", async () => {
    zerarMemoria();
    const eu = await criarUsuarioDireto(eventoId);
    const antes = await db().voto.count({ where: { eventoId } });
    const respostas = await Promise.all(
      Array.from({ length: 10 }, (_, i) => votarPopular(eu, { eventoId, candidatoId: candidatos[i % 8] }, { ip: `198.51.100.${i}` })),
    );
    const aceitos = respostas.filter((r) => r.ok);
    expect(aceitos).toHaveLength(1);
    for (const r of respostas) if (!r.ok) expect(["JA_VOTOU", "LIMITE_TENTATIVAS"]).toContain(r.erro.codigo);
    expect(await db().voto.count({ where: { eventoId } })).toBe(antes + 1);
  });

  it("pode votar em si mesmo: sem vínculo, o servidor não bloqueia", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    await db().candidato.update({ where: { id: candidatos[3] }, data: { usuarioVinculadoId: eu.id } });
    const r = await votarPopular(eu, { eventoId, candidatoId: candidatos[3] }, ctx);
    expect(r.ok).toBe(true);
  });

  it("recusa candidato não votável, de outro evento ou inexistente", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    const rascunho = (await criarCandidatos(eventoId, 1, { publicados: false }))[0];
    expect(await votarPopular(eu, { eventoId, candidatoId: rascunho }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect(await votarPopular(eu, { eventoId, candidatoId: "nao-existe" }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });

    const outroEvento = await semearEvento("teste-votacao-outro", { urna: "ABERTA" });
    const deOutro = (await criarCandidatos(outroEvento, 1))[0];
    expect(await votarPopular(eu, { eventoId, candidatoId: deOutro }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    // e a pessoa continua podendo votar: a recusa não gasta o voto
    expect((await votarPopular(eu, { eventoId, candidatoId: candidatos[0] }, ctx)).ok).toBe(true);
  });

  it("admin não vota (PAPEL_INVALIDO) e quem não tem participação não vota (NAO_AUTORIZADO)", async () => {
    const admin = await criarAdminDireto(eventoId);
    expect(await votarPopular(admin, { eventoId, candidatoId: candidatos[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });

    const semParticipacao = await criarUsuarioDireto(eventoId);
    await db().participacao.deleteMany({ where: { usuarioId: semParticipacao.id } });
    expect(await votarPopular(semParticipacao, { eventoId, candidatoId: candidatos[0] }, ctx)).toMatchObject({
      ok: false,
      erro: { codigo: "NAO_AUTORIZADO" },
    });
    expect(await db().participacao.count({ where: { usuarioId: semParticipacao.id } })).toBe(0); // o voto não cria participação
  });

  it("exige sessão e e-mail verificado", async () => {
    expect(await votarPopular(null, { eventoId, candidatoId: candidatos[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    const eu = await criarUsuarioDireto(eventoId);
    expect(await votarPopular({ ...eu, emailVerificado: false }, { eventoId, candidatoId: candidatos[0] }, ctx)).toMatchObject({
      ok: false,
      erro: { codigo: "EMAIL_NAO_VERIFICADO" },
    });
  });
});

describe("estados da urna", () => {
  it("com a urna não iniciada, encerrada, em rascunho ou concluída, não vota", async () => {
    const e = await semearEvento("teste-votacao-estados", { ativo: true });
    const [c] = await criarCandidatos(e, 1);
    const eu = await criarUsuarioDireto(e);
    const tentar = () => votarPopular(eu, { eventoId: e, candidatoId: c }, ctx);

    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_NAO_ABERTA" } });
    await db().evento.update({ where: { id: e }, data: { estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    await db().evento.update({ where: { id: e }, data: { estado: "RASCUNHO", estadoUrna: "NAO_INICIADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });

    expect(await db().voto.count({ where: { eventoId: e } })).toBe(0);
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: eu.id } })).votou).toBe(false);
  });
});

describe("consultarEstadoVoto", () => {
  it("diz se votou, nunca em quem", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    expect(await consultarEstadoVoto(eu, { eventoId }, ctx)).toEqual({ ok: true, dados: { votou: false, candidatoAtualId: null } });
    await votarPopular(eu, { eventoId, candidatoId: candidatos[4] }, ctx);
    expect(await consultarEstadoVoto(eu, { eventoId }, ctx)).toEqual({ ok: true, dados: { votou: true, candidatoAtualId: null } });
  });
});

describe("carga e integridade", () => {
  it("200 pessoas votando ao mesmo tempo: um voto cada, total confere com as participações", async () => {
    zerarMemoria();
    const e = await semearEvento("teste-votacao-carga", { urna: "ABERTA" });
    const ids = await criarCandidatos(e, 8);
    const pessoas = await Promise.all(Array.from({ length: 200 }, () => criarUsuarioDireto(e)));
    const respostas = await Promise.all(
      pessoas.map((p, i) => votarPopular(p, { eventoId: e, candidatoId: ids[i % 8] }, { ip: `192.0.2.${i % 250}` })),
    );
    expect(respostas.every((r) => r.ok)).toBe(true);

    const total = await db().voto.count({ where: { eventoId: e } });
    const quemVotou = await db().participacao.count({ where: { eventoId: e, votou: true } });
    expect(total).toBe(200);
    expect(quemVotou).toBe(200);
    const porCandidato = await db().voto.groupBy({ by: ["candidatoId"], where: { eventoId: e }, _count: { _all: true } });
    expect(porCandidato.reduce((s, l) => s + l._count._all, 0)).toBe(200);
    expect(porCandidato).toHaveLength(8);
  });

  it("votos e o encerramento ao mesmo tempo: o resultado congelado é exatamente o que está no banco", async () => {
    zerarMemoria();
    const e = await semearEvento("teste-votacao-corrida", { urna: "ABERTA" });
    const ids = await criarCandidatos(e, 8);
    const admin = await criarAdminDireto(e);
    const pessoas = await Promise.all(Array.from({ length: 120 }, () => criarUsuarioDireto(e)));

    const votos = pessoas.map((p, i) => votarPopular(p, { eventoId: e, candidatoId: ids[i % 8] }, { ip: `192.0.2.${i % 250}` }));
    // O encerramento sai no meio da rajada: espera uns 30 votos entrarem e fecha com os outros ainda em andamento.
    const encerramento = (async () => {
      while ((await db().voto.count({ where: { eventoId: e } })) < 30) await new Promise((r) => setTimeout(r, 2));
      return encerrarUrna(admin, e);
    })();
    const [respostas, fim] = await Promise.all([Promise.all(votos), encerramento]);
    expect(fim.ok).toBe(true);

    const aceitos = respostas.filter((r) => r.ok).length;
    const recusados = respostas.filter((r) => !r.ok);
    for (const r of recusados) if (!r.ok) expect(["URNA_ENCERRADA"]).toContain(r.erro.codigo);
    expect(aceitos + recusados.length).toBe(120);
    expect(aceitos).toBeGreaterThanOrEqual(30); // a rajada foi de verdade interrompida no meio

    // O que foi aceito está no banco, e o resultado oficial (v1) conta exatamente isso: nenhum voto entrou depois.
    expect(await db().voto.count({ where: { eventoId: e } })).toBe(aceitos);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    const dados = oficial.dados as { totais: { POPULAR: number } };
    expect(dados.totais.POPULAR).toBe(aceitos);
    // E quem foi recusado continua sem voto marcado.
    expect(await db().participacao.count({ where: { eventoId: e, papel: "PUBLICO", votou: true } })).toBe(aceitos);
  });
});
