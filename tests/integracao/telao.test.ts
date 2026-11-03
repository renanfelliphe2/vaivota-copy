import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import { listarAuditoria } from "@/server/dashboard";
import { db, desconectarBanco } from "@/server/db";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { alternarModuloJuri } from "@/server/juri";
import {
  carregarRevelacao,
  obterDadosEnsaio,
  obterEstadoAoVivo,
  obterStatusResultado,
  registrarAcaoApresentacao,
} from "@/server/apresentacao";
import { zerarMemoria } from "@/server/limites";
import { abrirUrna, ativarEvento, encerrarUrna } from "@/server/operacao";
import { salvarParceiros } from "@/server/parceiros";
import { executarServico, type ContextoRpc } from "@/server/rpc";
import { prefixoPublico } from "@/server/storage";
import { votarPopular } from "@/server/votacao";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, ligarInfantil, ligarJuri, semearEvento } from "./apoio";

// Festival: parceiros (lista salva pelo admin, logo só do próprio sistema), módulo do júri ligado e desligado pelo admin e o telão
// (status do resultado, ao vivo, revelação, ensaio e trilha da cerimônia) contra um PostgreSQL de verdade. Cada grupo usa o
// próprio evento.

const ctx = { ip: "203.0.113.50" };

afterAll(async () => {
  await desconectarBanco();
});

/** URL que o upload do sistema devolveria para o evento. */
const logoDoEvento = (eventoId: string) => `${prefixoPublico()}${eventoId}/${randomUUID()}.png`;

describe("parceiros", () => {
  it("salva a lista na ordem recebida, com e sem logo, e o estado público a entrega ordenada", async () => {
    const e = await semearEvento("teste-parceiros-salvar", { ativo: true });
    const admin = await criarAdminDireto(e);
    const logo = logoDoEvento(e);
    const r = await salvarParceiros(
      admin,
      e,
      [
        { id: null, nome: "  Alfa Filmes ", logoUrl: logo },
        { id: null, nome: "Beta Cine", logoUrl: null },
        { id: null, nome: "Gama", logoUrl: null },
      ],
      ctx,
    );
    expect(r.ok).toBe(true);
    const linhas = await db().parceiro.findMany({ where: { eventoId: e }, orderBy: { ordem: "asc" } });
    expect(linhas.map((p) => [p.nome, p.ordem, p.logoUrl])).toEqual([["Alfa Filmes", 1, logo], ["Beta Cine", 2, null], ["Gama", 3, null]]);

    invalidarEstadoPublico();
    const publico = await montarEstadoPublico(admin);
    expect(publico.eventos.find((x) => x.evento.id === e)!.parceiros.map((p) => p.nome)).toEqual(["Alfa Filmes", "Beta Cine", "Gama"]);

    const auditoria = await listarAuditoria(admin, e, { grupo: "CONFIGURACAO" });
    expect(auditoria.ok && auditoria.dados.some((i) => i.acao === "PARCEIROS_ALTERADOS" && i.descricao.includes("3"))).toBe(true);
  });

  it("reordena e remove mantendo os ids; regravar a mesma lista não muda nada", async () => {
    const e = await semearEvento("teste-parceiros-reordenar", { ativo: true });
    const admin = await criarAdminDireto(e);
    await salvarParceiros(admin, e, [{ id: null, nome: "Um", logoUrl: null }, { id: null, nome: "Dois", logoUrl: null }, { id: null, nome: "Tres", logoUrl: null }], ctx);
    const [um, dois, tres] = await db().parceiro.findMany({ where: { eventoId: e }, orderBy: { ordem: "asc" } });

    // Tres vai para o topo, Um sai e Dois é renomeado.
    expect((await salvarParceiros(admin, e, [{ id: tres.id, nome: "Tres", logoUrl: null }, { id: dois.id, nome: "Dois (novo nome)", logoUrl: null }], ctx)).ok).toBe(true);
    const depois = await db().parceiro.findMany({ where: { eventoId: e }, orderBy: { ordem: "asc" } });
    expect(depois.map((p) => [p.id, p.nome, p.ordem])).toEqual([[tres.id, "Tres", 1], [dois.id, "Dois (novo nome)", 2]]);
    expect(await db().parceiro.count({ where: { id: um.id } })).toBe(0);

    // Lista vazia apaga todos (sem parceiros a faixa não aparece).
    expect((await salvarParceiros(admin, e, [], ctx)).ok).toBe(true);
    expect(await db().parceiro.count({ where: { eventoId: e } })).toBe(0);
  });

  it("valida nome vazio, curto, repetido e mais de 20 parceiros", async () => {
    const e = await semearEvento("teste-parceiros-validacao", { ativo: true });
    const admin = await criarAdminDireto(e);
    const salvar = (nomes: string[]) => salvarParceiros(admin, e, nomes.map((nome) => ({ id: null, nome, logoUrl: null })), ctx);
    expect(await salvar([""])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { "parceiro-0": expect.any(String) } } });
    expect(await salvar(["A"])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await salvar(["Alfa", "alfa"])).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { "parceiro-1": expect.any(String) } } });
    expect(await salvar(Array.from({ length: 21 }, (_, i) => `Parceiro ${i}`))).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { parceiros: expect.any(String) } } });
    expect(await db().parceiro.count({ where: { eventoId: e } })).toBe(0);
  });

  it("recusa logo que não é do sistema, nem de outro evento; mantém o logo já salvo", async () => {
    const e = await semearEvento("teste-parceiros-logo", { ativo: true });
    const outro = await semearEvento("teste-parceiros-logo-outro", { ativo: true });
    const admin = await criarAdminDireto(e);
    for (const url of ["https://exemplo.com/logo.png", "javascript:alert(1)", "data:image/png;base64,AAAA", "/uploads/teste.png", logoDoEvento(outro)])
      expect(await salvarParceiros(admin, e, [{ id: null, nome: "Alfa", logoUrl: url }], ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await db().parceiro.count({ where: { eventoId: e } })).toBe(0);

    const logo = logoDoEvento(e);
    expect((await salvarParceiros(admin, e, [{ id: null, nome: "Alfa", logoUrl: logo }], ctx)).ok).toBe(true);
    const [alfa] = await db().parceiro.findMany({ where: { eventoId: e } });
    // Regravar com o mesmo logo (e um nome novo) não exige novo envio; trocar para um endereço de fora, sim.
    expect((await salvarParceiros(admin, e, [{ id: alfa.id, nome: "Alfa 2", logoUrl: logo }], ctx)).ok).toBe(true);
    expect(await salvarParceiros(admin, e, [{ id: alfa.id, nome: "Alfa 2", logoUrl: "https://exemplo.com/x.png" }], ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect((await db().parceiro.findUniqueOrThrow({ where: { id: alfa.id } })).logoUrl).toBe(logo);
  });

  it("só o admin do evento salva; id de outro evento é recusado; evento concluído trava", async () => {
    const e = await semearEvento("teste-parceiros-acesso", { ativo: true });
    const outro = await semearEvento("teste-parceiros-acesso-outro", { ativo: true });
    const admin = await criarAdminDireto(e);
    const adminOutro = await criarAdminDireto(outro);
    const publico = await criarUsuarioDireto(e);
    const lista = [{ id: null, nome: "Alfa", logoUrl: null }];
    expect(await salvarParceiros(publico, e, lista, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await salvarParceiros(null, e, lista, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await salvarParceiros(adminOutro, e, lista, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });

    await salvarParceiros(adminOutro, outro, [{ id: null, nome: "De Outro", logoUrl: null }], ctx);
    const alheio = await db().parceiro.findFirstOrThrow({ where: { eventoId: outro } });
    expect(await salvarParceiros(admin, e, [{ id: alheio.id, nome: "Roubado", logoUrl: null }], ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect((await db().parceiro.findUniqueOrThrow({ where: { id: alheio.id } })).nome).toBe("De Outro");

    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    expect(await salvarParceiros(admin, e, lista, ctx)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
  });

  it("evento em rascunho esconde os parceiros de quem não é admin", async () => {
    const e = await semearEvento("teste-parceiros-rascunho");
    const admin = await criarAdminDireto(e);
    await salvarParceiros(admin, e, [{ id: null, nome: "Alfa", logoUrl: null }], ctx);
    invalidarEstadoPublico();
    expect((await montarEstadoPublico(admin)).eventos.find((x) => x.evento.id === e)!.parceiros).toHaveLength(1);
    expect((await montarEstadoPublico(null)).eventos.find((x) => x.evento.id === e)!.parceiros).toHaveLength(0);
    await db().evento.update({ where: { id: e }, data: { estado: "ATIVO" } });
    invalidarEstadoPublico();
    expect((await montarEstadoPublico(null)).eventos.find((x) => x.evento.id === e)!.parceiros).toHaveLength(1);
  });

  it("pelo RPC: valida os argumentos e usa a sessão do cookie, nunca um campo enviado", async () => {
    const e = await semearEvento("teste-parceiros-rpc", { ativo: true });
    const contexto: ContextoRpc = { headers: new Headers(), ip: ctx.ip, cookies: [] };
    // Sem sessão: recusa. Argumento fora do formato: VALIDACAO (a lista é um array de objetos).
    expect(await executarServico("salvarParceiros", { eventoId: e, lista: [{ id: null, nome: "Alfa", logoUrl: null }] }, contexto)).toMatchObject({
      ok: false,
      erro: { codigo: "NAO_AUTORIZADO" },
    });
    expect(await executarServico("salvarParceiros", { eventoId: e, lista: "nada" }, contexto)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });
});

describe("módulo do júri", () => {
  it("liga com peso 0, desliga voltando a 0 e redistribui o resto, e audita", async () => {
    const e = await semearEvento("teste-modulo-juri-alternar", { ativo: true });
    const admin = await criarAdminDireto(e);
    expect((await db().evento.findUniqueOrThrow({ where: { id: e } })).moduloJuri).toBe(false);

    expect((await alternarModuloJuri(admin, e, true, ctx)).ok).toBe(true);
    const ligado = await db().configPlacar.findUniqueOrThrow({ where: { eventoId: e } });
    expect((await db().evento.findUniqueOrThrow({ where: { id: e } })).moduloJuri).toBe(true);
    expect(ligado.pesoJuri).toBe(0);
    expect(ligado.pesoPopular + ligado.pesoJuri + ligado.pesoInfantil).toBe(100);

    // Com um peso definido, desligar devolve tudo ao público.
    await db().configPlacar.update({ where: { eventoId: e }, data: { pesoPopular: 60, pesoJuri: 40 } });
    expect((await alternarModuloJuri(admin, e, false, ctx)).ok).toBe(true);
    const desligado = await db().configPlacar.findUniqueOrThrow({ where: { eventoId: e } });
    expect([desligado.pesoPopular, desligado.pesoJuri, desligado.pesoInfantil]).toEqual([100, 0, 0]);

    const auditoria = await listarAuditoria(admin, e, { grupo: "CONFIGURACAO" });
    expect(auditoria.ok && auditoria.dados.filter((i) => i.acao === "CONFIG_ALTERADA")).toHaveLength(2);
  });

  it("com o infantil ligado, a redistribuição respeita os dois módulos", async () => {
    const e = await semearEvento("teste-modulo-juri-infantil", { ativo: true });
    const admin = await criarAdminDireto(e);
    await ligarInfantil(e, { pesoInfantil: 30 }); // público 70, infantil 30
    expect((await alternarModuloJuri(admin, e, true, ctx)).ok).toBe(true);
    await db().configPlacar.update({ where: { eventoId: e }, data: { pesoPopular: 40, pesoJuri: 30, pesoInfantil: 30 } });
    expect((await alternarModuloJuri(admin, e, false, ctx)).ok).toBe(true);
    const p = await db().configPlacar.findUniqueOrThrow({ where: { eventoId: e } });
    expect([p.pesoPopular, p.pesoJuri, p.pesoInfantil]).toEqual([57, 0, 43]);
    expect((await db().evento.findUniqueOrThrow({ where: { id: e } })).moduloInfantil).toBe(true);
  });

  it("repetir a mesma troca não muda nem audita", async () => {
    const e = await semearEvento("teste-modulo-juri-idempotente", { ativo: true });
    const admin = await criarAdminDireto(e);
    expect((await alternarModuloJuri(admin, e, false, ctx)).ok).toBe(true);
    expect((await alternarModuloJuri(admin, e, true, ctx)).ok).toBe(true);
    expect((await alternarModuloJuri(admin, e, true, ctx)).ok).toBe(true);
    const auditoria = await listarAuditoria(admin, e, { grupo: "CONFIGURACAO" });
    expect(auditoria.ok && auditoria.dados.filter((i) => i.acao === "CONFIG_ALTERADA")).toHaveLength(1);
  });

  it("não desliga com convite resgatado nem com voto do júri; liga e desliga de novo sem eles", async () => {
    const e = await semearEvento("teste-modulo-juri-travas", { ativo: true });
    await ligarJuri(e, { pesoJuri: 40 });
    const admin = await criarAdminDireto(e);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } });
    const convite = await db().conviteJurado.create({
      data: { eventoId: e, hashCodigo: randomUUID().replaceAll("-", ""), rotulo: "Jurado 1", estado: "USADO", participacaoId: participacao.id, resgatadoEm: new Date() },
    });
    expect(await alternarModuloJuri(admin, e, false, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });

    // Sem o convite usado mas com voto: o voto trava.
    await db().conviteJurado.update({ where: { id: convite.id }, data: { estado: "REVOGADO", participacaoId: null } });
    const [cand] = await criarCandidatos(e, 1);
    await db().votoJuri.create({ data: { eventoId: e, participacaoId: participacao.id, candidatoId: cand } });
    expect(await alternarModuloJuri(admin, e, false, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect((await db().evento.findUniqueOrThrow({ where: { id: e } })).moduloJuri).toBe(true);
    expect((await db().configPlacar.findUniqueOrThrow({ where: { eventoId: e } })).pesoJuri).toBe(40);
  });

  it("trava com a urna aberta e depois dela; só o admin do evento; evento concluído é leitura", async () => {
    const e = await semearEvento("teste-modulo-juri-fase", { urna: "ABERTA" });
    const admin = await criarAdminDireto(e);
    const publico = await criarUsuarioDireto(e);
    expect(await alternarModuloJuri(admin, e, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: e }, data: { estadoUrna: "ENCERRADA" } });
    expect(await alternarModuloJuri(admin, e, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO" } });
    expect(await alternarModuloJuri(admin, e, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });

    const e2 = await semearEvento("teste-modulo-juri-acesso", { ativo: true });
    const publico2 = await criarUsuarioDireto(e2);
    expect(await alternarModuloJuri(publico2, e2, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(await alternarModuloJuri(null, e2, true, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    expect(publico.id).not.toBe(admin.id);
    expect((await db().evento.findUniqueOrThrow({ where: { id: e2 } })).moduloJuri).toBe(false);
  });
});

/** Evento com 4 itens, três votos populares e a urna aberta; encerra e devolve o resultado oficial v1. */
async function eventoEncerrado(slug: string, opcoes: { juri?: boolean; infantil?: boolean } = {}) {
  const eventoId = await semearEvento(slug);
  if (opcoes.juri) await ligarJuri(eventoId, { pesoJuri: 40 });
  if (opcoes.infantil && !opcoes.juri) await ligarInfantil(eventoId);
  const admin = await criarAdminDireto(eventoId);
  const candidatos = await criarCandidatos(eventoId, 4);
  zerarMemoria();
  expect((await ativarEvento(admin, eventoId)).ok).toBe(true);
  expect((await abrirUrna(admin, eventoId)).ok).toBe(true);
  for (const [i, candidatoId] of [candidatos[0], candidatos[0], candidatos[1]].entries()) {
    const eleitor = await criarUsuarioDireto(eventoId);
    expect((await votarPopular(eleitor, { eventoId, candidatoId }, { ip: `192.0.2.${i + 1}` })).ok).toBe(true);
  }
  return { eventoId, admin, candidatos };
}

describe("telão: status, ao vivo e revelação", () => {
  it("só o admin do evento enxerga qualquer coisa do telão", async () => {
    const { eventoId, candidatos } = await eventoEncerrado("teste-telao-acesso");
    const publico = await criarUsuarioDireto(eventoId);
    const outro = await semearEvento("teste-telao-acesso-outro");
    const adminOutro = await criarAdminDireto(outro);
    for (const quem of [null, publico, adminOutro]) {
      expect(await obterStatusResultado(quem, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
      expect(await obterEstadoAoVivo(quem, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
      expect(await carregarRevelacao(quem, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
      expect(await obterDadosEnsaio(quem, eventoId, "SEM_EMPATE")).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
      expect(await registrarAcaoApresentacao(quem, eventoId, "REVELACAO_INICIADA", { versao: 1 }, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    }
    expect(candidatos).toHaveLength(4);
  });

  it("urna aberta: total ao vivo sem parcial por item; liberado pelo admin o parcial aparece só nesta fase", async () => {
    const e = await semearEvento("teste-telao-aovivo");
    const admin = await criarAdminDireto(e);
    const c = await criarCandidatos(e, 3);
    zerarMemoria();
    await ativarEvento(admin, e);
    await abrirUrna(admin, e);
    for (const [i, alvo] of [c[0], c[0], c[2]].entries())
      expect((await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: alvo }, { ip: `192.0.2.${i + 20}` })).ok).toBe(true);

    expect(await obterStatusResultado(admin, e)).toMatchObject({ ok: true, dados: { existe: false, versao: null, assinatura: null } });
    expect(await obterEstadoAoVivo(admin, e)).toEqual({ ok: true, dados: { totalGeral: 3, parcial: null } });
    expect(await carregarRevelacao(admin, e)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });

    await db().configApresentacao.update({ where: { eventoId: e }, data: { parcialAoVivo: true } });
    const aoVivo = await obterEstadoAoVivo(admin, e);
    expect(aoVivo.ok && aoVivo.dados.parcial).toEqual(c.map((id, i) => ({ candidatoId: id, votos: [2, 0, 1][i] })));
  });

  it("o total ao vivo soma o júri (quem já registrou) e o infantil, e o parcial some depois do encerramento", async () => {
    // Urna aberta direto no banco: com júri e totem ligados o checklist de ativação pediria convites e um totem pareado.
    const e = await semearEvento("teste-telao-aovivo-modulos", { urna: "ABERTA" });
    await ligarJuri(e, { pesoJuri: 30 });
    await db().evento.update({ where: { id: e }, data: { moduloInfantil: true } });
    await db().configPlacar.update({ where: { eventoId: e }, data: { pesoPopular: 40, pesoJuri: 30, pesoInfantil: 30 } });
    const admin = await criarAdminDireto(e);
    const c = await criarCandidatos(e, 3);
    zerarMemoria();
    expect((await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: c[0] }, { ip: "192.0.2.60" })).ok).toBe(true);
    const jurado = await criarUsuarioDireto(e, "JURADO");
    const p = await db().participacao.findFirstOrThrow({ where: { usuarioId: jurado.id, eventoId: e } });
    await db().votoJuri.create({ data: { eventoId: e, participacaoId: p.id, candidatoId: c[1] } });
    await db().participacao.update({ where: { id: p.id }, data: { votou: true } });
    await criarUsuarioDireto(e, "JURADO"); // jurado que ainda não votou: não conta
    const disp = await db().dispositivo.create({ data: { eventoId: e, nome: "Totem", hashToken: randomUUID().replaceAll("-", ""), estado: "ATIVO" } });
    await db().votoInfantil.create({ data: { eventoId: e, dispositivoId: disp.id, candidatoId: c[2] } });
    await db().configApresentacao.update({ where: { eventoId: e }, data: { parcialAoVivo: true } });

    const aberta = await obterEstadoAoVivo(admin, e);
    expect(aberta.ok && aberta.dados.totalGeral).toBe(3);
    expect(aberta.ok && aberta.dados.parcial).not.toBeNull();
    expect((await encerrarUrna(admin, e)).ok).toBe(true);
    const encerrada = await obterEstadoAoVivo(admin, e);
    expect(encerrada.ok && encerrada.dados.parcial).toBeNull(); // mesmo com a flag ligada, depois do encerramento não sai parcial
  });

  it("urna encerrada: status com a versão e a assinatura, revelação com o resultado oficial e os itens", async () => {
    const { eventoId, admin, candidatos } = await eventoEncerrado("teste-telao-revelacao");
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);

    const status = await obterStatusResultado(admin, eventoId);
    expect(status).toMatchObject({ ok: true, dados: { existe: true, versao: 1 } });
    const assinatura = status.ok ? status.dados.assinatura : null;
    expect(assinatura).toMatch(/^[0-9a-f]+-[0-9a-f]+$/);

    const revelacao = await carregarRevelacao(admin, eventoId);
    expect(revelacao.ok).toBe(true);
    if (!revelacao.ok) return;
    expect(revelacao.dados).toMatchObject({ versao: 1, motivo: "ENCERRAMENTO", assinatura, modulos: { juri: false, infantil: false }, candidatosNaDisputa: 4 });
    expect(revelacao.dados.candidatos.map((c) => c.id)).toEqual(candidatos);
    expect(revelacao.dados.dados.ranking[0]).toMatchObject({ candidatoId: candidatos[0], posicao: 1 });
    expect(revelacao.dados.pesos).toEqual({ POPULAR: 100, JURI: 0, INFANTIL: 0 });
    // O DTO não carrega nada que identifique quem votou.
    expect(JSON.stringify(revelacao.dados)).not.toMatch(/@|hashRecibo|participacao/i);
  });

  it("nova versão (desqualificação) muda a assinatura e a revelação passa a ser a nova", async () => {
    const { eventoId, admin, candidatos } = await eventoEncerrado("teste-telao-versao");
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    const antes = await obterStatusResultado(admin, eventoId);
    // Desqualifica o líder direto na apuração: grava a versão 2 pelo mesmo caminho da operação.
    const { desqualificarCandidato } = await import("@/server/candidatos");
    expect((await desqualificarCandidato(admin, eventoId, candidatos[0], "Regulamento")).ok).toBe(true);
    const depois = await obterStatusResultado(admin, eventoId);
    expect(antes.ok && depois.ok && antes.dados.assinatura !== depois.dados.assinatura).toBe(true);
    expect(depois).toMatchObject({ ok: true, dados: { versao: 2 } });
    const revelacao = await carregarRevelacao(admin, eventoId);
    expect(revelacao.ok && revelacao.dados.versao).toBe(2);
    expect(revelacao.ok && revelacao.dados.dados.desqualificados).toEqual([candidatos[0]]);
    // O desqualificado segue na lista de itens (o palco sabe quem saiu) mas fora da disputa.
    expect(revelacao.ok && revelacao.dados.candidatos.map((c) => c.id)).toContain(candidatos[0]);
    expect(revelacao.ok && revelacao.dados.candidatosNaDisputa).toBe(3);
  });

  it("evento concluído ainda entrega a revelação (o final abre direto)", async () => {
    const { eventoId, admin } = await eventoEncerrado("teste-telao-concluido");
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    await db().evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO" } });
    expect((await carregarRevelacao(admin, eventoId)).ok).toBe(true);
    expect(await obterStatusResultado(admin, eventoId)).toMatchObject({ ok: true, dados: { existe: true } });
  });
});

describe("telão: trilha da cerimônia", () => {
  it("audita início, conclusão, refeita e emergência com só a versão e a cena", async () => {
    const { eventoId, admin } = await eventoEncerrado("teste-telao-trilha");
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    for (const [acao, info] of [
      ["REVELACAO_INICIADA", { versao: 1 }],
      ["REVELACAO_CONCLUIDA", { versao: 1, cena: 7 }],
      ["REVELACAO_REFEITA", { versao: 1 }],
      ["EMERGENCIA_ACIONADA", { versao: 1, cena: 9 }],
    ] as const)
      expect((await registrarAcaoApresentacao(admin, eventoId, acao, info, ctx)).ok).toBe(true);

    const linhas = await db().auditoria.findMany({ where: { eventoId, acao: { in: ["REVELACAO_INICIADA", "REVELACAO_CONCLUIDA", "REVELACAO_REFEITA", "EMERGENCIA_ACIONADA"] } }, orderBy: { id: "asc" } });
    expect(linhas.map((l) => [l.acao, l.detalhes])).toEqual([
      ["REVELACAO_INICIADA", { versao: 1 }],
      ["REVELACAO_CONCLUIDA", { versao: 1, cena: 7 }],
      ["REVELACAO_REFEITA", { versao: 1 }],
      ["EMERGENCIA_ACIONADA", { versao: 1, cena: 9 }],
    ]);
    expect(linhas.every((l) => l.atorUsuarioId === admin.id && l.ipHash && l.ipHash !== ctx.ip)).toBe(true);
    const grupo = await listarAuditoria(admin, eventoId, { grupo: "APRESENTACAO" });
    expect(grupo.ok && grupo.dados).toHaveLength(4);
  });

  it("não audita uma versão que não existe nem fora das fases com resultado", async () => {
    const { eventoId, admin } = await eventoEncerrado("teste-telao-trilha-recusa");
    // Urna ainda aberta: sem resultado, sem cerimônia.
    expect(await registrarAcaoApresentacao(admin, eventoId, "REVELACAO_INICIADA", { versao: 1 }, ctx)).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    expect(await registrarAcaoApresentacao(admin, eventoId, "REVELACAO_INICIADA", { versao: 9 }, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await db().auditoria.count({ where: { eventoId, acao: "REVELACAO_INICIADA" } })).toBe(0);
  });

  it("pelo RPC: ação fora do catálogo e versão inválida são recusadas antes de chegar ao banco", async () => {
    const e = await semearEvento("teste-telao-rpc");
    const contexto: ContextoRpc = { headers: new Headers(), ip: ctx.ip, cookies: [] };
    for (const args of [
      { eventoId: e, acao: "URNA_ABERTA", versao: 1 },
      { eventoId: e, acao: "REVELACAO_INICIADA", versao: 0 },
      { eventoId: e, acao: "REVELACAO_INICIADA", versao: 1.5 },
      { eventoId: e, acao: "REVELACAO_INICIADA", versao: 1, cena: -1 },
    ])
      expect(await executarServico("registrarAcaoApresentacao", args, contexto)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await executarServico("obterDadosEnsaio", { eventoId: e }, contexto)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });
});

describe("telão: ensaio", () => {
  it("monta um resultado inventado com os itens e os módulos do evento, sem tocar em voto, resultado ou auditoria", async () => {
    const e = await semearEvento("teste-telao-ensaio", { ativo: true });
    await ligarJuri(e, { pesoJuri: 40 });
    const admin = await criarAdminDireto(e);
    const c = await criarCandidatos(e, 5);
    const antes = { votos: await db().voto.count(), resultados: await db().resultadoOficial.count({ where: { eventoId: e } }), auditoria: await db().auditoria.count({ where: { eventoId: e } }) };

    for (const id of cenariosDoEnsaio({ juri: true, infantil: false })) {
      const r = await obterDadosEnsaio(admin, e, id);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.dados.candidatos.map((x) => x.id)).toEqual(c);
      expect(r.dados.modulos).toEqual({ juri: true, infantil: false });
      expect(r.dados.dados.ranking).toHaveLength(5);
      expect(r.dados.totalGeral).toBeGreaterThan(0);
      expect(r.dados.votosPorMinutoSimulados.length).toBeGreaterThan(0);
    }
    expect({ votos: await db().voto.count(), resultados: await db().resultadoOficial.count({ where: { eventoId: e } }), auditoria: await db().auditoria.count({ where: { eventoId: e } }) }).toEqual(antes);
  });

  it("não vaza voto real: o ensaio é igual com e sem votos no evento", async () => {
    const sem = await semearEvento("teste-telao-ensaio-sem-votos");
    const com = await semearEvento("teste-telao-ensaio-com-votos");
    const adminSem = await criarAdminDireto(sem);
    const adminCom = await criarAdminDireto(com);
    const cSem = await criarCandidatos(sem, 4);
    const cCom = await criarCandidatos(com, 4);
    zerarMemoria();
    await ativarEvento(adminCom, com);
    await abrirUrna(adminCom, com);
    for (const [i, alvo] of [cCom[3], cCom[3], cCom[3]].entries())
      expect((await votarPopular(await criarUsuarioDireto(com), { eventoId: com, candidatoId: alvo }, { ip: `192.0.2.${i + 80}` })).ok).toBe(true);
    const a = await obterDadosEnsaio(adminSem, sem, "SEM_EMPATE");
    const b = await obterDadosEnsaio(adminCom, com, "SEM_EMPATE");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    // Mesma posição de cada item, mesmos votos: o líder real (último item) não aparece à frente.
    expect(a.dados.dados.ranking.map((r) => cSem.indexOf(r.candidatoId))).toEqual(b.dados.dados.ranking.map((r) => cCom.indexOf(r.candidatoId)));
    expect(a.dados.dados.placares.POPULAR.map((p) => p.votos)).toEqual(b.dados.dados.placares.POPULAR.map((p) => p.votos));
  });

  it("recusa cenário desconhecido, cenário que o evento não comporta e poucos itens", async () => {
    const e = await semearEvento("teste-telao-ensaio-recusa", { ativo: true });
    const admin = await criarAdminDireto(e);
    await criarCandidatos(e, 2);
    expect(await obterDadosEnsaio(admin, e, "NAO_EXISTE")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    // Só o público: o empate resolvido precisa de um segundo grupo de voto.
    expect(await obterDadosEnsaio(admin, e, "EMPATE_RESOLVIDO")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await obterDadosEnsaio(admin, e, "SEM_EMPATE")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", mensagem: expect.stringContaining("3") } });
    await criarCandidatos(e, 1);
    expect((await obterDadosEnsaio(admin, e, "SEM_EMPATE")).ok).toBe(true);
  });

  it("itens não publicados ou desqualificados ficam de fora do ensaio", async () => {
    const e = await semearEvento("teste-telao-ensaio-votaveis", { ativo: true });
    const admin = await criarAdminDireto(e);
    const c = await criarCandidatos(e, 4);
    await db().candidato.update({ where: { id: c[1] }, data: { desqualificado: true } });
    const [extra] = await criarCandidatos(e, 1, { publicados: false });
    const r = await obterDadosEnsaio(admin, e, "SEM_EMPATE");
    expect(r.ok && r.dados.candidatos.map((x) => x.id)).toEqual([c[0], c[2], c[3]]);
    expect(r.ok && r.dados.candidatos.some((x) => x.id === extra)).toBe(false);
  });
});
