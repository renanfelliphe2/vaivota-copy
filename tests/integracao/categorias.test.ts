import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { avaliarChecklist } from "@/dominio/checklistAtivacao";
import type { DadosResultado } from "@/dominio/tipos";
import { carregarRevelacao, obterStatusResultado } from "@/server/apresentacao";
import { alterarPublicacao, criarCandidato, salvarCandidato } from "@/server/candidatos";
import { salvarCategorias, type CategoriaEditadaServidor } from "@/server/categorias";
import { db, desconectarBanco } from "@/server/db";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { zerarMemoria } from "@/server/limites";
import { abrirUrna, ativarEvento, encerrarUrna, entradaDoChecklist } from "@/server/operacao";
import type { UsuarioSessao } from "@/server/sessao";
import { consultarEstadoVoto, votarPopular } from "@/server/votacao";
import { criarAdminDireto, criarUsuarioDireto, IMAGEM_FALSA, semearEvento } from "./apoio";

// Categorias do evento (09/11/2026, organograma do Festival Ver e Fazer Filmes): cada categoria tem os seus itens e o seu voto
// popular; a pessoa vota uma vez em CADA categoria. Contra um PostgreSQL de verdade.

const ctx = { ip: "203.0.113.31" };
let eventoId: string;
let admin: UsuarioSessao;
/** Na ordem: Mostra Infantil, Vídeo-escola, Usina Criativa. */
let categorias: { id: string; slug: string }[];
/** Itens por categoria (índice = categoria). */
let itens: string[][];

const LISTA: CategoriaEditadaServidor[] = [
  { id: null, nome: "Mostra Infantil", premio: "Melhor filme", slug: "mostra-infantil" },
  { id: null, nome: "Vídeo-escola", premio: "Melhor filme Júri Popular", slug: "video-escola" },
  { id: null, nome: "Usina Criativa de Cinema", premio: "Melhor filme Júri Popular", slug: "usina-criativa" },
];

/** Endereço no formato das imagens enviadas a este evento (o salvarCandidato só aceita esse); o arquivo não precisa existir. */
const imagemDoEvento = () => `/uploads/${eventoId}/${randomUUID()}.png`;

async function criarItem(categoriaId: string | null, titulo: string, publicado = true) {
  const maior = await db().candidato.aggregate({ where: { eventoId }, _max: { ordem: true } });
  const c = await db().candidato.create({
    data: { eventoId, titulo, imagemUrl: IMAGEM_FALSA, publicado, ordem: (maior._max.ordem ?? 0) + 1, categoriaId },
  });
  return c.id;
}

beforeAll(async () => {
  eventoId = await semearEvento("teste-categorias");
  admin = await criarAdminDireto(eventoId);
  const r = await salvarCategorias(admin, eventoId, LISTA, ctx);
  expect(r).toEqual({ ok: true, dados: null });
  categorias = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" }, select: { id: true, slug: true } });
  itens = [];
  for (const [i, c] of categorias.entries()) {
    const n = [3, 2, 2][i];
    const ids: string[] = [];
    for (let k = 1; k <= n; k++) ids.push(await criarItem(c.id, `Filme ${i + 1}.${k}`));
    itens.push(ids);
  }
});

beforeEach(() => zerarMemoria());

afterAll(async () => {
  await desconectarBanco();
});

describe("salvarCategorias", () => {
  it("cria na ordem recebida, com prêmio opcional, e audita", async () => {
    const salvas = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(salvas.map((c) => [c.nome, c.premio, c.slug, c.ordem])).toEqual([
      ["Mostra Infantil", "Melhor filme", "mostra-infantil", 1],
      ["Vídeo-escola", "Melhor filme Júri Popular", "video-escola", 2],
      ["Usina Criativa de Cinema", "Melhor filme Júri Popular", "usina-criativa", 3],
    ]);
    const auditoria = await db().auditoria.findFirst({ where: { eventoId, acao: "CONFIG_ALTERADA", entidade: "categoria" } });
    expect(auditoria?.detalhes).toMatchObject({ quantidade: 3 });
  });

  it("recusa nome repetido, endereço inválido ou repetido, e quem não é admin", async () => {
    const atuais = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const base = atuais.map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", slug: c.slug }));
    const nomeRepetido = [...base, { id: null, nome: "mostra infantil", premio: "", slug: "outra" }];
    expect(await salvarCategorias(admin, eventoId, nomeRepetido, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const slugRuim = [...base, { id: null, nome: "Nova", premio: "", slug: "Com Espaço" }];
    expect(await salvarCategorias(admin, eventoId, slugRuim, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const slugRepetido = [...base, { id: null, nome: "Nova", premio: "", slug: "video-escola" }];
    expect(await salvarCategorias(admin, eventoId, slugRepetido, ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    const publico = await criarUsuarioDireto(eventoId);
    expect(await salvarCategorias(publico, eventoId, base, ctx)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });

  it("troca dois endereços entre si sem colidir no índice único", async () => {
    const atuais = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const trocada = atuais.map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", slug: c.slug }));
    [trocada[0].slug, trocada[1].slug] = [trocada[1].slug, trocada[0].slug];
    expect((await salvarCategorias(admin, eventoId, trocada, ctx)).ok).toBe(true);
    // e volta ao original
    [trocada[0].slug, trocada[1].slug] = [trocada[1].slug, trocada[0].slug];
    expect((await salvarCategorias(admin, eventoId, trocada, ctx)).ok).toBe(true);
    const depois = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" }, select: { slug: true } });
    expect(depois.map((c) => c.slug)).toEqual(["mostra-infantil", "video-escola", "usina-criativa"]);
  });

  it("não remove categoria com itens (CONFLITO); sem itens, remove", async () => {
    const atuais = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const base = atuais.map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", slug: c.slug }));
    expect(await salvarCategorias(admin, eventoId, base.slice(1), ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect((await salvarCategorias(admin, eventoId, [...base, { id: null, nome: "Temporária", premio: "", slug: "temporaria" }], ctx)).ok).toBe(true);
    expect((await salvarCategorias(admin, eventoId, base, ctx)).ok).toBe(true);
    expect(await db().categoria.count({ where: { eventoId } })).toBe(3);
  });
});

describe("itens e categorias", () => {
  it("criar com categoria de outro evento é recusado", async () => {
    const outro = await semearEvento("teste-categorias-outro");
    const adminOutro = await criarAdminDireto(outro);
    expect((await salvarCategorias(adminOutro, outro, [{ id: null, nome: "Alheia", premio: "", slug: "alheia" }], ctx)).ok).toBe(true);
    const alheia = await db().categoria.findFirstOrThrow({ where: { eventoId: outro } });
    const r = await criarCandidato(admin, eventoId, { titulo: "Intruso", imagemUrl: null, camposExtras: {}, categoriaId: alheia.id });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { categoriaId: expect.any(String) } } });
  });

  it("com categorias, colocar na votação exige categoria", async () => {
    const semCategoria = await criarItem(null, "Sem categoria", false);
    expect(await alterarPublicacao(admin, eventoId, semCategoria, true)).toMatchObject({
      ok: false,
      erro: { codigo: "VALIDACAO", campos: { categoriaId: expect.any(String) } },
    });
    const salvo = await salvarCandidato(admin, eventoId, semCategoria, {
      titulo: "Sem categoria",
      imagemUrl: imagemDoEvento(),
      camposExtras: {},
      categoriaId: categorias[0].id,
    });
    expect(salvo.ok).toBe(true);
    expect((await alterarPublicacao(admin, eventoId, semCategoria, true)).ok).toBe(true);
    // Volta ao estado combinado para os testes de voto (3 itens na primeira categoria).
    await db().candidato.delete({ where: { id: semCategoria } });
  });

  it("o checklist pede item em toda categoria e categoria em todo item na votação", async () => {
    const vazia = await db().categoria.create({ data: { eventoId, nome: "Vazia", slug: "vazia", ordem: 9 } });
    const solto = await criarItem(null, "Solto");
    const entrada = await entradaDoChecklist(eventoId);
    expect(entrada?.categorias).toEqual({ total: 4, semItens: 1, itensSemCategoria: 1 });
    expect(avaliarChecklist(entrada!).find((i) => i.id === "CATEGORIAS")?.estado).toBe("PENDENTE");
    expect(await ativarEvento(admin, eventoId)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    await db().candidato.delete({ where: { id: solto } });
    await db().categoria.delete({ where: { id: vazia.id } });
    const ok = await entradaDoChecklist(eventoId);
    expect(avaliarChecklist(ok!).find((i) => i.id === "CATEGORIAS")?.estado).toBe("OK");
  });
});

describe("voto por categoria", () => {
  beforeAll(async () => {
    expect((await ativarEvento(admin, eventoId)).ok).toBe(true);
    expect((await abrirUrna(admin, eventoId)).ok).toBe(true);
  });

  it("uma vez em cada categoria: a segunda na mesma é JA_VOTOU; em outra, vale", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    expect(await votarPopular(eu, { eventoId, candidatoId: itens[0][0] }, ctx)).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });
    expect(await votarPopular(eu, { eventoId, candidatoId: itens[0][1] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "JA_VOTOU" } });
    expect(await votarPopular(eu, { eventoId, candidatoId: itens[1][0] }, ctx)).toEqual({ ok: true, dados: { resultado: "REGISTRADO" } });

    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: eu.id, eventoId } });
    expect(participacao.votou).toBe(true);
    const marcas = await db().participacaoCategoria.findMany({ where: { participacaoId: participacao.id }, select: { categoriaId: true } });
    expect(marcas.map((m) => m.categoriaId).sort()).toEqual([categorias[0].id, categorias[1].id].sort());
    expect(await db().voto.count({ where: { eventoId, candidatoId: itens[0][1] } })).toBe(0);

    const estado = await consultarEstadoVoto(eu, { eventoId }, ctx);
    expect(estado.ok && [...estado.dados.categoriasVotadas].sort()).toEqual([categorias[0].id, categorias[1].id].sort());
    expect(estado.ok && estado.dados.votou).toBe(true);
  });

  it("sigilo: a marca da categoria não guarda horário nem o item", async () => {
    const colunas = await db().$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'participacao_categoria'`;
    expect(colunas.map((c) => c.column_name).sort()).toEqual(["categoria_id", "evento_id", "participacao_id"]);
  });

  it("requisições simultâneas na mesma categoria gravam um voto só", async () => {
    const eu = await criarUsuarioDireto(eventoId);
    const antes = await db().voto.count({ where: { eventoId } });
    const respostas = await Promise.all(
      Array.from({ length: 8 }, (_, i) => votarPopular(eu, { eventoId, candidatoId: itens[0][i % 3] }, { ip: `198.51.100.${40 + i}` })),
    );
    expect(respostas.filter((r) => r.ok)).toHaveLength(1);
    for (const r of respostas) if (!r.ok) expect(["JA_VOTOU", "LIMITE_TENTATIVAS"]).toContain(r.erro.codigo);
    expect(await db().voto.count({ where: { eventoId } })).toBe(antes + 1);
  });

  it("item na votação sem categoria não é votável (não aparece em página nenhuma)", async () => {
    const solto = await criarItem(null, "Solto");
    const eu = await criarUsuarioDireto(eventoId);
    expect(await votarPopular(eu, { eventoId, candidatoId: solto }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    await db().candidato.delete({ where: { id: solto } });
  });

  it("o estado público traz as categorias, a categoria de cada item e em quais a pessoa já votou", async () => {
    invalidarEstadoPublico();
    const eu = await criarUsuarioDireto(eventoId);
    expect((await votarPopular(eu, { eventoId, candidatoId: itens[2][0] }, ctx)).ok).toBe(true);
    const publico = await montarEstadoPublico(eu);
    const meu = publico.eventos.find((e) => e.evento.id === eventoId)!;
    expect(meu.categorias.map((c) => c.slug)).toEqual(["mostra-infantil", "video-escola", "usina-criativa"]);
    expect(meu.candidatos.find((c) => c.id === itens[1][0])?.categoriaId).toBe(categorias[1].id);
    expect(meu.participacao?.categoriasVotadas).toEqual([categorias[2].id]);
  });

  it("com a urna aberta, a estrutura trava (criar, remover, trocar o endereço, mudar item de categoria); nome e prêmio, não", async () => {
    const atuais = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const base = atuais.map((c) => ({ id: c.id, nome: c.nome, premio: c.premio ?? "", slug: c.slug }));
    expect(await salvarCategorias(admin, eventoId, [...base, { id: null, nome: "Nova", premio: "", slug: "nova" }], ctx)).toMatchObject({
      ok: false,
      erro: { codigo: "TRAVADO" },
    });
    const enderecoNovo = base.map((c, i) => (i === 0 ? { ...c, slug: "infantil" } : c));
    expect(await salvarCategorias(admin, eventoId, enderecoNovo, ctx)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    const renomeada = base.map((c, i) => (i === 0 ? { ...c, premio: "Melhor filme infantil" } : c));
    expect((await salvarCategorias(admin, eventoId, renomeada, ctx)).ok).toBe(true);
    expect((await salvarCategorias(admin, eventoId, base, ctx)).ok).toBe(true);

    const r = await salvarCandidato(admin, eventoId, itens[0][0], { titulo: "Filme 1.1", imagemUrl: imagemDoEvento(), camposExtras: {}, categoriaId: categorias[1].id });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
  });
});

describe("resultado e telão por categoria", () => {
  let dados: DadosResultado;

  beforeAll(async () => {
    // Votos combinados: na 1ª categoria, o item 2 vence (3 × 1); na 2ª, o item 1 (2 × 0); na 3ª, o item 2 (2 × 1).
    const plano: [number, number][] = [
      [0, 1], [0, 1], [0, 1], [0, 2],
      [1, 0], [1, 0],
      [2, 1], [2, 1],
    ];
    for (const [cat, item] of plano) {
      const eu = await criarUsuarioDireto(eventoId);
      expect((await votarPopular(eu, { eventoId, candidatoId: itens[cat][item] }, ctx)).ok).toBe(true);
    }
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    const resultado = await db().resultadoOficial.findFirstOrThrow({ where: { eventoId }, orderBy: { versao: "desc" } });
    dados = resultado.dados as unknown as DadosResultado;
  });

  it("o resultado congelado traz a apuração de cada categoria, só com os itens dela", async () => {
    expect(dados.porCategoria?.map((c) => c.nome)).toEqual(["Mostra Infantil", "Vídeo-escola", "Usina Criativa de Cinema"]);
    for (const [i, c] of (dados.porCategoria ?? []).entries()) {
      expect(c.categoriaId).toBe(categorias[i].id);
      expect(c.dados.ranking.map((r) => r.candidatoId).sort()).toEqual([...itens[i]].sort());
    }
    const vencedor = (i: number) => dados.porCategoria![i].dados.ranking.find((r) => r.posicao === 1)?.candidatoId;
    expect(vencedor(0)).toBe(itens[0][1]);
    expect(vencedor(1)).toBe(itens[1][0]);
    expect(vencedor(2)).toBe(itens[2][1]);
    // Os totais de cada categoria somam os votos dela; o geral, todos.
    const totalDe = (i: number) => dados.porCategoria![i].dados.totais.POPULAR;
    expect(totalDe(0) + totalDe(1) + totalDe(2)).toBe(dados.totais.POPULAR);
  });

  it("o telão revela uma categoria por vez: itens, apuração e assinatura dela", async () => {
    const [a, b] = categorias;
    const statusA = await obterStatusResultado(admin, eventoId, a.id);
    const statusB = await obterStatusResultado(admin, eventoId, b.id);
    expect(statusA.ok && statusA.dados.existe).toBe(true);
    expect(statusA.ok && statusB.ok && statusA.dados.assinatura !== statusB.dados.assinatura).toBe(true);

    const revelacao = await carregarRevelacao(admin, eventoId, a.id);
    expect(revelacao.ok).toBe(true);
    if (!revelacao.ok) return;
    expect(revelacao.dados.candidatos.map((c) => c.id).sort()).toEqual([...itens[0]].sort());
    expect(revelacao.dados.dados.ranking.find((r) => r.posicao === 1)?.candidatoId).toBe(itens[0][1]);
    expect(revelacao.dados.assinatura).toBe(statusA.ok ? statusA.dados.assinatura : null);

    expect(await obterStatusResultado(admin, eventoId, "nao-existe")).toMatchObject({ ok: true, dados: { existe: false, assinatura: null } });
    expect(await carregarRevelacao(admin, eventoId, "nao-existe")).toMatchObject({ ok: false, erro: { codigo: "RESULTADO_INDISPONIVEL" } });
  });
});
