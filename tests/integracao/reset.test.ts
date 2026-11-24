import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { OPCOES_RESET_VAZIAS, type OpcoesReset } from "@/dominio/resetEvento";
import { db, desconectarBanco } from "@/server/db";
import { concluirEvento, encerrarUrna, resetarEvento } from "@/server/operacao";
import type { UsuarioSessao } from "@/server/sessao";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, ligarInfantil, ligarJuri, semearEvento } from "./apoio";

// Demanda E1 (25/11/2026): resetar o evento volta para rascunho com a urna não iniciada, em qualquer estado, e zera só o marcado.

afterAll(async () => {
  await desconectarBanco();
});

const hex = () => randomBytes(32).toString("hex");

type Cenario = { eventoId: string; nome: string; admin: UsuarioSessao; publico: UsuarioSessao; jurado: UsuarioSessao };

/** Evento concluído com um pouco de tudo: voto do público, do júri (voto, nota, escolha, histórico), do totem e resultado oficial. */
async function eventoConcluidoComDados(slug: string): Promise<Cenario> {
  const eventoId = await semearEvento(slug, { urna: "ABERTA" });
  const [criterioId] = await ligarJuri(eventoId, { criterios: ["Direção"], pesoJuri: 30 });
  await ligarInfantil(eventoId, { pesoInfantil: 20 });
  await db().configPlacar.update({ where: { eventoId }, data: { pesoPopular: 50, pesoJuri: 30, pesoInfantil: 20 } });
  const [c1, c2] = await criarCandidatos(eventoId, 2);
  const categoria = await db().categoria.findFirstOrThrow({ where: { eventoId } });
  const admin = await criarAdminDireto(eventoId);

  const publico = await criarUsuarioDireto(eventoId, "PUBLICO", "pub");
  const pPublico = await db().participacao.update({
    where: { usuarioId_eventoId: { usuarioId: publico.id, eventoId } },
    data: { votou: true },
  });
  await db().participacaoCategoria.create({ data: { participacaoId: pPublico.id, categoriaId: categoria.id, eventoId } });
  await db().voto.create({ data: { eventoId, candidatoId: c1, hashRecibo: hex() } });

  const jurado = await criarUsuarioDireto(eventoId, "JURADO", "jur");
  const pJurado = await db().participacao.update({
    where: { usuarioId_eventoId: { usuarioId: jurado.id, eventoId } },
    data: { votou: true },
  });
  await db().conviteJurado.create({ data: { eventoId, hashCodigo: hex(), estado: "USADO", participacaoId: pJurado.id, resgatadoEm: new Date() } });
  await db().conviteJurado.create({ data: { eventoId, hashCodigo: hex() } });
  const votoJuri = await db().votoJuri.create({ data: { eventoId, participacaoId: pJurado.id, candidatoId: c2 } });
  await db().historicoVotoJuri.create({ data: { votoJuriId: votoJuri.id, candidatoAnteriorId: c1, candidatoNovoId: c2 } });
  await db().notaJuri.create({ data: { eventoId, participacaoId: pJurado.id, candidatoId: c1, criterioId: criterioId!, nota: 8 } });
  await db().escolhaCriterioJuri.create({ data: { eventoId, participacaoId: pJurado.id, candidatoId: c1, criterioId: criterioId! } });

  const totem = await db().dispositivo.create({ data: { eventoId, nome: "Totem 1", hashToken: hex() } });
  await db().codigoPareamento.create({
    data: { eventoId, hashCodigo: hex(), estado: "USADO", dispositivoId: totem.id, validadeAte: new Date(Date.now() + 60_000) },
  });
  await db().codigoPareamento.create({ data: { eventoId, hashCodigo: hex(), validadeAte: new Date(Date.now() + 60_000) } });
  await db().votoInfantil.create({ data: { eventoId, candidatoId: c2, dispositivoId: totem.id, idEnvio: randomUUID() } });
  await db().auditoria.create({ data: { eventoId, atorDispositivoId: totem.id, acao: "DISPOSITIVO_PAREADO", entidade: "dispositivo" } });

  expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
  const { nome } = await db().evento.findUniqueOrThrow({ where: { id: eventoId } });
  expect((await concluirEvento(admin, eventoId, nome)).ok).toBe(true);
  return { eventoId, nome, admin, publico, jurado };
}

async function contar(eventoId: string) {
  const [votos, votosJuri, historico, notas, escolhas, votosTotem, marcas, resultados, publico, jurados, admins, votaram, convites, totens, codigos] =
    await Promise.all([
      db().voto.count({ where: { eventoId } }),
      db().votoJuri.count({ where: { eventoId } }),
      db().historicoVotoJuri.count({ where: { votoJuri: { eventoId } } }),
      db().notaJuri.count({ where: { eventoId } }),
      db().escolhaCriterioJuri.count({ where: { eventoId } }),
      db().votoInfantil.count({ where: { eventoId } }),
      db().participacaoCategoria.count({ where: { eventoId } }),
      db().resultadoOficial.count({ where: { eventoId } }),
      db().participacao.count({ where: { eventoId, papel: "PUBLICO" } }),
      db().participacao.count({ where: { eventoId, papel: "JURADO" } }),
      db().participacao.count({ where: { eventoId, papel: "ADMIN" } }),
      db().participacao.count({ where: { eventoId, votou: true } }),
      db().conviteJurado.count({ where: { eventoId } }),
      db().dispositivo.count({ where: { eventoId } }),
      db().codigoPareamento.count({ where: { eventoId } }),
    ]);
  return { votos, votosJuri, historico, notas, escolhas, votosTotem, marcas, resultados, publico, jurados, admins, votaram, convites, totens, codigos };
}

const opcoes = (o: Partial<OpcoesReset>): OpcoesReset => ({ ...OPCOES_RESET_VAZIAS, ...o });

describe("resetar o evento (E1)", () => {
  it("só o admin do evento, e com o nome certo", async () => {
    const c = await eventoConcluidoComDados("teste-reset-acesso");
    for (const quem of [c.publico, c.jurado, null]) {
      expect(await resetarEvento(quem, c.eventoId, c.nome, opcoes({ votos: true }))).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    }
    expect(await resetarEvento(c.admin, c.eventoId, "outro nome", opcoes({ votos: true }))).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const evento = await db().evento.findUniqueOrThrow({ where: { id: c.eventoId } });
    expect(evento.estado).toBe("CONCLUIDO");
    expect((await contar(c.eventoId)).votos).toBe(1);
  });

  it("sem nada marcado: volta para rascunho e não apaga nada", async () => {
    const c = await eventoConcluidoComDados("teste-reset-nada");
    const antes = await contar(c.eventoId);
    const r = await resetarEvento(c.admin, c.eventoId, c.nome, OPCOES_RESET_VAZIAS);
    expect(r.ok).toBe(true);
    const evento = await db().evento.findUniqueOrThrow({ where: { id: c.eventoId } });
    expect(evento).toMatchObject({ estado: "RASCUNHO", estadoUrna: "NAO_INICIADA", urnaAbertaEm: null, urnaEncerradaEm: null, concluidoEm: null });
    expect(await contar(c.eventoId)).toEqual(antes);
  });

  it("votos: zera todos os votos, marcas e resultados; pessoas, convites e totens ficam", async () => {
    const c = await eventoConcluidoComDados("teste-reset-votos");
    const r = await resetarEvento(c.admin, c.eventoId, c.nome, opcoes({ votos: true }));
    expect(r).toMatchObject({ ok: true, dados: { votosPublico: 1, votosJuri: 1, notasJuri: 1, escolhasJuri: 1, votosTotem: 1, resultados: 1 } });
    expect(await contar(c.eventoId)).toEqual({
      votos: 0,
      votosJuri: 0,
      historico: 0,
      notas: 0,
      escolhas: 0,
      votosTotem: 0,
      marcas: 0,
      resultados: 0,
      publico: 1,
      jurados: 1,
      admins: 1,
      votaram: 0,
      convites: 2,
      totens: 1,
      codigos: 2,
    });
  });

  it("tudo marcado: só a participação da organização fica; contas, configuração e auditoria continuam", async () => {
    const c = await eventoConcluidoComDados("teste-reset-tudo");
    const candidatosAntes = await db().candidato.count({ where: { eventoId: c.eventoId } });
    const auditoriaAntes = await db().auditoria.count({ where: { eventoId: c.eventoId } });
    const r = await resetarEvento(c.admin, c.eventoId, c.nome, { votos: true, contasPublico: true, jurados: true, totens: true });
    expect(r).toMatchObject({ ok: true, dados: { participacoesPublico: 1, participacoesJurado: 1, convitesJurado: 2, totens: 1, codigosPareamento: 2 } });
    expect(await contar(c.eventoId)).toMatchObject({ votos: 0, publico: 0, jurados: 0, admins: 1, convites: 0, totens: 0, codigos: 0 });
    // As contas ficam; a configuração também.
    expect(await db().usuario.count({ where: { id: { in: [c.publico.id, c.jurado.id] } } })).toBe(2);
    expect(await db().candidato.count({ where: { eventoId: c.eventoId } })).toBe(candidatosAntes);
    expect(await db().configPlacar.findUniqueOrThrow({ where: { eventoId: c.eventoId } })).toMatchObject({ pesoPopular: 50, pesoJuri: 30, pesoInfantil: 20 });
    // A auditoria nunca é apagada e ganha a linha do reset.
    expect(await db().auditoria.count({ where: { eventoId: c.eventoId } })).toBe(auditoriaAntes + 1);
    const linha = await db().auditoria.findFirstOrThrow({ where: { eventoId: c.eventoId, acao: "EVENTO_RESETADO" } });
    expect(linha).toMatchObject({ atorUsuarioId: c.admin.id, entidade: "evento", entidadeId: c.eventoId });
    expect(linha.detalhes).toMatchObject({ faseAnterior: "CONCLUIDO", zerado: { votos: true, contasPublico: true, jurados: true, totens: true } });
  });

  it("contas do público, jurados ou totens sem votos: o servidor zera os votos junto", async () => {
    const c = await eventoConcluidoComDados("teste-reset-dependencia");
    const r = await resetarEvento(c.admin, c.eventoId, c.nome, opcoes({ totens: true }));
    expect(r.ok).toBe(true);
    expect(await contar(c.eventoId)).toMatchObject({ votos: 0, votosJuri: 0, votosTotem: 0, resultados: 0, totens: 0, publico: 1, jurados: 1 });
    const linha = await db().auditoria.findFirstOrThrow({ where: { eventoId: c.eventoId, acao: "EVENTO_RESETADO" } });
    expect(linha.detalhes).toMatchObject({ zerado: { votos: true, totens: true, contasPublico: false, jurados: false } });
  });

  it("vale também com a urna aberta, e o evento pode ser operado de novo", async () => {
    const eventoId = await semearEvento("teste-reset-aberta", { urna: "ABERTA" });
    const admin = await criarAdminDireto(eventoId);
    const { nome } = await db().evento.findUniqueOrThrow({ where: { id: eventoId } });
    expect((await resetarEvento(admin, eventoId, nome, opcoes({ votos: true }))).ok).toBe(true);
    expect(await db().evento.findUniqueOrThrow({ where: { id: eventoId } })).toMatchObject({ estado: "RASCUNHO", estadoUrna: "NAO_INICIADA" });
  });
});
