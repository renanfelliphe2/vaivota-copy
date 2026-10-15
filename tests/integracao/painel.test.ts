import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarAuditoria, obterOperacao, obterResultado } from "@/server/dashboard";
import { db, desconectarBanco } from "@/server/db";
import { montarEstadoPublico } from "@/server/estadoPublico";
import { prepararExportacao, registrarRelatorioGerado } from "@/server/exportacao";
import { zerarMemoria } from "@/server/limites";
import { abrirUrna, ativarEvento, encerrarUrna } from "@/server/operacao";
import type { UsuarioSessao } from "@/server/sessao";
import { votarPopular } from "@/server/votacao";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, semearEvento } from "./apoio";

// ST5: dashboard (operação ao vivo e resultado), exportação CSV, relatório, auditoria e estado público.

const ctx = { ip: "203.0.113.20" };
let eventoId: string;
let admin: UsuarioSessao;
let ids: string[];

beforeAll(async () => {
  eventoId = await semearEvento("teste-painel");
  admin = await criarAdminDireto(eventoId);
  ids = await criarCandidatos(eventoId, 4);
  await db().candidato.update({ where: { id: ids[1] }, data: { titulo: "Projeto Segredo Alfa" } });
});

afterAll(async () => {
  await desconectarBanco();
});

describe("durante a votação", () => {
  beforeAll(async () => {
    zerarMemoria();
    expect((await ativarEvento(admin, eventoId)).ok).toBe(true);
    expect((await abrirUrna(admin, eventoId)).ok).toBe(true);
    for (const [i, candidatoId] of [ids[0], ids[0], ids[1], ids[2], ids[0]].entries()) {
      const eleitor = await criarUsuarioDireto(eventoId);
      expect((await votarPopular(eleitor, { eventoId, candidatoId }, { ip: `192.0.2.${i}` })).ok).toBe(true);
    }
    await criarUsuarioDireto(eventoId); // inscrito que não votou
  });

  it("a operação traz total, participantes e série, e NUNCA contagem por projeto (nem na resposta de rede)", async () => {
    const r = await obterOperacao(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.fase).toBe("URNA_ABERTA");
    expect(r.dados.totais).toEqual({ POPULAR: 5, JURI: 0, INFANTIL: 0 });
    expect(r.dados.participantes.publico).toEqual({ cadastrados: 6, votaram: 5 });
    expect(r.dados.parcial).toBeNull();
    expect(r.dados.parcialAoVivo).toBe(false);
    expect(r.dados.serie.pontos.reduce((s, p) => s + p.popular, 0)).toBe(5);
    expect(r.dados.resultadoDisponivel).toBe(false);

    // A resposta que sai pela rede não tem nenhum id de projeto nem o título dele.
    const texto = JSON.stringify(r);
    for (const id of ids) expect(texto).not.toContain(id);
    expect(texto).not.toContain("Segredo Alfa");
    expect(texto).not.toContain("@");
  });

  it("o resultado só existe depois do encerramento", async () => {
    expect(await obterResultado(admin, eventoId)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
  });

  it("exportações do resultado ficam indisponíveis; votos por minuto e auditoria funcionam, sem e-mail, e cada uma gera auditoria", async () => {
    expect(await prepararExportacao(admin, eventoId, "resultado_candidatos", ctx)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
    expect(await prepararExportacao(admin, eventoId, "jurados", ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const antes = await db().auditoria.count({ where: { eventoId, acao: "EXPORTACAO_CSV" } });
    const minuto = await prepararExportacao(admin, eventoId, "votos_por_minuto", ctx);
    const trilha = await prepararExportacao(admin, eventoId, "auditoria", ctx);
    expect(minuto.ok && trilha.ok).toBe(true);
    if (!minuto.ok || !trilha.ok) return;
    expect(minuto.dados.cabecalho).toEqual(["intervalo_inicio", "passo_minutos", "popular", "total"]);
    expect(JSON.stringify(trilha.dados)).not.toContain("@");
    expect(await db().auditoria.count({ where: { eventoId, acao: "EXPORTACAO_CSV" } })).toBe(antes + 2);
  });

  it("relatório só existe com resultado oficial", async () => {
    expect(await registrarRelatorioGerado(admin, eventoId, ctx)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
  });

  it("o estado público não leva votos, auditoria, e-mails de terceiros nem rascunhos a quem não administra", async () => {
    const eleitor = await criarUsuarioDireto(eventoId);
    const estado = await montarEstadoPublico({ ...eleitor }, Date.now());
    const texto = JSON.stringify(estado);
    expect(texto).not.toContain("hashRecibo");
    expect(texto).not.toContain(admin.email);
    const doEvento = (e: typeof estado) => e.eventos.find((x) => x.evento.id === eventoId)!;
    expect(doEvento(estado).candidatos).toHaveLength(4);
    expect(doEvento(estado).participacao).toMatchObject({ papel: "PUBLICO", votou: false });
    expect(estado.usuario).toMatchObject({ id: eleitor.id, email: eleitor.email });

    // rascunho (não publicado) só aparece para o admin
    await db().candidato.update({ where: { id: ids[3] }, data: { publicado: false } });
    const visitante = await montarEstadoPublico(null, Date.now() + 10_000);
    expect(doEvento(visitante).candidatos.map((c) => c.id)).toEqual([ids[0], ids[1], ids[2]]);
    const doAdmin = await montarEstadoPublico(admin, Date.now());
    expect(doEvento(doAdmin).candidatos).toHaveLength(4);
    expect(visitante.usuario).toBeNull();
    await db().candidato.update({ where: { id: ids[3] }, data: { publicado: true } });
  });

  it("o evento em rascunho aparece como 'em breve' (sem candidatos) para o público e completo para o admin", async () => {
    const e = await semearEvento("teste-painel-rascunho");
    const adm = await criarAdminDireto(e);
    await criarCandidatos(e, 2);
    const publico = await montarEstadoPublico(null, Date.now() + 20_000);
    const noPublico = publico.eventos.find((x) => x.evento.id === e)!;
    expect(noPublico.candidatos).toHaveLength(0);
    expect(noPublico.evento.estado).toBe("RASCUNHO");
    const noAdmin = (await montarEstadoPublico(adm, Date.now())).eventos.find((x) => x.evento.id === e)!;
    expect(noAdmin.candidatos).toHaveLength(2);
    expect(noAdmin.configApresentacao.parcialAoVivo).toBe(false);
  });
});

describe("depois do encerramento", () => {
  beforeAll(async () => {
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
  });

  it("resultado: ranking, total = votos no banco = soma dos placares", async () => {
    const r = await obterResultado(admin, eventoId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const totalBanco = await db().voto.count({ where: { eventoId } });
    expect(r.dados.versao).toBe(1);
    expect(r.dados.dados.totais.POPULAR).toBe(totalBanco);
    expect(r.dados.dados.placares.POPULAR.reduce((s, p) => s + p.votos, 0)).toBe(totalBanco);
    expect(r.dados.dados.ranking[0]).toMatchObject({ candidatoId: ids[0], posicao: 1 });
    expect(r.dados.participantes.publico.votaram).toBe(totalBanco);
    expect(r.dados.derivados.criterioEfetivo).toBe("PUBLICO");

    const op = await obterOperacao(admin, eventoId);
    expect(op.ok && op.dados.totais.POPULAR).toBe(totalBanco);
    expect(op.ok && op.dados.resultadoDisponivel).toBe(true);
  });

  it("CSVs do resultado saem sem '@', com vírgula decimal, e cada exportação gera auditoria", async () => {
    const antes = await db().auditoria.count({ where: { eventoId, acao: "EXPORTACAO_CSV" } });
    for (const arquivo of ["resumo_evento", "resultado_candidatos", "votos_por_minuto", "auditoria"] as const) {
      const r = await prepararExportacao(admin, eventoId, arquivo, ctx);
      expect(r.ok, arquivo).toBe(true);
      if (!r.ok) continue;
      expect(JSON.stringify(r.dados), arquivo).not.toContain("@");
      expect(r.dados.nome).toMatch(/^teste-painel-.*\.csv$/);
    }
    expect(await db().auditoria.count({ where: { eventoId, acao: "EXPORTACAO_CSV" } })).toBe(antes + 4);

    const classificacao = await prepararExportacao(admin, eventoId, "resultado_candidatos", ctx);
    if (!classificacao.ok) throw new Error("sem classificação");
    expect(classificacao.dados.cabecalho).toEqual(["posicao", "candidato", "situacao", "votos_popular", "pontos_popular", "pontuacao_final", "empate"]);
    expect(classificacao.dados.linhas[0].slice(0, 2)).toEqual([1, "Projeto 1"]);
    expect(classificacao.dados.linhas[0][5]).toBe("60,00"); // 3 de 5 votos
  });

  it("relatório gera auditoria com a versão", async () => {
    expect(await registrarRelatorioGerado(admin, eventoId, ctx)).toEqual({ ok: true, dados: { versao: 1 } });
    const a = await db().auditoria.findFirstOrThrow({ where: { eventoId, acao: "RELATORIO_GERADO" } });
    expect(a.detalhes).toEqual({ versao: 1 });
  });

  it("a auditoria lista as ações do evento com o nome do admin e filtra por grupo", async () => {
    const tudo = await listarAuditoria(admin, eventoId, { limite: 100 });
    expect(tudo.ok).toBe(true);
    if (!tudo.ok) return;
    const estado = tudo.dados.filter((i) => i.grupo === "ESTADO").map((i) => i.descricao);
    expect(estado).toContain("Evento ativado");
    expect(estado).toContain("Urna encerrada (manual)");
    expect(tudo.dados.every((i) => i.ator === admin.nome || i.ator === "Sistema")).toBe(true);
    // ninguém: nem a escolha de voto nem e-mail
    expect(JSON.stringify(tudo.dados)).not.toContain("@");
    const filtrado = await listarAuditoria(admin, eventoId, { grupo: "EXPORTACAO" });
    expect(filtrado.ok && filtrado.dados.every((i) => i.grupo === "EXPORTACAO")).toBe(true);
  });

  it("só o admin lê o painel", async () => {
    const publico = await criarUsuarioDireto(eventoId);
    expect(await obterOperacao(publico, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await obterResultado(null, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await prepararExportacao(publico, eventoId, "auditoria", ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await listarAuditoria(publico, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });
});
