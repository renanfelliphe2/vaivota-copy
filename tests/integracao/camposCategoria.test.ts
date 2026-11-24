import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { criarCandidato, salvarCamposExtras, salvarCandidato } from "@/server/candidatos";
import { salvarCategorias, vincularCandidatosCategoria, type CategoriaEditadaServidor } from "@/server/categorias";
import { db, desconectarBanco } from "@/server/db";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { zerarMemoria } from "@/server/limites";
import type { UsuarioSessao } from "@/server/sessao";
import { criarAdminDireto, semearEvento } from "./apoio";

// D1 (25/11/2026): campos extras por categoria. Cada categoria define os seus; o item preenche os da categoria dele; mudar o
// item de categoria apaga os valores dos campos que a nova não tem; uma categoria pode copiar os campos de outra.

const ctx = { ip: "203.0.113.41" };
let eventoId: string;
let admin: UsuarioSessao;

const chavesDe = async (categoriaId: string) =>
  (await db().campoCandidato.findMany({ where: { categoriaId }, orderBy: { ordem: "asc" } })).map((c) => c.chave);
const categoriasDoEvento = () => db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
const comoLista = async (): Promise<CategoriaEditadaServidor[]> =>
  (await categoriasDoEvento()).map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "" }));

beforeAll(async () => {
  eventoId = await semearEvento("teste-campos-categoria");
  admin = await criarAdminDireto(eventoId);
});

beforeEach(() => zerarMemoria());

afterAll(async () => {
  await desconectarBanco();
});

describe("campos extras por categoria (D1)", () => {
  it("a categoria nova nasce sem campos ou com os de outra, copiados com as mesmas chaves", async () => {
    const [unica] = await categoriasDoEvento();
    expect(await chavesDe(unica.id)).toEqual(["descricao", "equipe", "tecnologias"]);

    const lista = [
      ...(await comoLista()),
      { id: null, nome: "Copiada", premio: "", copiarCamposDe: unica.id },
      { id: null, nome: "Vazia", premio: "" },
    ];
    expect(await salvarCategorias(admin, eventoId, lista, ctx)).toEqual({ ok: true, dados: null });
    const [, copiada, vazia] = await categoriasDoEvento();
    expect(await chavesDe(copiada.id)).toEqual(["descricao", "equipe", "tecnologias"]);
    expect(await chavesDe(vazia.id)).toEqual([]);
    // A cópia não mexe na origem.
    expect(await chavesDe(unica.id)).toEqual(["descricao", "equipe", "tecnologias"]);
    const registro = await db().auditoria.findFirst({ where: { eventoId, entidade: "categoria" }, orderBy: { criadoEm: "desc" } });
    expect(registro?.detalhes).toMatchObject({ camposCopiados: [{ categoria: "Copiada", de: unica.nome, campos: 3 }] });
  });

  it("os campos de uma categoria não mexem nos da outra; copiar mantém a chave", async () => {
    const [unica, copiada, vazia] = await categoriasDoEvento();
    // Na Vazia: um campo novo e o "Equipe" copiado (com a chave da origem).
    const r = await salvarCamposExtras(admin, eventoId, vazia.id, [{ rotulo: "Escola" }, { chave: "equipe", rotulo: "Equipe" }]);
    expect(r).toEqual({ ok: true, dados: null });
    expect(await chavesDe(vazia.id)).toEqual(["escola", "equipe"]);
    // Renomear e remover na Copiada não afeta a única.
    expect((await salvarCamposExtras(admin, eventoId, copiada.id, [{ chave: "descricao", rotulo: "Sinopse" }])).ok).toBe(true);
    expect(await chavesDe(copiada.id)).toEqual(["descricao"]);
    expect(await chavesDe(unica.id)).toEqual(["descricao", "equipe", "tecnologias"]);
    // Categoria de outro evento: recusada.
    expect(await salvarCamposExtras(admin, eventoId, "nao-existe", [{ rotulo: "X" }])).toMatchObject({ ok: false, erro: { codigo: "NAO_ENCONTRADO" } });
  });

  it("o item guarda só os campos da categoria dele; mudar de categoria apaga os que a nova não tem", async () => {
    const [unica, , vazia] = await categoriasDoEvento();
    const novo = await criarCandidato(admin, eventoId, {
      titulo: "Projeto com campos",
      imagemUrl: null,
      categoriaId: unica.id,
      camposExtras: { descricao: "Um projeto", equipe: "Time A", tecnologias: "Next.js", escola: "não é desta categoria" },
    });
    expect(novo.ok).toBe(true);
    if (!novo.ok) return;
    const id = novo.dados.id;
    const valores = async () => (await db().candidato.findUniqueOrThrow({ where: { id } })).camposExtras;
    expect(await valores()).toEqual({ descricao: "Um projeto", equipe: "Time A", tecnologias: "Next.js" });

    // Para a Vazia (escola, equipe): descrição e tecnologias se perdem; equipe fica (mesma chave).
    const ids = (await db().candidato.findMany({ where: { categoriaId: vazia.id }, select: { id: true } })).map((c) => c.id);
    expect(await vincularCandidatosCategoria(admin, eventoId, vazia.id, [...ids, id], ctx)).toEqual({ ok: true, dados: null });
    expect(await valores()).toEqual({ equipe: "Time A" });
    const registro = await db().auditoria.findFirst({ where: { eventoId, entidade: "categoria", entidadeId: vazia.id }, orderBy: { criadoEm: "desc" } });
    expect(registro?.detalhes).toMatchObject({ entraram: 1, valoresApagados: 2 });

    // Na edição, valem os campos da categoria atual.
    expect(
      (await salvarCandidato(admin, eventoId, id, { titulo: "Projeto com campos", imagemUrl: null, camposExtras: { escola: "Escola X", tecnologias: "Volta?" } })).ok,
    ).toBe(true);
    expect(await valores()).toEqual({ escola: "Escola X" });
  });

  it("o estado público leva os campos com a categoria de cada um", async () => {
    invalidarEstadoPublico();
    const estado = await montarEstadoPublico(admin);
    const doEvento = estado.eventos.find((e) => e.evento.id === eventoId);
    const [, copiada, vazia] = await categoriasDoEvento();
    expect(doEvento?.camposCandidato.filter((c) => c.categoriaId === vazia.id).map((c) => c.rotulo)).toEqual(["Escola", "Equipe"]);
    expect(doEvento?.camposCandidato.filter((c) => c.categoriaId === copiada.id).map((c) => c.rotulo)).toEqual(["Sinopse"]);
  });

  it("excluir a categoria leva os campos dela", async () => {
    const [unica, copiada] = await categoriasDoEvento();
    expect(await chavesDe(copiada.id)).toHaveLength(1);
    const lista = (await comoLista()).filter((c) => c.id !== copiada.id);
    expect(await salvarCategorias(admin, eventoId, lista, ctx)).toEqual({ ok: true, dados: null });
    expect(await db().campoCandidato.count({ where: { categoriaId: copiada.id } })).toBe(0);
    expect(await chavesDe(unica.id)).toEqual(["descricao", "equipe", "tecnologias"]);
  });
});
