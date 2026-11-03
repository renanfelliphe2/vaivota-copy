import { afterAll, describe, expect, it } from "vitest";
import { avaliarContrasteTema } from "@/dominio/contrasteTema";
import { avaliarChecklist } from "@/dominio/checklistAtivacao";
import { db, desconectarBanco } from "@/server/db";
import { invalidarEstadoPublico, montarEstadoPublico } from "@/server/estadoPublico";
import { temaParaDominio } from "@/server/mapeadores";
import { entradaDoChecklist } from "@/server/operacao";
import { salvarParceiros } from "@/server/parceiros";
import { semearFestivalVerEFazerFilmes, semearMaratonaTechTivit } from "@/server/semente";
import { criarAdminDireto } from "./apoio";

// Seed dos eventos contra um PostgreSQL de verdade: o Festival nasce completo e rodar o seed de novo nunca desfaz uma edição.

afterAll(async () => {
  await desconectarBanco();
});

const ctx = { ip: "203.0.113.70" };

describe("seed do Festival", () => {
  it("cria o evento em rascunho com os módulos, o tema, os pesos, os critérios e os parceiros do festival", async () => {
    const { eventoId, criado } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival" });
    expect(criado).toBe(true);

    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { tema: true, configPlacar: true, configApresentacao: true } });
    expect(evento).toMatchObject({
      nome: "9º Festival Ver e Fazer Filmes",
      local: "Cataguases · MG",
      estado: "RASCUNHO",
      estadoUrna: "NAO_INICIADA",
      moduloJuri: true,
      moduloInfantil: true,
      bloquearVotoProprio: true,
      encerramentoAutomatico: false,
      fusoHorario: "America/Sao_Paulo",
    });
    expect(evento.janelaInicio?.toISOString()).toBe("2026-11-25T13:00:00.000Z"); // 10h em Brasília
    expect(evento.janelaFim?.toISOString()).toBe("2026-11-28T23:00:00.000Z"); // 20h em Brasília
    expect(evento.tema).toMatchObject({
      corPrimaria: "#F15A29",
      corSecundaria: "#8DC63F",
      rotuloCandidato: "Curta",
      rotuloCandidatos: "Curtas",
      logoUrl: "/festival-ver-e-fazer-filmes-logo.webp",
    });
    expect(evento.configPlacar).toMatchObject({ pesoPopular: 50, pesoJuri: 30, pesoInfantil: 20, regraDesempate: "JURI", modoVotoJuri: "VOTO_UNICO" });
    expect(evento.configApresentacao).toMatchObject({ modoAvanco: "MANUAL", trailerUrl: null, usarTrailerGerado: true });

    const criterios = await db().criterioJuri.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(criterios.map((c) => [c.nome, c.ordem])).toEqual([["Direção", 1], ["Roteiro", 2], ["Fotografia", 3], ["Som", 4]]);
    const parceiros = await db().parceiro.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(parceiros).toHaveLength(6);
    expect(parceiros[0]).toMatchObject({ nome: "Instituto Cidade de Cataguases", logoUrl: "/parceiros/instituto-cidade-de-cataguases.png", ordem: 1 });
    expect(parceiros.every((p) => p.logoUrl?.startsWith("/parceiros/"))).toBe(true);
    const campos = await db().campoCandidato.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(campos.map((c) => c.chave)).toEqual(["descricao", "direcao", "duracao"]);
  });

  it("passa no contraste do tema e no checklist, pedindo só o que falta (itens, convites do júri e totem)", async () => {
    const { eventoId } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival-checklist" });
    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { tema: true } });
    expect(avaliarContrasteTema(temaParaDominio(evento.tema!, evento.fusoHorario)).aprovado).toBe(true);

    const entrada = (await entradaDoChecklist(eventoId))!;
    const itens = Object.fromEntries(avaliarChecklist(entrada).map((i) => [i.id, i.estado]));
    expect(itens).toMatchObject({ PESOS: "OK", TEMA: "OK", ITENS: "PENDENTE", CONVITES: "PENDENTE" });
    expect(entrada).toMatchObject({ moduloJuri: true, moduloInfantil: true, pesos: { POPULAR: 50, JURI: 30, INFANTIL: 20 } });
  });

  it("rodar de novo não muda nem traz de volta o que o admin editou", async () => {
    const slug = "teste-semente-festival-idempotente";
    const { eventoId } = await semearFestivalVerEFazerFilmes({ slug });
    await db().evento.update({ where: { id: eventoId }, data: { nome: "Outro nome", moduloInfantil: false } });
    await db().configPlacar.update({ where: { eventoId }, data: { pesoPopular: 70, pesoJuri: 30, pesoInfantil: 0 } });
    await db().tema.update({ where: { eventoId }, data: { corPrimaria: "#112233" } });
    await db().criterioJuri.deleteMany({ where: { eventoId, nome: { in: ["Som", "Fotografia"] } } });
    await db().parceiro.deleteMany({ where: { eventoId } });
    await db().campoCandidato.deleteMany({ where: { eventoId, chave: "duracao" } });

    const segunda = await semearFestivalVerEFazerFilmes({ slug });
    expect(segunda).toEqual({ eventoId, criado: false });
    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { tema: true, configPlacar: true } });
    expect(evento).toMatchObject({ nome: "Outro nome", moduloInfantil: false });
    expect(evento.configPlacar).toMatchObject({ pesoPopular: 70, pesoJuri: 30, pesoInfantil: 0 });
    expect(evento.tema?.corPrimaria).toBe("#112233");
    expect((await db().criterioJuri.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } })).map((c) => c.nome)).toEqual(["Direção", "Roteiro"]);
    expect(await db().parceiro.count({ where: { eventoId } })).toBe(0);
    // Os campos extras são só os que faltam (comportamento do seed da Maratona): o removido volta, o resto fica.
    expect((await db().campoCandidato.count({ where: { eventoId } }))).toBe(3);
  });

  it("guarda o link do trailer quando informado, sem o trailer gerado; link só com espaços vale como ausente", async () => {
    const { eventoId } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival-trailer", trailerUrl: " https://www.youtube.com/watch?v=U4GmYqhTJgk " });
    expect(await db().configApresentacao.findUniqueOrThrow({ where: { eventoId } })).toMatchObject({
      trailerUrl: "https://www.youtube.com/watch?v=U4GmYqhTJgk",
      usarTrailerGerado: false,
    });
    const { eventoId: outro } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival-trailer-vazio", trailerUrl: "   " });
    expect(await db().configApresentacao.findUniqueOrThrow({ where: { eventoId: outro } })).toMatchObject({ trailerUrl: null, usarTrailerGerado: true });
  });

  it("o admin salva a lista de parceiros do seed como está (os logos de /parceiros valem) e reordena", async () => {
    const { eventoId } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival-parceiros" });
    const admin = await criarAdminDireto(eventoId);
    const antes = await db().parceiro.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    const igual = antes.map((p) => ({ id: p.id, nome: p.nome, logoUrl: p.logoUrl }));
    expect((await salvarParceiros(admin, eventoId, igual, ctx)).ok).toBe(true);
    expect((await salvarParceiros(admin, eventoId, [...igual].reverse(), ctx)).ok).toBe(true);
    const depois = await db().parceiro.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
    expect(depois.map((p) => p.id)).toEqual(antes.map((p) => p.id).reverse());
    expect(depois.every((p) => p.logoUrl?.startsWith("/parceiros/"))).toBe(true);
  });

  it("em rascunho o visitante vê o festival só como 'em breve' (sem parceiros) e o admin vê tudo", async () => {
    const { eventoId } = await semearFestivalVerEFazerFilmes({ slug: "teste-semente-festival-publico" });
    const admin = await criarAdminDireto(eventoId);
    invalidarEstadoPublico();
    const visitante = (await montarEstadoPublico(null)).eventos.find((e) => e.evento.id === eventoId)!;
    expect(visitante.parceiros).toHaveLength(0);
    expect(visitante.candidatos).toHaveLength(0);
    expect(visitante.criteriosJuri.map((c) => c.nome)).toEqual(["Direção", "Roteiro", "Fotografia", "Som"]);
    const doAdmin = (await montarEstadoPublico(admin)).eventos.find((e) => e.evento.id === eventoId)!;
    expect(doAdmin.parceiros).toHaveLength(6);
  });
});

describe("seed da Maratona (sem mudança)", () => {
  it("segue só com o público, sem critérios nem parceiros, e rodar de novo não altera nada", async () => {
    const { eventoId, criado } = await semearMaratonaTechTivit({ slug: "teste-semente-maratona", nome: "Maratona de teste" });
    expect(criado).toBe(true);
    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, include: { tema: true, configPlacar: true } });
    expect(evento).toMatchObject({ moduloJuri: false, moduloInfantil: false, bloquearVotoProprio: false, encerramentoAutomatico: false, linkSobre: null });
    expect(evento.tema).toMatchObject({ nomeExibicao: "Maratona de teste", rotuloCandidato: "Projeto", rotuloCandidatos: "Projetos", logoUrl: null, corPrimaria: "#0097B1" });
    expect(evento.configPlacar).toMatchObject({ pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" });
    expect(await db().criterioJuri.count({ where: { eventoId } })).toBe(0);
    expect(await db().parceiro.count({ where: { eventoId } })).toBe(0);
    expect((await db().campoCandidato.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } })).map((c) => c.chave)).toEqual(["descricao", "equipe", "tecnologias"]);
    expect(await semearMaratonaTechTivit({ slug: "teste-semente-maratona" })).toEqual({ eventoId, criado: false });
  });
});
