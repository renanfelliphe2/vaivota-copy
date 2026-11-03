import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { removerCandidato } from "@/server/candidatos";
import { gerarConvites, hashDoConvite, listarConvites, registrarExportacaoConvites, renomearConvite, resgatarConvite, revogarConvite } from "@/server/convites";
import { obterOperacao, obterVotosJuri } from "@/server/dashboard";
import { db, desconectarBanco } from "@/server/db";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { prepararExportacao } from "@/server/exportacao";
import { avaliarCandidatoJuri, consultarAvaliacaoJuri, escolherMelhoresJuri, salvarAvaliacaoJuri, votarJuri } from "@/server/juri";
import { chaveDe, zerarMemoria } from "@/server/limites";
import { encerrarUrna, entradaDoChecklist } from "@/server/operacao";
import type { UsuarioSessao } from "@/server/sessao";
import { consultarEstadoVoto, votarPopular } from "@/server/votacao";
import { ALFABETO_CODIGO, normalizarCodigo } from "@/lib/codigos";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, ligarJuri, semearEvento } from "./apoio";

// Festival: o júri contra um PostgreSQL de verdade. Convites (hash, resgate atômico, bloqueio), voto único, notas por critério,
// melhor por critério, configuração, apuração e painel. Cada grupo usa o próprio evento.

const ctx = { ip: "203.0.113.50" };
const FORMATO_CODIGO = new RegExp(`^[${ALFABETO_CODIGO}]{4}-[${ALFABETO_CODIGO}]{4}$`);

afterAll(async () => {
  await desconectarBanco();
});

/** Um código com o formato certo que ninguém gerou: `n` escolhe os 4 últimos caracteres (base 31, o tamanho do alfabeto). */
function codigoQueNaoExiste(n: number): string {
  let resto = n + 1;
  let sufixo = "";
  for (let i = 0; i < 4; i++) {
    sufixo = ALFABETO_CODIGO[resto % ALFABETO_CODIGO.length] + sufixo;
    resto = Math.floor(resto / ALFABETO_CODIGO.length);
  }
  return `2222-${sufixo}`;
}

async function gerarUm(admin: UsuarioSessao, eventoId: string, rotulo?: string) {
  const r = await gerarConvites(admin, eventoId, { quantidade: 1, rotuloBase: rotulo, validadeAte: null }, ctx);
  if (!r.ok) throw new Error(`gerarConvites falhou: ${r.erro.codigo} ${r.erro.mensagem}`);
  return r.dados.codigos[0];
}

/** Usuário com e-mail verificado e nenhuma participação em evento nenhum. */
async function usuarioSemParticipacao(): Promise<UsuarioSessao> {
  const id = randomUUID();
  const email = `sem-${id}@teste.local`;
  await db().usuario.create({ data: { id, nome: "Pessoa sem", email, emailVerificado: true } });
  return { id, nome: "Pessoa sem", email, emailVerificado: true };
}

// ─────────────────────────────────────────────
// Convites
// ─────────────────────────────────────────────

describe("convites: geração e lista", () => {
  let eventoId: string;
  let admin: UsuarioSessao;

  beforeAll(async () => {
    eventoId = await semearEvento("teste-juri-convites", { ativo: true });
    await ligarJuri(eventoId);
    admin = await criarAdminDireto(eventoId);
  });

  it("só o admin gera; o código sai uma vez e o banco guarda só o hash", async () => {
    const publico = await criarUsuarioDireto(eventoId);
    for (const quem of [publico, null]) {
      expect(await gerarConvites(quem, eventoId, { quantidade: 1, validadeAte: null }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    }

    const r = await gerarConvites(admin, eventoId, { quantidade: 3, rotuloBase: "Jurado", validadeAte: null }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.codigos.map((c) => c.rotulo)).toEqual(["Jurado 1", "Jurado 2", "Jurado 3"]);
    for (const c of r.dados.codigos) expect(c.codigo).toMatch(FORMATO_CODIGO);
    expect(new Set(r.dados.codigos.map((c) => c.codigo)).size).toBe(3);

    const linhas = await db().conviteJurado.findMany({ where: { eventoId } });
    expect(linhas).toHaveLength(3);
    for (const l of linhas) {
      expect(l.hashCodigo).toMatch(/^[0-9a-f]{64}$/);
      expect(l.estado).toBe("DISPONIVEL");
    }
    for (const c of r.dados.codigos) {
      expect(linhas.map((l) => l.hashCodigo)).toContain(hashDoConvite(eventoId, c.codigo));
      // o hash vale para qualquer grafia do mesmo código
      expect(hashDoConvite(eventoId, c.codigo.toLowerCase().replace("-", " "))).toBe(hashDoConvite(eventoId, c.codigo));
      // e o código nunca vai para a auditoria nem para o banco em claro
      const auditoria = JSON.stringify(await db().auditoria.findMany({ where: { eventoId } }));
      expect(auditoria).not.toContain(normalizarCodigo(c.codigo));
      expect(JSON.stringify(linhas)).not.toContain(normalizarCodigo(c.codigo));
    }
    // o mesmo código em outro evento vira outro hash
    expect(hashDoConvite("outro-evento", r.dados.codigos[0].codigo)).not.toBe(hashDoConvite(eventoId, r.dados.codigos[0].codigo));

    // a numeração continua
    const mais = await gerarConvites(admin, eventoId, { quantidade: 2, rotuloBase: "Jurado", validadeAte: null }, ctx);
    expect(mais.ok && mais.dados.codigos.map((c) => c.rotulo)).toEqual(["Jurado 4", "Jurado 5"]);
    const auditoriaGeracao = await db().auditoria.findMany({ where: { eventoId, acao: "CONVITES_GERADOS" } });
    expect(auditoriaGeracao).toHaveLength(2);
  });

  it("valida a quantidade e a validade; sem módulo júri ou com a urna encerrada é TRAVADO", async () => {
    expect(await gerarConvites(admin, eventoId, { quantidade: 0, validadeAte: null }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await gerarConvites(admin, eventoId, { quantidade: 51, validadeAte: null }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const passado = new Date(Date.now() - 3600_000).toISOString();
    expect(await gerarConvites(admin, eventoId, { quantidade: 1, validadeAte: passado }, ctx)).toMatchObject({
      ok: false,
      erro: { codigo: "VALIDACAO", campos: { validadeAte: expect.any(String) } },
    });
    expect(await gerarConvites(admin, eventoId, { quantidade: 1, validadeAte: "não é data" }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });

    const semJuri = await semearEvento("teste-juri-convites-sem-modulo", { ativo: true });
    const adminSem = await criarAdminDireto(semJuri);
    expect(await gerarConvites(adminSem, semJuri, { quantidade: 1, validadeAte: null }, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });

    const encerrado = await semearEvento("teste-juri-convites-encerrado", { urna: "ENCERRADA" });
    await ligarJuri(encerrado);
    const adminEnc = await criarAdminDireto(encerrado);
    expect(await gerarConvites(adminEnc, encerrado, { quantidade: 1, validadeAte: null }, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
  });

  it("a lista mostra estado e quem resgatou, nunca hash nem e-mail", async () => {
    const codigo = await gerarUm(admin, eventoId, "Convidado");
    const jurado = await criarUsuarioDireto(eventoId);
    expect((await resgatarConvite(jurado, ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);

    const r = await listarConvites(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const usado = r.dados.find((c) => c.rotulo?.startsWith("Convidado"));
    expect(usado).toMatchObject({ estado: "USADO", resgatadoPor: "Pessoa u", resgatadoEm: expect.any(String) });
    expect(r.dados.some((c) => c.estado === "DISPONIVEL")).toBe(true);
    const texto = JSON.stringify(r);
    expect(texto).not.toContain("hash");
    expect(texto).not.toContain("@");
    expect(await listarConvites(jurado, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });

  it("entra no checklist de ativação só o convite usado ou disponível dentro da validade", async () => {
    const e = await semearEvento("teste-juri-convites-checklist", { ativo: true });
    await ligarJuri(e);
    const adm = await criarAdminDireto(e);
    expect((await entradaDoChecklist(e))?.convitesUtilizaveis).toBe(0);

    const [, , revogado, expirado, usado] = await Promise.all([1, 2, 3, 4, 5].map(() => gerarUm(adm, e)));
    expect((await revogarConvite(adm, e, await idDoConvite(e, revogado.codigo), { gerarSubstituto: false }, ctx)).ok).toBe(true);
    await db().conviteJurado.update({ where: { id: await idDoConvite(e, expirado.codigo) }, data: { validadeAte: new Date(Date.now() - 1000) } });
    const jurado = await criarUsuarioDireto(e);
    expect((await resgatarConvite(jurado, ctx, { eventoId: e, codigo: usado.codigo })).ok).toBe(true);
    // 2 disponíveis + 1 usado
    expect((await entradaDoChecklist(e))?.convitesUtilizaveis).toBe(3);
  });

  it("o admin recebe os convites no estado público, sem hash e sem vínculo; os critérios chegam a todos", async () => {
    const e = await semearEvento("teste-juri-convites-estado", { ativo: true });
    await ligarJuri(e, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção", "Roteiro"] });
    const adm = await criarAdminDireto(e);
    const publico = await criarUsuarioDireto(e);
    await gerarUm(adm, e, "Jurado");
    invalidarEstadoPublico();

    const doAdmin = (await montarEstadoPublico(adm)).eventos.find((x) => x.evento.id === e);
    expect(doAdmin?.convitesJurado).toHaveLength(1);
    expect(Object.keys(doAdmin!.convitesJurado[0]).sort()).toEqual(["criadoEm", "estado", "eventoId", "id", "resgatadoEm", "rotulo", "validadeAte"]);
    expect(doAdmin?.configPlacar.modoVotoJuri).toBe("NOTAS_POR_CRITERIO");
    expect(doAdmin?.criteriosJuri.map((c) => c.nome)).toEqual(["Direção", "Roteiro"]);

    const doPublico = (await montarEstadoPublico(publico)).eventos.find((x) => x.evento.id === e);
    expect(doPublico?.convitesJurado).toEqual([]);
    expect(doPublico?.criteriosJuri.map((c) => c.nome)).toEqual(["Direção", "Roteiro"]);
  });
});

async function idDoConvite(eventoId: string, codigo: string): Promise<string> {
  return (await db().conviteJurado.findUniqueOrThrow({ where: { eventoId_hashCodigo: { eventoId, hashCodigo: hashDoConvite(eventoId, codigo) } } })).id;
}

describe("convites: resgate", () => {
  let eventoId: string;
  let admin: UsuarioSessao;

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-resgate", { urna: "ABERTA" });
    await ligarJuri(eventoId);
    admin = await criarAdminDireto(eventoId);
  });

  it("quem ainda não votou vira jurado; o convite fica usado e a auditoria registra", async () => {
    const codigo = await gerarUm(admin, eventoId, "Jurado");
    const eu = await criarUsuarioDireto(eventoId);
    const r = await resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo });
    expect(r).toEqual({ ok: true, dados: { papel: "JURADO" } });

    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: eu.id, eventoId } });
    expect(participacao).toMatchObject({ papel: "JURADO", votou: false });
    const convite = await db().conviteJurado.findUniqueOrThrow({ where: { id: await idDoConvite(eventoId, codigo.codigo) } });
    expect(convite).toMatchObject({ estado: "USADO", participacaoId: participacao.id, resgatadoEm: expect.any(Date) });
    const auditoria = await db().auditoria.findMany({ where: { eventoId, acao: "CONVITE_RESGATADO", atorUsuarioId: eu.id } });
    expect(auditoria).toHaveLength(1);
    expect(auditoria[0]).toMatchObject({ entidade: "convite_jurado", entidadeId: convite.id });
  });

  it("aceita qualquer grafia do código (minúsculas, sem hífen)", async () => {
    const codigo = await gerarUm(admin, eventoId);
    const eu = await criarUsuarioDireto(eventoId);
    expect((await resgatarConvite(eu, ctx, { eventoId, codigo: normalizarCodigo(codigo.codigo).toLowerCase() })).ok).toBe(true);
  });

  it("sem participação ainda, ela nasce já como jurado", async () => {
    const codigo = await gerarUm(admin, eventoId);
    const eu = await usuarioSemParticipacao();
    expect((await resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);
    expect(await db().participacao.findMany({ where: { usuarioId: eu.id } })).toMatchObject([{ eventoId, papel: "JURADO", votou: false }]);
  });

  it("código usado, revogado, expirado ou inexistente: a mesma mensagem; o motivo vai só para a auditoria", async () => {
    const usado = await gerarUm(admin, eventoId);
    expect((await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: usado.codigo })).ok).toBe(true);
    const revogado = await gerarUm(admin, eventoId);
    expect((await revogarConvite(admin, eventoId, await idDoConvite(eventoId, revogado.codigo), { gerarSubstituto: false }, ctx)).ok).toBe(true);
    const expirado = await gerarUm(admin, eventoId);
    await db().conviteJurado.update({ where: { id: await idDoConvite(eventoId, expirado.codigo) }, data: { validadeAte: new Date(Date.now() - 1000) } });

    const casos: [string, string][] = [
      [usado.codigo, "CODIGO_USADO"],
      [revogado.codigo, "CODIGO_REVOGADO"],
      [expirado.codigo, "CODIGO_EXPIRADO"],
      [codigoQueNaoExiste(0), "CODIGO_INVALIDO"],
    ];
    const mensagens = new Set<string>();
    for (const [codigo, esperado] of casos) {
      const quem = await criarUsuarioDireto(eventoId);
      const r = await resgatarConvite(quem, ctx, { eventoId, codigo });
      expect(r).toMatchObject({ ok: false, erro: { codigo: esperado } });
      if (!r.ok) mensagens.add(r.erro.mensagem);
      expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: quem.id, eventoId } })).papel).toBe("PUBLICO");
      const auditoria = await db().auditoria.findMany({ where: { eventoId, acao: "TENTATIVA_CODIGO_INVALIDA", atorUsuarioId: quem.id } });
      expect(auditoria).toMatchObject([{ detalhes: { motivo: esperado } }]);
    }
    expect(mensagens.size).toBe(1);
  });

  it("código recusado não cria participação para quem ainda não tinha", async () => {
    const eu = await usuarioSemParticipacao();
    expect(await resgatarConvite(eu, ctx, { eventoId, codigo: codigoQueNaoExiste(1) })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });
    expect(await db().participacao.count({ where: { usuarioId: eu.id } })).toBe(0);
  });

  it("formato errado dá VALIDACAO e não gasta tentativa", async () => {
    const codigo = await gerarUm(admin, eventoId);
    const eu = await criarUsuarioDireto(eventoId);
    for (let i = 0; i < 10; i++)
      expect(await resgatarConvite(eu, ctx, { eventoId, codigo: "ABC" })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { codigo: expect.any(String) } } });
    expect((await resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);
  });

  it("admin, quem já é jurado e quem já votou como público são recusados, e o convite continua disponível", async () => {
    const codigo = await gerarUm(admin, eventoId);
    expect(await resgatarConvite(admin, ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await resgatarConvite(jurado, ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "JA_E_JURADO" } });
    const votante = await criarUsuarioDireto(eventoId);
    await db().participacao.updateMany({ where: { usuarioId: votante.id, eventoId }, data: { votou: true } });
    expect(await resgatarConvite(votante, ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "JA_VOTOU_COMO_PUBLICO" } });
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: votante.id, eventoId } })).papel).toBe("PUBLICO");
    expect((await db().conviteJurado.findUniqueOrThrow({ where: { id: await idDoConvite(eventoId, codigo.codigo) } })).estado).toBe("DISPONIVEL");
  });

  it("exige sessão com e-mail verificado e respeita o estado do evento", async () => {
    const codigo = await gerarUm(admin, eventoId);
    const eu = await criarUsuarioDireto(eventoId);
    expect(await resgatarConvite(null, ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await resgatarConvite({ ...eu, emailVerificado: false }, ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({
      ok: false,
      erro: { codigo: "NAO_AUTORIZADO" },
    });
    expect(await resgatarConvite(eu, ctx, { eventoId: "nao-existe", codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });

    const e = await semearEvento("teste-juri-resgate-estados", { ativo: true });
    await ligarJuri(e);
    const adm = await criarAdminDireto(e);
    const c = await gerarUm(adm, e);
    const pessoa = await criarUsuarioDireto(e);
    const tentar = () => resgatarConvite(pessoa, ctx, { eventoId: e, codigo: c.codigo });
    await db().evento.update({ where: { id: e }, data: { estado: "RASCUNHO" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
    await db().evento.update({ where: { id: e }, data: { estado: "ATIVO", estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
    await db().evento.update({ where: { id: e }, data: { estado: "ATIVO", estadoUrna: "NAO_INICIADA", moduloJuri: false } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });
    expect((await db().conviteJurado.findUniqueOrThrow({ where: { id: await idDoConvite(e, c.codigo) } })).estado).toBe("DISPONIVEL");
  });

  it("dois resgates do mesmo código ao mesmo tempo: só um passa", async () => {
    zerarMemoria();
    const codigo = await gerarUm(admin, eventoId);
    const pessoas = await Promise.all(Array.from({ length: 10 }, () => criarUsuarioDireto(eventoId)));
    const respostas = await Promise.all(pessoas.map((p) => resgatarConvite(p, ctx, { eventoId, codigo: codigo.codigo })));
    expect(respostas.filter((r) => r.ok)).toHaveLength(1);
    for (const r of respostas) if (!r.ok) expect(r.erro.codigo).toBe("CODIGO_USADO");
    // só uma das dez pessoas virou jurado, e é a que o convite aponta; as outras seguem públicas
    const convite = await db().conviteJurado.findUniqueOrThrow({ where: { id: await idDoConvite(eventoId, codigo.codigo) } });
    const jurados = await db().participacao.findMany({ where: { eventoId, papel: "JURADO", usuarioId: { in: pessoas.map((p) => p.id) } } });
    expect(jurados.map((p) => p.id)).toEqual([convite.participacaoId]);
    expect(await db().participacao.count({ where: { eventoId, papel: "PUBLICO", usuarioId: { in: pessoas.map((p) => p.id) } } })).toBe(9);
  });

  it("a mesma pessoa tentando o mesmo código em paralelo vira jurado uma vez só", async () => {
    zerarMemoria();
    const codigo = await gerarUm(admin, eventoId);
    const eu = await criarUsuarioDireto(eventoId);
    const respostas = await Promise.all(Array.from({ length: 5 }, () => resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo })));
    expect(respostas.filter((r) => r.ok)).toHaveLength(1);
    for (const r of respostas) if (!r.ok) expect(r.erro.codigo).toBe("JA_E_JURADO");
    expect(await db().auditoria.count({ where: { eventoId, acao: "CONVITE_RESGATADO", atorUsuarioId: eu.id } })).toBe(1);
  });

  it("cinco códigos errados seguidos bloqueiam por 60 s, até para o código certo", async () => {
    zerarMemoria();
    const codigo = await gerarUm(admin, eventoId);
    const eu = await criarUsuarioDireto(eventoId);
    for (let i = 0; i < 5; i++)
      expect(await resgatarConvite(eu, ctx, { eventoId, codigo: codigoQueNaoExiste(i + 10) })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_INVALIDO" } });
    const bloqueado = await resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo });
    expect(bloqueado).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS", retryAposSegundos: expect.any(Number) } });
    if (!bloqueado.ok) {
      expect(bloqueado.erro.retryAposSegundos).toBeGreaterThan(0);
      expect(bloqueado.erro.retryAposSegundos).toBeLessThanOrEqual(60);
    }
    expect((await db().conviteJurado.findUniqueOrThrow({ where: { id: await idDoConvite(eventoId, codigo.codigo) } })).estado).toBe("DISPONIVEL");
    expect(await db().auditoria.count({ where: { eventoId, acao: "TENTATIVA_CODIGO_INVALIDA", atorUsuarioId: eu.id } })).toBe(5);
    expect(await db().auditoria.count({ where: { eventoId, acao: "BLOQUEIO_RATE_LIMIT", atorUsuarioId: eu.id } })).toBe(1);
    // o bloqueio é da pessoa: outra pessoa resgata normalmente
    expect((await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);
  });

  it("acertar zera a contagem de erros", async () => {
    zerarMemoria();
    const eu = await criarUsuarioDireto(eventoId);
    const chave = chaveDe("convite", `${eu.id}:${eventoId}`);
    for (let i = 0; i < 4; i++) await resgatarConvite(eu, ctx, { eventoId, codigo: codigoQueNaoExiste(i + 20) });
    expect(await db().rateLimit.findUnique({ where: { key: chave } })).toMatchObject({ count: 4 });
    const codigo = await gerarUm(admin, eventoId);
    expect((await resgatarConvite(eu, ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);
    expect(await db().rateLimit.findUnique({ where: { key: chave } })).toBeNull();
  });
});

describe("convites: revogar, renomear e exportar", () => {
  let eventoId: string;
  let admin: UsuarioSessao;

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-revogar", { ativo: true });
    await ligarJuri(eventoId);
    admin = await criarAdminDireto(eventoId);
  });

  it("revoga o disponível; o código deixa de valer; só o admin revoga", async () => {
    const codigo = await gerarUm(admin, eventoId, "Jurado");
    const id = await idDoConvite(eventoId, codigo.codigo);
    expect(await revogarConvite(await criarUsuarioDireto(eventoId), eventoId, id, { gerarSubstituto: false }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await revogarConvite(admin, eventoId, id, { gerarSubstituto: false, motivo: "perdeu o papel" }, ctx)).toEqual({ ok: true, dados: { substituto: null } });
    expect((await db().conviteJurado.findUniqueOrThrow({ where: { id } })).estado).toBe("REVOGADO");
    expect(await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_REVOGADO" } });
    expect(await db().auditoria.findMany({ where: { eventoId, acao: "CONVITE_REVOGADO", entidadeId: id } })).toMatchObject([{ detalhes: { rotulo: "Jurado 1", substituto: false, motivo: "perdeu o papel" } }]);
    // revogar de novo é conflito
    expect(await revogarConvite(admin, eventoId, id, { gerarSubstituto: false }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
  });

  it("com substituto: novo código, mesmo rótulo, e o antigo morre", async () => {
    const codigo = await gerarUm(admin, eventoId, "Cara");
    const id = await idDoConvite(eventoId, codigo.codigo);
    const r = await revogarConvite(admin, eventoId, id, { gerarSubstituto: true }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok || !r.dados.substituto) throw new Error("sem substituto");
    expect(r.dados.substituto.rotulo).toBe("Cara 1");
    expect(r.dados.substituto.codigo).not.toBe(codigo.codigo);
    expect((await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: r.dados.substituto.codigo })).ok).toBe(true);
    expect(await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: codigo.codigo })).toMatchObject({ ok: false, erro: { codigo: "CODIGO_REVOGADO" } });
    expect(await db().auditoria.count({ where: { eventoId, acao: "CONVITES_GERADOS" } })).toBeGreaterThanOrEqual(2);
  });

  it("convite usado não se revoga", async () => {
    const codigo = await gerarUm(admin, eventoId);
    expect((await resgatarConvite(await criarUsuarioDireto(eventoId), ctx, { eventoId, codigo: codigo.codigo })).ok).toBe(true);
    expect(await revogarConvite(admin, eventoId, await idDoConvite(eventoId, codigo.codigo), { gerarSubstituto: true }, ctx)).toMatchObject({
      ok: false,
      erro: { codigo: "CONFLITO" },
    });
  });

  it("renomeia (até 40 caracteres), exporta com auditoria e trava com a urna encerrada", async () => {
    const codigo = await gerarUm(admin, eventoId);
    const id = await idDoConvite(eventoId, codigo.codigo);
    expect((await renomearConvite(admin, eventoId, id, "  Diretora  ")).ok).toBe(true);
    expect((await db().conviteJurado.findUniqueOrThrow({ where: { id } })).rotulo).toBe("Diretora");
    expect(await renomearConvite(admin, eventoId, id, "x".repeat(41))).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await renomearConvite(admin, eventoId, "nao-existe", "Fulano")).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
    expect(await renomearConvite(await criarUsuarioDireto(eventoId), eventoId, id, "Fulano")).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    expect((await registrarExportacaoConvites(admin, eventoId, 7, ctx)).ok).toBe(true);
    expect(await db().auditoria.findMany({ where: { eventoId, acao: "EXPORTACAO_CSV" } })).toMatchObject([{ detalhes: { arquivo: "convites", quantidade: 7 } }]);

    await db().evento.update({ where: { id: eventoId }, data: { estadoUrna: "ENCERRADA" } });
    expect(await renomearConvite(admin, eventoId, id, "Outra")).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: eventoId }, data: { estadoUrna: "NAO_INICIADA" } });
  });
});

// ─────────────────────────────────────────────
// Voto único
// ─────────────────────────────────────────────

describe("voto único do júri", () => {
  let eventoId: string;
  let c: string[];

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-unico", { urna: "ABERTA" });
    await ligarJuri(eventoId);
    c = await criarCandidatos(eventoId, 4);
  });

  it("registra, troca de candidato e repete sem alterar; guarda o histórico e marca que votou", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const popularesAntes = await db().voto.count({ where: { eventoId } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[0] }, ctx)).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[1] }, ctx)).toEqual({ ok: true, dados: { resultado: "ATUALIZADO" } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[1] }, ctx)).toEqual({ ok: true, dados: { resultado: "SEM_ALTERACAO" } });
    // o voto do jurado é identificado e fica na própria tabela: a urna popular não recebe nada
    expect(await db().voto.count({ where: { eventoId } })).toBe(popularesAntes);

    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    expect(participacao.votou).toBe(true);
    const voto = await db().votoJuri.findUniqueOrThrow({
      where: { participacaoId_eventoId: { participacaoId: participacao.id, eventoId } },
      include: { historico: { orderBy: { id: "asc" } } },
    });
    expect(voto.candidatoId).toBe(c[1]);
    expect(voto.historico.map((h) => [h.candidatoAnteriorId, h.candidatoNovoId])).toEqual([
      [null, c[0]],
      [c[0], c[1]],
    ]);
    const auditoria = await db().auditoria.findMany({ where: { eventoId, atorUsuarioId: jurado.id }, orderBy: { id: "asc" } });
    expect(auditoria.map((a) => a.acao)).toEqual(["VOTO_JURI_REGISTRADO", "VOTO_JURI_ALTERADO"]);
    expect(auditoria[0]).toMatchObject({ entidade: "voto_juri", entidadeId: voto.id });
  });

  it("consultarEstadoVoto devolve ao jurado o voto dele; ao público, nunca o candidato", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await consultarEstadoVoto(jurado, { eventoId }, ctx)).toEqual({ ok: true, dados: { votou: false, candidatoAtualId: null } });
    await votarJuri(jurado, { eventoId, candidatoId: c[2] }, ctx);
    expect(await consultarEstadoVoto(jurado, { eventoId }, ctx)).toEqual({ ok: true, dados: { votou: true, candidatoAtualId: c[2] } });
    const publico = await criarUsuarioDireto(eventoId);
    await votarPopular(publico, { eventoId, candidatoId: c[2] }, ctx);
    expect(await consultarEstadoVoto(publico, { eventoId }, ctx)).toEqual({ ok: true, dados: { votou: true, candidatoAtualId: null } });
  });

  it("só jurado vota como jurado, e jurado não vota como público", async () => {
    const publico = await criarUsuarioDireto(eventoId);
    const admin = await criarAdminDireto(eventoId);
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await votarJuri(publico, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
    expect(await votarJuri(admin, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
    expect(await votarPopular(jurado, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
    expect(await votarJuri(null, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await votarJuri({ ...jurado, emailVerificado: false }, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "EMAIL_NAO_VERIFICADO" } });
    expect(await db().votoJuri.count({ where: { participacao: { usuarioId: jurado.id } } })).toBe(0);
  });

  it("jurado de um evento sem módulo júri não vota; sem participação não vota nem cria participação", async () => {
    const e = await semearEvento("teste-juri-unico-sem-modulo", { urna: "ABERTA" });
    const [cand] = await criarCandidatos(e, 1);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    expect(await votarJuri(jurado, { eventoId: e, candidatoId: cand }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });

    const sem = await usuarioSemParticipacao();
    expect(await votarJuri(sem, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await db().participacao.count({ where: { usuarioId: sem.id } })).toBe(0);
  });

  it("candidato não votável, de outro evento ou o próprio candidato (quando bloqueado) é recusado", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const rascunho = (await criarCandidatos(eventoId, 1, { publicados: false }))[0];
    expect(await votarJuri(jurado, { eventoId, candidatoId: rascunho }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: "nao-existe" }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    const outro = await semearEvento("teste-juri-unico-outro", { urna: "ABERTA" });
    const deOutro = (await criarCandidatos(outro, 1))[0];
    expect(await votarJuri(jurado, { eventoId, candidatoId: deOutro }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });

    await db().candidato.update({ where: { id: c[3] }, data: { usuarioVinculadoId: jurado.id } });
    await db().evento.update({ where: { id: eventoId }, data: { bloquearVotoProprio: true } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[3] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VOTO_PROPRIO" } });
    await db().evento.update({ where: { id: eventoId }, data: { bloquearVotoProprio: false } });
    expect((await votarJuri(jurado, { eventoId, candidatoId: c[3] }, ctx)).ok).toBe(true);
    // e a recusa não gastou nada: o jurado ainda vota
    expect((await votarJuri(jurado, { eventoId, candidatoId: c[0] }, ctx)).ok).toBe(true);
  });

  it("fora de urna aberta não vota, e o modo diferente é recusado", async () => {
    const e = await semearEvento("teste-juri-unico-estados", { ativo: true });
    await ligarJuri(e);
    const [cand] = await criarCandidatos(e, 1);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const tentar = () => votarJuri(jurado, { eventoId: e, candidatoId: cand }, ctx);

    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_NAO_ABERTA" } });
    await db().evento.update({ where: { id: e }, data: { estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    await db().evento.update({ where: { id: e }, data: { estado: "RASCUNHO", estadoUrna: "NAO_INICIADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });

    await db().evento.update({ where: { id: e }, data: { estado: "ATIVO", estadoUrna: "ABERTA" } });
    await db().configPlacar.update({ where: { eventoId: e }, data: { modoVotoJuri: "NOTAS_POR_CRITERIO" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "MODO_JURI_DIFERENTE" } });
    expect(await db().votoJuri.count({ where: { eventoId: e } })).toBe(0);
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } })).votou).toBe(false);
  });

  it("envios simultâneos do mesmo jurado se enfileiram: um voto só, com o histórico certo", async () => {
    zerarMemoria();
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const respostas = await Promise.all(Array.from({ length: 8 }, (_, i) => votarJuri(jurado, { eventoId, candidatoId: c[i % 3] }, { ip: `198.51.100.${i}` })));
    expect(respostas.every((r) => r.ok)).toBe(true);
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    const votos = await db().votoJuri.findMany({ where: { participacaoId: participacao.id }, include: { historico: { orderBy: { id: "asc" } } } });
    expect(votos).toHaveLength(1);
    const gravaram = respostas.filter((r) => r.ok && r.dados.resultado !== "SEM_ALTERACAO").length;
    expect(votos[0].historico).toHaveLength(gravaram);
    // a cadeia do histórico é contínua: cada "anterior" é o "novo" da linha de antes
    votos[0].historico.forEach((h, i) => expect(h.candidatoAnteriorId).toBe(i === 0 ? null : votos[0].historico[i - 1].candidatoNovoId));
    expect(votos[0].candidatoId).toBe(votos[0].historico.at(-1)!.candidatoNovoId);
  });
});

// ─────────────────────────────────────────────
// Notas por critério
// ─────────────────────────────────────────────

describe("notas por critério", () => {
  let eventoId: string;
  let criterios: string[];
  let c: string[];
  const notas = (valores: number[]) => Object.fromEntries(criterios.map((id, i) => [id, valores[i]]));

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-notas", { urna: "ABERTA" });
    criterios = await ligarJuri(eventoId, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção", "Roteiro", "Fotografia", "Som"] });
    c = await criarCandidatos(eventoId, 3);
  });

  it("registra as notas de todos os critérios, atualiza e repete sem alterar", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: notas([10, 8, 7, 0]) }, ctx)).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: notas([10, 8, 7, 0]) }, ctx)).toEqual({ ok: true, dados: { resultado: "SEM_ALTERACAO" } });
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: notas([9, 8, 7, 1]) }, ctx)).toEqual({ ok: true, dados: { resultado: "ATUALIZADO" } });
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[1], notas: notas([5, 5, 5, 5]) }, ctx)).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });

    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    expect(participacao.votou).toBe(true);
    const linhas = await db().notaJuri.findMany({ where: { participacaoId: participacao.id } });
    expect(linhas).toHaveLength(8); // 2 candidatos × 4 critérios, nenhuma linha duplicada
    expect(linhas.filter((l) => l.candidatoId === c[0]).map((l) => l.nota).sort()).toEqual([1, 7, 8, 9]);

    const auditoria = await db().auditoria.findMany({ where: { eventoId, atorUsuarioId: jurado.id }, orderBy: { id: "asc" } });
    expect(auditoria.map((a) => a.acao)).toEqual(["VOTO_JURI_REGISTRADO", "VOTO_JURI_ALTERADO", "VOTO_JURI_REGISTRADO"]);
    expect(auditoria[1]).toMatchObject({ entidade: "nota_juri", entidadeId: c[0], detalhes: { modo: "NOTAS_POR_CRITERIO" } });
  });

  it("recusa nota parcial, fora da faixa, não inteira ou de critério desconhecido, sem gravar nada", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const parcial = { [criterios[0]]: 5 };
    const foraDaFaixa = notas([11, 5, 5, 5]);
    const negativa = notas([-1, 5, 5, 5]);
    const quebrada = notas([5.5, 5, 5, 5]);
    const alheia = { ...notas([5, 5, 5, 5]), "criterio-que-nao-existe": 5 };
    for (const invalida of [parcial, foraDaFaixa, negativa, quebrada, alheia, {}])
      expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: invalida }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await db().notaJuri.count({ where: { participacao: { usuarioId: jurado.id } } })).toBe(0);
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } })).votou).toBe(false);
  });

  it("o banco também recusa nota fora de 0 a 10 e nota repetida", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    const base = { eventoId, participacaoId: participacao.id, candidatoId: c[2], criterioId: criterios[0] };
    await expect(db().notaJuri.create({ data: { ...base, nota: 11 } })).rejects.toThrow();
    await expect(db().notaJuri.create({ data: { ...base, nota: -1 } })).rejects.toThrow();
    await db().notaJuri.create({ data: { ...base, nota: 10 } });
    await expect(db().notaJuri.create({ data: { ...base, nota: 9 } })).rejects.toThrow();
  });

  it("recusa o voto único e o melhor por critério enquanto o modo é notas; quem não é jurado não avalia", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "MODO_JURI_DIFERENTE" } });
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[0], criterioIds: [criterios[0]] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "MODO_JURI_DIFERENTE" } });
    const publico = await criarUsuarioDireto(eventoId);
    expect(await avaliarCandidatoJuri(publico, { eventoId, candidatoId: c[0], notas: notas([1, 2, 3, 4]) }, ctx)).toMatchObject({ ok: false, erro: { codigo: "PAPEL_INVALIDO" } });
    expect(await avaliarCandidatoJuri(null, { eventoId, candidatoId: c[0], notas: notas([1, 2, 3, 4]) }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: "nao-existe", notas: notas([1, 2, 3, 4]) }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
  });

  it("com a urna fechada não avalia", async () => {
    const e = await semearEvento("teste-juri-notas-fechada", { ativo: true });
    const crit = await ligarJuri(e, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção"] });
    const [cand] = await criarCandidatos(e, 1);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const tentar = () => avaliarCandidatoJuri(jurado, { eventoId: e, candidatoId: cand, notas: { [crit[0]]: 7 } }, ctx);
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_NAO_ABERTA" } });
    await db().evento.update({ where: { id: e }, data: { estadoUrna: "ENCERRADA" } });
    expect(await tentar()).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
  });

  it("cada jurado lê só a própria avaliação", async () => {
    const um = await criarUsuarioDireto(eventoId, "JURADO");
    const dois = await criarUsuarioDireto(eventoId, "JURADO");
    await avaliarCandidatoJuri(um, { eventoId, candidatoId: c[0], notas: notas([1, 2, 3, 4]) }, ctx);
    await avaliarCandidatoJuri(dois, { eventoId, candidatoId: c[1], notas: notas([9, 9, 9, 9]) }, ctx);

    const doUm = await consultarAvaliacaoJuri(um, { eventoId });
    expect(doUm).toEqual({ ok: true, dados: { modo: "NOTAS_POR_CRITERIO", avaliacao: { notas: { [c[0]]: notas([1, 2, 3, 4]) }, escolhas: {} } } });
    const doDois = await consultarAvaliacaoJuri(dois, { eventoId });
    expect(doDois.ok && Object.keys(doDois.dados.avaliacao.notas)).toEqual([c[1]]);

    const publico = await criarUsuarioDireto(eventoId);
    expect(await consultarAvaliacaoJuri(publico, { eventoId })).toEqual({ ok: true, dados: { modo: "NOTAS_POR_CRITERIO", avaliacao: { notas: {}, escolhas: {} } } });
    expect(await consultarAvaliacaoJuri(null, { eventoId })).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await consultarAvaliacaoJuri(um, { eventoId: "nao-existe" })).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
  });

  it("salvar o mesmo candidato em paralelo não duplica nota", async () => {
    zerarMemoria();
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const respostas = await Promise.all(Array.from({ length: 6 }, (_, i) => avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: notas([i, i, i, i]) }, { ip: `198.51.100.${i}` })));
    expect(respostas.every((r) => r.ok)).toBe(true);
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    expect(await db().notaJuri.count({ where: { participacaoId: participacao.id } })).toBe(4);
    // todas as notas do candidato são da mesma rodada (nenhuma mistura de duas requisições)
    expect(new Set((await db().notaJuri.findMany({ where: { participacaoId: participacao.id } })).map((n) => n.nota)).size).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Melhor por critério
// ─────────────────────────────────────────────

describe("melhor candidato por critério", () => {
  let eventoId: string;
  let criterios: string[];
  let c: string[];

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-melhor", { urna: "ABERTA" });
    criterios = await ligarJuri(eventoId, { modo: "MELHOR_POR_CRITERIO", criterios: ["Direção", "Roteiro", "Som"] });
    c = await criarCandidatos(eventoId, 3);
  });

  async function escolhasDe(usuarioId: string) {
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId, eventoId } });
    const linhas = await db().escolhaCriterioJuri.findMany({ where: { participacaoId: participacao.id } });
    return Object.fromEntries(linhas.map((l) => [l.criterioId, l.candidatoId]));
  }

  it("marcar substitui quem era o melhor no critério; desmarcar deixa o critério vazio", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[0], criterioIds: [criterios[0], criterios[1]] }, ctx)).toEqual({
      ok: true,
      dados: { resultado: "REGISTRADO" },
    });
    expect(await escolhasDe(jurado.id)).toEqual({ [criterios[0]]: c[0], [criterios[1]]: c[0] });

    // c1 vira o melhor em Roteiro: tira c0 de lá
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[1], criterioIds: [criterios[1]] }, ctx)).toEqual({
      ok: true,
      dados: { resultado: "REGISTRADO" },
    });
    expect(await escolhasDe(jurado.id)).toEqual({ [criterios[0]]: c[0], [criterios[1]]: c[1] });

    // repetir não altera
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[1], criterioIds: [criterios[1]] }, ctx)).toEqual({
      ok: true,
      dados: { resultado: "SEM_ALTERACAO" },
    });

    // c0 deixa de ser o melhor em Direção
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[0], criterioIds: [] }, ctx)).toEqual({ ok: true, dados: { resultado: "ATUALIZADO" } });
    expect(await escolhasDe(jurado.id)).toEqual({ [criterios[1]]: c[1] });
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    expect(participacao.votou).toBe(true);

    // sem nenhuma escolha, o jurado volta a "não votou"
    expect((await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[1], criterioIds: [] }, ctx)).ok).toBe(true);
    expect(await escolhasDe(jurado.id)).toEqual({});
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } })).votou).toBe(false);
  });

  it("critério desconhecido é recusado; uma escolha por jurado e critério vale no banco", async () => {
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    expect(await escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[0], criterioIds: ["nao-existe"] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await votarJuri(jurado, { eventoId, candidatoId: c[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "MODO_JURI_DIFERENTE" } });
    expect(await avaliarCandidatoJuri(jurado, { eventoId, candidatoId: c[0], notas: {} }, ctx)).toMatchObject({ ok: false, erro: { codigo: "MODO_JURI_DIFERENTE" } });
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId } });
    await db().escolhaCriterioJuri.create({ data: { eventoId, participacaoId: participacao.id, criterioId: criterios[0], candidatoId: c[0] } });
    await expect(db().escolhaCriterioJuri.create({ data: { eventoId, participacaoId: participacao.id, criterioId: criterios[0], candidatoId: c[1] } })).rejects.toThrow();
  });

  it("escolhas simultâneas do mesmo jurado terminam coerentes (um melhor por critério)", async () => {
    zerarMemoria();
    const jurado = await criarUsuarioDireto(eventoId, "JURADO");
    const respostas = await Promise.all(
      Array.from({ length: 9 }, (_, i) => escolherMelhoresJuri(jurado, { eventoId, candidatoId: c[i % 3], criterioIds: criterios }, { ip: `198.51.100.${i}` })),
    );
    expect(respostas.every((r) => r.ok)).toBe(true);
    const escolhas = await escolhasDe(jurado.id);
    expect(Object.keys(escolhas).sort()).toEqual([...criterios].sort());
    expect(new Set(Object.values(escolhas)).size).toBe(1);
  });
});

// ─────────────────────────────────────────────
// Configuração
// ─────────────────────────────────────────────

describe("configuração do modo e dos critérios", () => {
  let eventoId: string;
  let admin: UsuarioSessao;

  beforeAll(async () => {
    eventoId = await semearEvento("teste-juri-config", { ativo: true });
    await ligarJuri(eventoId);
    admin = await criarAdminDireto(eventoId);
  });

  const nomes = async () => (await db().criterioJuri.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } })).map((x) => x.nome);

  it("só o admin salva; salva o modo e os critérios na ordem, com auditoria", async () => {
    const dados = { modoVotoJuri: "NOTAS_POR_CRITERIO" as const, criterios: [{ id: null, nome: "Direção" }, { id: null, nome: " Roteiro " }, { id: null, nome: "Som" }] };
    expect(await salvarAvaliacaoJuri(await criarUsuarioDireto(eventoId), eventoId, dados, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await salvarAvaliacaoJuri(null, eventoId, dados, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    expect((await salvarAvaliacaoJuri(admin, eventoId, dados, ctx)).ok).toBe(true);
    expect((await db().configPlacar.findUniqueOrThrow({ where: { eventoId } })).modoVotoJuri).toBe("NOTAS_POR_CRITERIO");
    expect(await nomes()).toEqual(["Direção", "Roteiro", "Som"]);
    const auditoria = await db().auditoria.findMany({ where: { eventoId, acao: "CONFIG_ALTERADA", entidade: "config_juri" } });
    expect(auditoria).toMatchObject([{ detalhes: { de: { modoVotoJuri: "VOTO_UNICO", criterios: [] }, para: { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios: ["Direção", "Roteiro", "Som"] } } }]);
  });

  it("renomear e reordenar mantêm o id; remover tira só o que sumiu; o estado público acompanha", async () => {
    const antes = await db().criterioJuri.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const [direcao, roteiro, som] = antes;
    const dados = {
      modoVotoJuri: "MELHOR_POR_CRITERIO" as const,
      criterios: [{ id: som.id, nome: "Trilha e som" }, { id: direcao.id, nome: "Direção" }, { id: null, nome: "Fotografia" }],
    };
    expect((await salvarAvaliacaoJuri(admin, eventoId, dados, ctx)).ok).toBe(true);
    const depois = await db().criterioJuri.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(depois.map((x) => x.nome)).toEqual(["Trilha e som", "Direção", "Fotografia"]);
    expect(depois[0].id).toBe(som.id);
    expect(depois[1].id).toBe(direcao.id);
    expect(depois.some((x) => x.id === roteiro.id)).toBe(false);

    invalidarEstadoPublico();
    const publico = (await montarEstadoPublico(admin)).eventos.find((x) => x.evento.id === eventoId);
    expect(publico?.configPlacar.modoVotoJuri).toBe("MELHOR_POR_CRITERIO");
    expect(publico?.criteriosJuri.map((x) => x.nome)).toEqual(["Trilha e som", "Direção", "Fotografia"]);
  });

  it("recusa modo por critério sem critério, nome repetido ou vazio e mais de 8 critérios; voto único aceita lista vazia", async () => {
    const por = (modoVotoJuri: "VOTO_UNICO" | "NOTAS_POR_CRITERIO", criterios: { id: string | null; nome: string }[]) => salvarAvaliacaoJuri(admin, eventoId, { modoVotoJuri, criterios }, ctx);
    expect(await por("NOTAS_POR_CRITERIO", [])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { criterios: expect.any(String) } } });
    expect(await por("NOTAS_POR_CRITERIO", [{ id: null, nome: "Som" }, { id: null, nome: "som" }])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await por("NOTAS_POR_CRITERIO", [{ id: null, nome: "  " }])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await por("NOTAS_POR_CRITERIO", Array.from({ length: 9 }, (_, i) => ({ id: null, nome: `Critério ${i}` })))).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await nomes()).toEqual(["Trilha e som", "Direção", "Fotografia"]); // nada mudou
    expect((await por("VOTO_UNICO", [])).ok).toBe(true);
    expect(await nomes()).toEqual([]);
  });

  it("candidato com qualquer rastro de voto do júri não se remove", async () => {
    const e = await semearEvento("teste-juri-config-remover", { ativo: true });
    const [crit] = await ligarJuri(e, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção"] });
    const adm = await criarAdminDireto(e);
    const [comNota, comEscolha, comVoto, soHistorico, limpo] = await criarCandidatos(e, 5);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } });
    const base = { eventoId: e, participacaoId: participacao.id };
    await db().notaJuri.create({ data: { ...base, candidatoId: comNota, criterioId: crit, nota: 6 } });
    await db().escolhaCriterioJuri.create({ data: { ...base, candidatoId: comEscolha, criterioId: crit } });
    const voto = await db().votoJuri.create({ data: { ...base, candidatoId: comVoto } });
    await db().historicoVotoJuri.create({ data: { votoJuriId: voto.id, candidatoAnteriorId: soHistorico, candidatoNovoId: comVoto } });

    for (const id of [comNota, comEscolha, comVoto, soHistorico])
      expect(await removerCandidato(adm, e, id)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect((await removerCandidato(adm, e, limpo)).ok).toBe(true);
    expect(await db().candidato.count({ where: { eventoId: e } })).toBe(4);
  });

  it("critério que já recebeu nota não se remove; renomear pode", async () => {
    const e = await semearEvento("teste-juri-config-notas", { ativo: true });
    const [crit] = await ligarJuri(e, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção"] });
    const adm = await criarAdminDireto(e);
    const [cand] = await criarCandidatos(e, 1);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } });
    await db().notaJuri.create({ data: { eventoId: e, participacaoId: participacao.id, candidatoId: cand, criterioId: crit, nota: 8 } });

    const remover = await salvarAvaliacaoJuri(adm, e, { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios: [{ id: null, nome: "Outro" }] }, ctx);
    expect(remover).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect(await db().criterioJuri.count({ where: { id: crit } })).toBe(1);
    expect((await salvarAvaliacaoJuri(adm, e, { modoVotoJuri: "NOTAS_POR_CRITERIO", criterios: [{ id: crit, nome: "Direção de arte" }] }, ctx)).ok).toBe(true);
    expect((await db().criterioJuri.findUniqueOrThrow({ where: { id: crit } })).nome).toBe("Direção de arte");
  });

  it("trava com a urna aberta ou encerrada", async () => {
    const e = await semearEvento("teste-juri-config-travada", { urna: "ABERTA" });
    await ligarJuri(e);
    const adm = await criarAdminDireto(e);
    const dados = { modoVotoJuri: "NOTAS_POR_CRITERIO" as const, criterios: [{ id: null, nome: "Direção" }] };
    expect(await salvarAvaliacaoJuri(adm, e, dados, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: e }, data: { estadoUrna: "ENCERRADA" } });
    expect(await salvarAvaliacaoJuri(adm, e, dados, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO" } });
    expect(await salvarAvaliacaoJuri(adm, e, dados, ctx)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
  });
});

// ─────────────────────────────────────────────
// Apuração e painel
// ─────────────────────────────────────────────

describe("apuração com o júri", () => {
  it("voto único: o placar do júri entra na pontuação pelos pesos", async () => {
    zerarMemoria();
    const e = await semearEvento("teste-juri-apuracao-unico", { urna: "ABERTA" });
    await ligarJuri(e); // 50 / 50
    const [a, b] = await criarCandidatos(e, 2);
    const admin = await criarAdminDireto(e);
    for (const [i, alvo] of [a, a, a, b].entries()) expect((await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: alvo }, { ip: `192.0.2.${i}` })).ok).toBe(true);
    for (const alvo of [a, b]) expect((await votarJuri(await criarUsuarioDireto(e, "JURADO"), { eventoId: e, candidatoId: alvo }, ctx)).ok).toBe(true);

    expect((await encerrarUrna(admin, e)).ok).toBe(true);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    const dados = oficial.dados as unknown as {
      totais: Record<string, number>;
      placares: { JURI: { candidatoId: string; votos: number }[] };
      ranking: { candidatoId: string; pontuacao: number; posicao: number }[];
    };
    expect(oficial).toMatchObject({ pesoPopular: 50, pesoJuri: 50, pesoInfantil: 0 });
    expect(dados.totais).toMatchObject({ POPULAR: 4, JURI: 2 });
    expect(Object.fromEntries(dados.placares.JURI.map((p) => [p.candidatoId, p.votos]))).toEqual({ [a]: 1, [b]: 1 });
    // a: 50·3/4 + 50·1/2 = 62,5   b: 50·1/4 + 50·1/2 = 37,5
    expect(dados.ranking.map((r) => [r.candidatoId, r.posicao])).toEqual([[a, 1], [b, 2]]);
    expect(dados.ranking[0].pontuacao).toBeCloseTo(62.5, 6);
    expect(dados.ranking[1].pontuacao).toBeCloseTo(37.5, 6);
  });

  it("notas por critério: o placar do júri é a média simples de todas as notas do candidato", async () => {
    const e = await semearEvento("teste-juri-apuracao-notas", { urna: "ABERTA" });
    const crit = await ligarJuri(e, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção", "Roteiro"] });
    const [a, b] = await criarCandidatos(e, 2);
    const admin = await criarAdminDireto(e);
    const [j1, j2] = await Promise.all([criarUsuarioDireto(e, "JURADO"), criarUsuarioDireto(e, "JURADO")]);
    const nota = (candidatoId: string, valores: number[]) => ({ eventoId: e, candidatoId, notas: Object.fromEntries(crit.map((id, i) => [id, valores[i]])) });
    for (const r of [
      await avaliarCandidatoJuri(j1, nota(a, [10, 8]), ctx),
      await avaliarCandidatoJuri(j2, nota(a, [8, 10]), ctx),
      await avaliarCandidatoJuri(j1, nota(b, [6, 6]), ctx),
      await avaliarCandidatoJuri(j2, nota(b, [7, 7]), ctx),
    ])
      expect(r.ok).toBe(true);
    expect((await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: b }, ctx)).ok).toBe(true);

    expect((await encerrarUrna(admin, e)).ok).toBe(true);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    const dados = oficial.dados as unknown as { placares: { JURI: { candidatoId: string; votos: number }[] }; ranking: { candidatoId: string; pontuacao: number }[] };
    const juri = Object.fromEntries(dados.placares.JURI.map((p) => [p.candidatoId, p.votos]));
    expect(juri[a]).toBeCloseTo(9, 6); // (10 + 8 + 8 + 10) / 4
    expect(juri[b]).toBeCloseTo(6.5, 6); // (6 + 6 + 7 + 7) / 4
    // público: b = 100% (50 pts). júri: a = 9/15,5 · 50 = 29,032258; b = 6,5/15,5 · 50 = 20,967742
    expect(dados.ranking[0].candidatoId).toBe(b);
    expect(dados.ranking[0].pontuacao).toBeCloseTo(70.967742, 5);
    expect(dados.ranking[1].pontuacao).toBeCloseTo(29.032258, 5);
  });

  it("melhor por critério: cada escolha vale um voto do júri", async () => {
    const e = await semearEvento("teste-juri-apuracao-melhor", { urna: "ABERTA" });
    const crit = await ligarJuri(e, { modo: "MELHOR_POR_CRITERIO", criterios: ["Direção", "Roteiro", "Som"] });
    const [a, b] = await criarCandidatos(e, 2);
    const admin = await criarAdminDireto(e);
    const [j1, j2] = await Promise.all([criarUsuarioDireto(e, "JURADO"), criarUsuarioDireto(e, "JURADO")]);
    // j1: a em Direção e Roteiro, b em Som. j2: b em Direção, a em Roteiro, b em Som.
    for (const r of [
      await escolherMelhoresJuri(j1, { eventoId: e, candidatoId: a, criterioIds: [crit[0], crit[1]] }, ctx),
      await escolherMelhoresJuri(j1, { eventoId: e, candidatoId: b, criterioIds: [crit[2]] }, ctx),
      await escolherMelhoresJuri(j2, { eventoId: e, candidatoId: b, criterioIds: [crit[0], crit[2]] }, ctx),
      await escolherMelhoresJuri(j2, { eventoId: e, candidatoId: a, criterioIds: [crit[1]] }, ctx),
    ])
      expect(r.ok).toBe(true);

    expect((await encerrarUrna(admin, e)).ok).toBe(true);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    const dados = oficial.dados as unknown as { totais: Record<string, number>; placares: { JURI: { candidatoId: string; votos: number }[] } };
    expect(Object.fromEntries(dados.placares.JURI.map((p) => [p.candidatoId, p.votos]))).toEqual({ [a]: 3, [b]: 3 });
    expect(dados.totais.JURI).toBe(6);
  });

  it("sem módulo júri, o que houver de voto do júri não entra", async () => {
    const e = await semearEvento("teste-juri-apuracao-desligado", { urna: "ABERTA" });
    await ligarJuri(e);
    const [a, b] = await criarCandidatos(e, 2);
    const admin = await criarAdminDireto(e);
    expect((await votarJuri(await criarUsuarioDireto(e, "JURADO"), { eventoId: e, candidatoId: a }, ctx)).ok).toBe(true);
    await db().evento.update({ where: { id: e }, data: { moduloJuri: false } });
    await db().configPlacar.update({ where: { eventoId: e }, data: { pesoPopular: 100, pesoJuri: 0 } });
    expect((await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: b }, ctx)).ok).toBe(true);
    expect((await encerrarUrna(admin, e)).ok).toBe(true);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    expect((oficial.dados as unknown as { ranking: { candidatoId: string }[] }).ranking[0].candidatoId).toBe(b);
  });

  it("votos do júri e o encerramento ao mesmo tempo: o resultado congelado é exatamente o que está no banco", async () => {
    zerarMemoria();
    const e = await semearEvento("teste-juri-apuracao-corrida", { urna: "ABERTA" });
    await ligarJuri(e);
    const ids = await criarCandidatos(e, 4);
    const admin = await criarAdminDireto(e);
    const jurados = await Promise.all(Array.from({ length: 60 }, () => criarUsuarioDireto(e, "JURADO")));

    const envios = jurados.map((j, i) => votarJuri(j, { eventoId: e, candidatoId: ids[i % 4] }, { ip: `192.0.2.${i % 250}` }));
    const encerramento = (async () => {
      while ((await db().votoJuri.count({ where: { eventoId: e } })) < 15) await new Promise((r) => setTimeout(r, 2));
      return encerrarUrna(admin, e);
    })();
    const [respostas, fim] = await Promise.all([Promise.all(envios), encerramento]);
    expect(fim.ok).toBe(true);

    const aceitos = respostas.filter((r) => r.ok).length;
    for (const r of respostas) if (!r.ok) expect(r.erro.codigo).toBe("URNA_ENCERRADA");
    expect(aceitos).toBeGreaterThanOrEqual(15);
    expect(await db().votoJuri.count({ where: { eventoId: e } })).toBe(aceitos);
    const oficial = await db().resultadoOficial.findUniqueOrThrow({ where: { eventoId_versao: { eventoId: e, versao: 1 } } });
    expect((oficial.dados as unknown as { totais: { JURI: number } }).totais.JURI).toBe(aceitos);
    expect(await db().participacao.count({ where: { eventoId: e, papel: "JURADO", votou: true } })).toBe(aceitos);
  });
});

describe("painel do júri", () => {
  let eventoId: string;
  let admin: UsuarioSessao;
  let criterios: string[];
  let c: string[];
  let j1: UsuarioSessao;
  let j2: UsuarioSessao;

  beforeAll(async () => {
    zerarMemoria();
    eventoId = await semearEvento("teste-juri-painel", { urna: "ABERTA" });
    criterios = await ligarJuri(eventoId, { modo: "NOTAS_POR_CRITERIO", criterios: ["Direção", "Som"] });
    c = await criarCandidatos(eventoId, 3);
    await db().candidato.update({ where: { id: c[0] }, data: { titulo: "Filme Segredo Alfa" } });
    admin = await criarAdminDireto(eventoId);
    const gerados = [await gerarUm(admin, eventoId, "Jurado"), await gerarUm(admin, eventoId, "Jurado"), await gerarUm(admin, eventoId, "Jurado")];
    j1 = await criarUsuarioDireto(eventoId);
    j2 = await criarUsuarioDireto(eventoId);
    expect((await resgatarConvite(j1, ctx, { eventoId, codigo: gerados[0].codigo })).ok).toBe(true);
    expect((await resgatarConvite(j2, ctx, { eventoId, codigo: gerados[1].codigo })).ok).toBe(true);
    const nota = (candidatoId: string, a: number, b: number) => ({ eventoId, candidatoId, notas: { [criterios[0]]: a, [criterios[1]]: b } });
    expect((await avaliarCandidatoJuri(j1, nota(c[0], 9, 7), ctx)).ok).toBe(true);
    expect((await avaliarCandidatoJuri(j1, nota(c[1], 5, 5), ctx)).ok).toBe(true);
    expect((await avaliarCandidatoJuri(j1, nota(c[0], 10, 7), ctx)).ok).toBe(true);
  });

  it("a operação mostra quem votou e o resumo dos convites, sem nada por candidato", async () => {
    const r = await obterOperacao(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.modulos.juri).toBe(true);
    expect(r.dados.jurados).toEqual([
      { rotulo: "Jurado 2", nome: "Pessoa u", votou: false },
      { rotulo: "Jurado 1", nome: "Pessoa u", votou: true },
    ]);
    expect(r.dados.convites).toEqual({ disponiveis: 1, usados: 2, revogados: 0, expirados: 0 });
    expect(r.dados.participantes.jurado).toEqual({ cadastrados: 2, votaram: 1 });
    expect(r.dados.totais.JURI).toBeGreaterThan(0);
    expect(r.dados.serie.pontos.reduce((s, p) => s + p.juri, 0)).toBe(1); // um jurado, pelo primeiro registro
    const texto = JSON.stringify(r);
    for (const id of c) expect(texto).not.toContain(id);
    expect(texto).not.toContain("Segredo Alfa");
    expect(texto).not.toContain("@");
  });

  it("os votos identificados só abrem depois do encerramento e só para o admin", async () => {
    expect(await obterVotosJuri(admin, eventoId)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
    expect(await prepararExportacao(admin, eventoId, "jurados", ctx)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });

    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    expect(await obterVotosJuri(j1, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await obterVotosJuri(null, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    const r = await obterVotosJuri(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.modo).toBe("NOTAS_POR_CRITERIO");
    expect(r.dados.criterios.map((x) => x.nome)).toEqual(["Direção", "Som"]);
    const quemVotou = r.dados.jurados.find((j) => j.votou);
    expect(quemVotou?.rotulo).toBe("Jurado 1");
    expect(quemVotou?.notas).toEqual({ [c[0]]: { [criterios[0]]: 10, [criterios[1]]: 7 }, [c[1]]: { [criterios[0]]: 5, [criterios[1]]: 5 } });
    expect(r.dados.jurados.find((j) => !j.votou)).toMatchObject({ rotulo: "Jurado 2", notas: {}, escolhas: {} });
    expect(JSON.stringify(r)).not.toContain("@");
  });

  it("exporta os votos do júri sem e-mail, com auditoria da exportação", async () => {
    const r = await prepararExportacao(admin, eventoId, "jurados", ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.cabecalho).toEqual(["jurado", "rotulo", "situacao", "candidato", "criterio", "nota"]);
    const linhas = r.dados.linhas;
    expect(linhas.filter((l) => l[2] === "Avaliou")).toHaveLength(4); // 2 candidatos × 2 critérios
    expect(linhas.filter((l) => l[2] === "Pendente")).toHaveLength(1);
    expect(linhas.some((l) => l[3] === "Filme Segredo Alfa" && l[4] === "Direção" && l[5] === 10)).toBe(true);
    expect(JSON.stringify(r.dados)).not.toContain("@");
    expect(await db().auditoria.count({ where: { eventoId, acao: "EXPORTACAO_CSV" } })).toBeGreaterThanOrEqual(1);
    expect(await prepararExportacao(j1, eventoId, "jurados", ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });

  it("voto único: o histórico de alterações aparece na visão do admin", async () => {
    const e = await semearEvento("teste-juri-painel-unico", { urna: "ABERTA" });
    await ligarJuri(e);
    const ids = await criarCandidatos(e, 2);
    const adm = await criarAdminDireto(e);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    await votarJuri(jurado, { eventoId: e, candidatoId: ids[0] }, ctx);
    await votarJuri(jurado, { eventoId: e, candidatoId: ids[1] }, ctx);
    expect((await encerrarUrna(adm, e)).ok).toBe(true);
    const r = await obterVotosJuri(adm, e);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.modo).toBe("VOTO_UNICO");
    expect(r.dados.jurados[0]).toMatchObject({ votou: true, candidatoId: ids[1] });
    expect(r.dados.jurados[0].historico.map((h) => [h.candidatoAnteriorId, h.candidatoId])).toEqual([
      [null, ids[0]],
      [ids[0], ids[1]],
    ]);
    const csv = await prepararExportacao(adm, e, "jurados", ctx);
    expect(csv.ok && csv.dados.cabecalho).toEqual(["jurado", "rotulo", "situacao", "registro", "candidato_anterior", "candidato", "registrado_em"]);
    expect(csv.ok && csv.dados.linhas.map((l) => l[3])).toEqual(["Registro", "Alteração"]);
  });
});
