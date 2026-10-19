import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  alterarPublicacao,
  criarCandidato,
  desqualificarCandidato,
  removerCandidato,
  salvarCamposExtras,
  salvarCandidato,
  salvarOrdemCandidatos,
} from "@/server/candidatos";
import { salvarGeral, salvarPlacar, salvarTema } from "@/server/configuracao";
import { db, desconectarBanco } from "@/server/db";
import { abrirUrna, ativarEvento, concluirEvento, encerrarUrna, entradaDoChecklist } from "@/server/operacao";
import { zerarMemoria } from "@/server/limites";
import { guardarImagem } from "@/server/storage";
import { votarPopular } from "@/server/votacao";
import { avaliarChecklist } from "@/dominio/checklistAtivacao";
import { semearMaratonaTechTivit } from "@/server/semente";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, IMAGEM_FALSA, semearEvento } from "./apoio";
import type { UsuarioSessao } from "@/server/sessao";
import { prefixoPublico } from "@/server/storage";

// ST2 e ST4: candidatos, ativação, abertura, encerramento (com o resultado congelado) e conclusão.

let eventoId: string;
let admin: UsuarioSessao;
const ctx = { ip: "203.0.113.9" };

beforeAll(async () => {
  eventoId = await semearEvento("teste-operacao");
  admin = await criarAdminDireto(eventoId);
});

afterAll(async () => {
  await desconectarBanco();
});

const dados = (titulo: string, imagemUrl: string | null = null) => ({ titulo, descricao: `Descrição de ${titulo}`, imagemUrl, camposExtras: {} });

describe("seed da Maratona Tech Tivit", () => {
  it("usa o nome e o slug públicos atuais de forma idempotente", async () => {
    const primeira = await semearMaratonaTechTivit();
    expect(primeira.criado).toBe(true);
    await expect(db().evento.findUniqueOrThrow({ where: { id: primeira.eventoId } })).resolves.toMatchObject({
      slug: "maratona-tech-tivit",
      nome: "Maratona Tech Tivit",
    });
    await expect(db().tema.findUniqueOrThrow({ where: { eventoId: primeira.eventoId } })).resolves.toMatchObject({
      corPrimaria: "#0097B1",
      corSecundaria: "#7ED958",
      corFundo: "#FFFFFF",
      corTexto: "#0F172A",
      fonte: "Space Grotesk",
    });

    const segunda = await semearMaratonaTechTivit();
    expect(segunda).toEqual({ eventoId: primeira.eventoId, criado: false });
  });
});

describe("só o admin do evento opera", () => {
  it("público e visitante recebem NAO_AUTORIZADO", async () => {
    const publico = await criarUsuarioDireto(eventoId);
    for (const quem of [publico, null]) {
      expect(await ativarEvento(quem, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
      expect(await criarCandidato(quem, eventoId, dados("X"))).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    }
    // admin de outro evento não vale neste
    const outro = await semearEvento("teste-operacao-outro");
    const adminDeOutro = await criarAdminDireto(outro);
    expect(await ativarEvento(adminDeOutro, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    // e-mail não verificado também não
    expect(await ativarEvento({ ...admin, emailVerificado: false }, eventoId)).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
  });
});

describe("candidatos (ST2)", () => {
  it("cria como rascunho; sem imagem não publica; com imagem do sistema publica", async () => {
    const criado = await criarCandidato(admin, eventoId, dados("Projeto sem imagem"));
    expect(criado.ok).toBe(true);
    if (!criado.ok) return;
    const id = criado.dados.id;
    expect((await db().candidato.findUniqueOrThrow({ where: { id } })).publicado).toBe(false);

    expect(await alterarPublicacao(admin, eventoId, id, true)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });

    const url = await guardarImagem(eventoId, PNG_MINIMO, "image/png");
    expect(url.startsWith(prefixoPublico())).toBe(true);
    expect((await salvarCandidato(admin, eventoId, id, dados("Projeto sem imagem", url))).ok).toBe(true);
    expect((await alterarPublicacao(admin, eventoId, id, true)).ok).toBe(true);
    expect((await db().candidato.findUniqueOrThrow({ where: { id } })).publicado).toBe(true);
    await removerArquivo(url);
  });

  it("recusa imagem que não veio do upload do sistema (endereço externo, SVG, caminho forjado)", async () => {
    for (const url of ["https://exemplo.com/x.png", "javascript:alert(1)", "/uploads/../../etc/passwd", `${prefixoPublico()}../x.png`, "placeholder:1"]) {
      expect(await criarCandidato(admin, eventoId, dados("Mal", url))).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    }
  });

  it("o banco recusa candidato publicado sem imagem mesmo por fora do serviço (CHECK)", async () => {
    await expect(db().candidato.create({ data: { eventoId, titulo: "Direto", publicado: true, imagemUrl: null } })).rejects.toThrow();
  });

  it("ordem na votação: aleatória por padrão; trocar grava e audita; só o admin; trava com o evento concluído", async () => {
    const e = await semearEvento("teste-operacao-ordem");
    const adm = await criarAdminDireto(e);
    const ordemAtual = async () => (await db().evento.findUniqueOrThrow({ where: { id: e } })).ordemCandidatos;
    const registros = () => db().auditoria.findMany({ where: { eventoId: e, acao: "CONFIG_ALTERADA", entidade: "evento" } });
    expect(await ordemAtual()).toBe("ALEATORIA");

    expect((await salvarOrdemCandidatos(adm, e, "ALFABETICA")).ok).toBe(true);
    expect(await ordemAtual()).toBe("ALFABETICA");
    const [registro] = await registros();
    expect(registro.detalhes).toMatchObject({ campos: ["ordemCandidatos"], de: "ALEATORIA", para: "ALFABETICA" });
    // a mesma ordem de novo não grava nem audita
    expect((await salvarOrdemCandidatos(adm, e, "ALFABETICA")).ok).toBe(true);
    expect(await registros()).toHaveLength(1);

    const publico = await criarUsuarioDireto(e);
    expect(await salvarOrdemCandidatos(publico, e, "ALEATORIA")).toMatchObject({ ok: false, erro: { codigo: "NAO_AUTORIZADO" } });
    await db().evento.update({ where: { id: e }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    expect(await salvarOrdemCandidatos(adm, e, "ALEATORIA")).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
    expect(await ordemAtual()).toBe("ALFABETICA");
  });

  it("remove sem votos; com a urna aberta a remoção é travada", async () => {
    const e = await semearEvento("teste-operacao-remover", { urna: "ABERTA" });
    const adm = await criarAdminDireto(e);
    const [com, sem] = await criarCandidatos(e, 2, { publicados: false });
    // com a urna aberta a publicação trava; o voto é inserido direto para testar a recusa de remoção
    await db().candidato.update({ where: { id: com }, data: { publicado: true } });
    const eleitor = await criarUsuarioDireto(e);
    zerarMemoria();
    expect((await votarPopular(eleitor, { eventoId: e, candidatoId: com }, ctx)).ok).toBe(true);
    // urna aberta: remover é TRAVADO (trava da matriz); o conflito de votos vem à tona depois do encerramento
    expect(await removerCandidato(adm, e, sem)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    const e2 = await semearEvento("teste-operacao-remover2");
    const adm2 = await criarAdminDireto(e2);
    const [c2] = await criarCandidatos(e2, 1);
    expect((await removerCandidato(adm2, e2, c2)).ok).toBe(true);
    expect(await db().candidato.count({ where: { id: c2 } })).toBe(0);
  });

  it("campos extras: cria, renomeia e remove (apaga os valores dos candidatos)", async () => {
    const e = await semearEvento("teste-operacao-campos");
    const adm = await criarAdminDireto(e);
    const campos = await db().campoCandidato.findMany({ where: { eventoId: e }, orderBy: { ordem: "asc" } });
    expect(campos.map((c) => c.chave)).toEqual(["descricao", "equipe", "tecnologias"]);
    const c = await criarCandidato(adm, e, {
      ...dados("Com campos"),
      camposExtras: { descricao: "Descrição do projeto", equipe: "Time A", tecnologias: "Next.js", invalido: "x" },
    });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect((await db().candidato.findUniqueOrThrow({ where: { id: c.dados.id } })).camposExtras).toEqual({
      descricao: "Descrição do projeto",
      equipe: "Time A",
      tecnologias: "Next.js",
    });

    expect(
      (await salvarCamposExtras(adm, e, [{ chave: "descricao", rotulo: "Descrição" }, { chave: "equipe", rotulo: "Time" }, { rotulo: "Cidade" }])).ok,
    ).toBe(true);
    const depois = await db().campoCandidato.findMany({ where: { eventoId: e }, orderBy: { ordem: "asc" } });
    expect(depois.map((x) => [x.chave, x.rotulo])).toEqual([["descricao", "Descrição"], ["equipe", "Time"], ["cidade", "Cidade"]]);
    expect((await db().candidato.findUniqueOrThrow({ where: { id: c.dados.id } })).camposExtras).toEqual({
      descricao: "Descrição do projeto",
      equipe: "Time A",
    }); // tecnologias foi removido junto
  });
});

describe("operação (ST4)", () => {
  it("o checklist bloqueia a ativação sem o mínimo de 2 projetos publicados", async () => {
    const e = await semearEvento("teste-operacao-checklist");
    const adm = await criarAdminDireto(e);
    await criarCandidatos(e, 1);
    const entrada = await entradaDoChecklist(e);
    expect(avaliarChecklist(entrada!).find((i) => i.id === "ITENS")?.estado).toBe("PENDENTE");
    expect(await ativarEvento(adm, e)).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect((await db().evento.findUniqueOrThrow({ where: { id: e } })).estado).toBe("RASCUNHO");
  });

  it("ativa, abre, trava a lista, encerra gerando a versão 1 e conclui em somente leitura", async () => {
    const e = await semearEvento("teste-operacao-fluxo");
    const adm = await criarAdminDireto(e);
    const ids = await criarCandidatos(e, 4);

    // fora de ordem
    expect(await abrirUrna(adm, e)).toMatchObject({ ok: false });
    expect(await encerrarUrna(adm, e)).toMatchObject({ ok: false, erro: { codigo: "URNA_NAO_ABERTA" } });

    expect((await ativarEvento(adm, e)).ok).toBe(true);
    expect(await ativarEvento(adm, e)).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    expect((await abrirUrna(adm, e)).ok).toBe(true);
    const aberta = await db().evento.findUniqueOrThrow({ where: { id: e } });
    expect(aberta).toMatchObject({ estado: "ATIVO", estadoUrna: "ABERTA" });
    expect(aberta.urnaAbertaEm).not.toBeNull();

    // depois que a urna abre, a lista de projetos e os pesos ficam travados
    expect(await criarCandidato(adm, e, dados("Novo", IMAGEM_FALSA))).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    expect(await alterarPublicacao(adm, e, ids[0], false)).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    expect(await removerCandidato(adm, e, ids[0])).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
    expect(await salvarPlacar(adm, e, { pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" })).toMatchObject({
      ok: false,
      erro: { codigo: "TRAVADO" },
    });

    // votos: 5 no primeiro, 3 no segundo, 3 no terceiro (empate em 2º), 0 no quarto
    zerarMemoria();
    const escolhas = [ids[0], ids[0], ids[0], ids[0], ids[0], ids[1], ids[1], ids[1], ids[2], ids[2], ids[2]];
    for (const candidatoId of escolhas) {
      const eleitor = await criarUsuarioDireto(e);
      expect((await votarPopular(eleitor, { eventoId: e, candidatoId }, ctx)).ok).toBe(true);
    }

    expect((await encerrarUrna(adm, e)).ok).toBe(true);
    expect(await encerrarUrna(adm, e)).toMatchObject({ ok: false, erro: { codigo: "URNA_ENCERRADA" } });
    const versoes = await db().resultadoOficial.findMany({ where: { eventoId: e }, orderBy: { versao: "asc" } });
    expect(versoes).toHaveLength(1);
    expect(versoes[0]).toMatchObject({ versao: 1, motivo: "ENCERRAMENTO", pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0 });

    // o resultado oficial confere com COUNT de votos por projeto no banco
    const contagem = await db().voto.groupBy({ by: ["candidatoId"], where: { eventoId: e }, _count: { _all: true } });
    const doBanco = Object.fromEntries(contagem.map((c) => [c.candidatoId, c._count._all]));
    const dadosOficiais = versoes[0].dados as {
      totais: { POPULAR: number };
      placares: { POPULAR: { candidatoId: string; votos: number }[] };
      ranking: { candidatoId: string; posicao: number; pontuacao: number }[];
    };
    expect(dadosOficiais.totais.POPULAR).toBe(11);
    for (const p of dadosOficiais.placares.POPULAR) expect(p.votos).toBe(doBanco[p.candidatoId] ?? 0);
    expect(dadosOficiais.ranking.find((r) => r.candidatoId === ids[0])).toMatchObject({ posicao: 1 });
    // empate em 2º lugar: posições compartilhadas (sem regra de desempate)
    const segundo = dadosOficiais.ranking.filter((r) => r.candidatoId === ids[1] || r.candidatoId === ids[2]);
    expect(segundo.map((r) => r.posicao)).toEqual([2, 2]);
    expect(dadosOficiais.ranking.find((r) => r.candidatoId === ids[3])?.posicao).toBe(4);

    // concluir exige o nome do evento
    expect(await concluirEvento(adm, e, "nome errado")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect((await concluirEvento(adm, e, "Evento teste-operacao-fluxo")).ok).toBe(true);
    expect(await db().evento.findUniqueOrThrow({ where: { id: e } })).toMatchObject({ estado: "CONCLUIDO", estadoUrna: "ENCERRADA" });
    // evento concluído: somente leitura
    expect(await criarCandidato(adm, e, dados("Tarde"))).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });
    expect(await encerrarUrna(adm, e)).toMatchObject({ ok: false, erro: { codigo: "EVENTO_CONCLUIDO" } });

    // auditoria da operação, sem escolha de voto
    const acoes = (await db().auditoria.findMany({ where: { eventoId: e }, orderBy: { id: "asc" } })).map((a) => a.acao);
    expect(acoes).toEqual(["EVENTO_ATIVADO", "URNA_ABERTA", "URNA_ENCERRADA", "EVENTO_CONCLUIDO"]);
  });

  it("dois admins clicando em encerrar ao mesmo tempo: uma versão só", async () => {
    const e = await semearEvento("teste-operacao-duplo", { urna: "ABERTA" });
    const adm = await criarAdminDireto(e);
    const adm2 = await criarAdminDireto(e);
    await criarCandidatos(e, 2);
    const respostas = await Promise.all([encerrarUrna(adm, e), encerrarUrna(adm2, e), encerrarUrna(adm, e)]);
    expect(respostas.filter((r) => r.ok)).toHaveLength(1);
    expect(await db().resultadoOficial.count({ where: { eventoId: e } })).toBe(1);
  });

  it("desqualificar com a urna encerrada gera a versão 2 (a 1 nunca é sobrescrita)", async () => {
    const e = await semearEvento("teste-operacao-desq", { urna: "ABERTA" });
    const adm = await criarAdminDireto(e);
    const ids = await criarCandidatos(e, 3);
    zerarMemoria();
    for (const c of [ids[0], ids[0], ids[1]]) await votarPopular(await criarUsuarioDireto(e), { eventoId: e, candidatoId: c }, ctx);
    await encerrarUrna(adm, e);
    expect(await desqualificarCandidato(adm, e, ids[0], "curto")).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect((await desqualificarCandidato(adm, e, ids[0], "Descumpriu o regulamento do evento")).ok).toBe(true);
    const versoes = await db().resultadoOficial.findMany({ where: { eventoId: e }, orderBy: { versao: "asc" } });
    expect(versoes.map((v) => [v.versao, v.motivo])).toEqual([[1, "ENCERRAMENTO"], [2, "DESQUALIFICACAO"]]);
    const v2 = versoes[1].dados as { desqualificados: string[]; ranking: { candidatoId: string }[] };
    expect(v2.desqualificados).toEqual([ids[0]]);
    expect(v2.ranking.some((r) => r.candidatoId === ids[0])).toBe(false);
    // os votos do desqualificado permanecem no banco
    expect(await db().voto.count({ where: { candidatoId: ids[0] } })).toBe(2);
  });
});

describe("configuração (ST7)", () => {
  it("salvarGeral: janela e nome; recusa encerramento automático e fim antes do início; slug travado depois de ativar", async () => {
    const e = await semearEvento("teste-operacao-geral");
    const adm = await criarAdminDireto(e);
    const r = await salvarGeral(adm, e, { nome: "Maratona Tech Tivit 2026", janelaInicio: "2026-10-19T09:00:00-03:00", janelaFim: "2026-10-19T21:00:00-03:00" });
    expect(r.ok).toBe(true);
    const evento = await db().evento.findUniqueOrThrow({ where: { id: e } });
    expect(evento.nome).toBe("Maratona Tech Tivit 2026");
    expect(evento.janelaInicio?.toISOString()).toBe("2026-10-19T12:00:00.000Z");
    expect(await salvarGeral(adm, e, { janelaFim: "2026-10-19T08:00:00-03:00" })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await salvarGeral(adm, e, { encerramentoAutomatico: true })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await salvarGeral(adm, e, { slug: "maratona-tech-tivit-2026" })).toMatchObject({ ok: true });
    await db().evento.update({ where: { id: e }, data: { estado: "ATIVO" } });
    expect(await salvarGeral(adm, e, { slug: "outro-endereco" })).toMatchObject({ ok: false, erro: { codigo: "TRAVADO" } });
  });

  it("salvarTema valida contraste e fonte; salvarPlacar exige soma 100", async () => {
    const e = await semearEvento("teste-operacao-tema");
    const adm = await criarAdminDireto(e);
    const tema = {
      nomeExibicao: "Maratona Tech Tivit",
      corPrimaria: "#38BDF8",
      corSecundaria: "#A78BFA",
      corFundo: "#0F172A",
      corTexto: "#E2E8F0",
      fonte: "Space Grotesk",
      rotuloCandidato: "Projeto",
      rotuloCandidatos: "Projetos",
      logoUrl: null,
    };
    expect((await salvarTema(adm, e, tema)).ok).toBe(true);
    expect(await salvarTema(adm, e, { ...tema, corTexto: "#0F172B" })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await salvarTema(adm, e, { ...tema, fonte: "Comic Sans" })).toMatchObject({ ok: false, erro: { codigo: "VALIDACAO" } });
    expect(await salvarPlacar(adm, e, { pesoPopular: 60, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" })).toMatchObject({ ok: false });
    expect(await salvarPlacar(adm, e, { pesoPopular: 100, pesoJuri: 0, pesoInfantil: 0, regraDesempate: "PUBLICO" })).toMatchObject({ ok: true });
  });

  it("o banco recusa pesos que não somam 100 (CHECK)", async () => {
    const e = await semearEvento("teste-operacao-check");
    await expect(db().configPlacar.update({ where: { eventoId: e }, data: { pesoPopular: 90 } })).rejects.toThrow();
  });
});

// PNG válido de 1×1 pixel.
const PNG_MINIMO = new Uint8Array(
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
);

async function removerArquivo(url: string) {
  const { rm } = await import("node:fs/promises");
  const path = await import("node:path");
  await rm(path.join(process.cwd(), "public", url), { force: true });
}
