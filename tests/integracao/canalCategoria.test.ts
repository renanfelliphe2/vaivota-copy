import { afterAll, describe, expect, it } from "vitest";
import { criarCandidato } from "@/server/candidatos";
import { salvarCategorias } from "@/server/categorias";
import { db, desconectarBanco } from "@/server/db";
import { alterarCategoriasDispositivo, gerarCodigoPareamento, listarDispositivos } from "@/server/dispositivos";
import { parearTotem, votarInfantil, type ContextoTotem } from "@/server/totem";
import { votarPopular } from "@/server/votacao";
import type { UsuarioSessao } from "@/server/sessao";
import { cookieDe, criarAdminDireto, criarCandidatos, criarUsuarioDireto, ligarInfantil, semearEvento } from "./apoio";

// Canal da categoria e categorias do totem (25/11/2026), contra um PostgreSQL de verdade: a categoria do totem não é votada pela
// página, a da página não é votada pelo totem, cada totem só vota nas categorias que exibe, e todo evento tem ao menos uma categoria.

const PIN = "90817364";
const ctx = { ip: "203.0.113.77" };
let sequenciaIp = 0;
const novoIp = () => `198.51.101.${(++sequenciaIp % 250) + 1}`;

afterAll(async () => {
  await desconectarBanco();
});

/** Evento com a categoria única do seed (ONLINE) e mais duas do totem, cada uma com dois itens. */
async function eventoComCanais(slug: string) {
  const eventoId = await semearEvento(slug, { ativo: true });
  await ligarInfantil(eventoId);
  const admin = await criarAdminDireto(eventoId);
  const pagina = await db().categoria.findFirstOrThrow({ where: { eventoId }, select: { id: true } });
  const infantil = await db().categoria.create({ data: { eventoId, nome: "Mostra Infantil", slug: "mostra-infantil", canal: "TOTEM", ordem: 2 } });
  const escolas = await db().categoria.create({ data: { eventoId, nome: "Escolas", slug: "escolas", canal: "TOTEM", ordem: 3 } });
  const itens = {
    pagina: await criarCandidatos(eventoId, 2, { categoriaId: pagina.id }),
    infantil: await criarCandidatos(eventoId, 2, { categoriaId: infantil.id }),
    escolas: await criarCandidatos(eventoId, 2, { categoriaId: escolas.id }),
  };
  return { eventoId, admin, categorias: { pagina: pagina.id, infantil: infantil.id, escolas: escolas.id }, itens };
}

async function criarTotem(admin: UsuarioSessao, eventoId: string, categoriaIds: string[]) {
  const ip = novoIp();
  const gerado = await gerarCodigoPareamento(admin, eventoId, { nome: `Totem ${ip}`, pin: PIN, categoriaIds }, { ip });
  if (!gerado.ok) throw new Error(`gerarCodigoPareamento falhou: ${gerado.erro.codigo}`);
  const cookies: string[] = [];
  const pareado = await parearTotem({ headers: new Headers(), ip, cookies }, { eventoId, codigo: gerado.dados.codigo });
  if (!pareado.ok) throw new Error(`parearTotem falhou: ${pareado.erro.codigo}`);
  const tablet: ContextoTotem = { headers: new Headers({ cookie: cookieDe(cookies) }), ip, cookies: [] };
  return { id: pareado.dados.dispositivo.id, categoriaIds: pareado.dados.dispositivo.categoriaIds, tablet };
}

const abrirUrna = (eventoId: string) => db().evento.update({ where: { id: eventoId }, data: { estadoUrna: "ABERTA", urnaAbertaEm: new Date() } });

describe("voto por canal", () => {
  it("a página não vota em categoria do totem; o totem só vota nas categorias que exibe", async () => {
    const { eventoId, admin, categorias, itens } = await eventoComCanais("teste-canal-voto");
    const totem = await criarTotem(admin, eventoId, [categorias.infantil]);
    expect(totem.categoriaIds).toEqual([categorias.infantil]);
    await abrirUrna(eventoId);

    // Página: só a categoria ONLINE.
    const pessoa = await criarUsuarioDireto(eventoId);
    expect(await votarPopular(pessoa, { eventoId, candidatoId: itens.infantil[0] }, ctx)).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect(await votarPopular(pessoa, { eventoId, candidatoId: itens.pagina[0] }, ctx)).toMatchObject({ ok: true });

    // Totem: nem a da página, nem a do totem que ele não exibe.
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.pagina[0] })).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.escolas[0] })).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.infantil[1] })).toMatchObject({ ok: true });

    expect(await db().voto.count({ where: { eventoId } })).toBe(1);
    expect(await db().votoInfantil.count({ where: { eventoId } })).toBe(1);
  });

  it("trocar as categorias do totem vale no voto seguinte", async () => {
    const { eventoId, admin, categorias, itens } = await eventoComCanais("teste-canal-troca-totem");
    const totem = await criarTotem(admin, eventoId, [categorias.infantil]);
    await abrirUrna(eventoId);
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.escolas[0] })).toMatchObject({ ok: false });

    expect(await alterarCategoriasDispositivo(admin, eventoId, totem.id, [categorias.escolas], ctx)).toEqual({ ok: true, dados: null });
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.escolas[0] })).toMatchObject({ ok: true });
    expect(await votarInfantil(totem.tablet, { eventoId, candidatoId: itens.infantil[0] })).toMatchObject({ ok: false, erro: { codigo: "CANDIDATO_INDISPONIVEL" } });

    const lista = await listarDispositivos(admin, eventoId);
    expect(lista.ok && lista.dados.find((d) => d.id === totem.id)?.categoriaIds).toEqual([categorias.escolas]);
    expect(await db().auditoria.count({ where: { eventoId, entidade: "dispositivo", entidadeId: totem.id, acao: "CONFIG_ALTERADA" } })).toBe(1);
  });
});

describe("categorias do totem na gestão", () => {
  it("o código de pareamento exige ao menos uma categoria, e só do totem", async () => {
    const { eventoId, admin, categorias } = await eventoComCanais("teste-canal-codigo");
    const vazio = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem A", pin: PIN, categoriaIds: [] }, ctx);
    expect(vazio).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { categorias: expect.any(String) } } });
    const daPagina = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem B", pin: PIN, categoriaIds: [categorias.pagina] }, ctx);
    expect(daPagina).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { categorias: expect.any(String) } } });
    const dePropria = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem C", pin: PIN, categoriaIds: [categorias.infantil, categorias.escolas] }, ctx);
    expect(dePropria.ok).toBe(true);
    // Trocar as categorias de um totem também exige ao menos uma, e só do totem.
    const totem = await criarTotem(admin, eventoId, [categorias.infantil]);
    expect(await alterarCategoriasDispositivo(admin, eventoId, totem.id, [], ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await alterarCategoriasDispositivo(admin, eventoId, totem.id, [categorias.pagina], ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
  });

  it("categoria que um totem em uso exibe não vai para a página nem é removida; o pareamento descarta a que mudou de canal", async () => {
    const { eventoId, admin, categorias } = await eventoComCanais("teste-canal-salvar");
    await criarTotem(admin, eventoId, [categorias.infantil]);
    const atuais = await db().categoria.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const lista = atuais.map((c) => ({ id: c.id, nome: c.nome, premio: "", canal: c.canal }));

    const paraPagina = lista.map((c) => (c.id === categorias.infantil ? { ...c, canal: "ONLINE" as const } : c));
    expect(await salvarCategorias(admin, eventoId, paraPagina, ctx)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });

    // "Escolas" não está em totem nenhum: vai para a página. Um código gerado antes com ela não pareia mais.
    const codigo = await gerarCodigoPareamento(admin, eventoId, { nome: "Totem Escolas", pin: PIN, categoriaIds: [categorias.escolas] }, ctx);
    if (!codigo.ok) throw new Error("sem código");
    const escolasNaPagina = lista.map((c) => (c.id === categorias.escolas ? { ...c, canal: "ONLINE" as const } : c));
    expect(await salvarCategorias(admin, eventoId, escolasNaPagina, ctx)).toEqual({ ok: true, dados: null });
    expect((await db().categoria.findUniqueOrThrow({ where: { id: categorias.escolas } })).canal).toBe("ONLINE");
    expect(await parearTotem({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: codigo.dados.codigo })).toMatchObject({
      ok: false,
      erro: { codigo: "CODIGO_INVALIDO" },
    });
  });

  it("a lista de categorias não fica vazia", async () => {
    const eventoId = await semearEvento("teste-canal-sem-categoria");
    const admin = await criarAdminDireto(eventoId);
    expect(await salvarCategorias(admin, eventoId, [], ctx)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO", campos: { categorias: expect.any(String) } } });
    expect(await db().categoria.count({ where: { eventoId } })).toBe(1);
  });
});

describe("categoria única", () => {
  it("o seed cria \"Melhor <item>\", e o item novo de um evento de categoria única já entra nela", async () => {
    const eventoId = await semearEvento("teste-canal-unica");
    const admin = await criarAdminDireto(eventoId);
    const [unica] = await db().categoria.findMany({ where: { eventoId } });
    expect(unica).toMatchObject({ nome: "Melhor Projeto", slug: "melhor-projeto", canal: "ONLINE" });

    const novo = await criarCandidato(admin, eventoId, { titulo: "Projeto Novo", imagemUrl: null, camposExtras: {} });
    if (!novo.ok) throw new Error(`criarCandidato falhou: ${novo.erro.codigo}`);
    expect((await db().candidato.findUniqueOrThrow({ where: { id: novo.dados.id } })).categoriaId).toBe(unica.id);

    // Com duas categorias, o admin escolhe: o item nasce sem categoria.
    await db().categoria.create({ data: { eventoId, nome: "Outra", slug: "outra", ordem: 2 } });
    const outro = await criarCandidato(admin, eventoId, { titulo: "Projeto Dois", imagemUrl: null, camposExtras: {} });
    if (!outro.ok) throw new Error(`criarCandidato falhou: ${outro.erro.codigo}`);
    expect((await db().candidato.findUniqueOrThrow({ where: { id: outro.dados.id } })).categoriaId).toBeNull();
  });
});
