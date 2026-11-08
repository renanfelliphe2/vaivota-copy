import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, desconectarBanco } from "@/server/db";
import { zerarMemoria } from "@/server/limites";
import { abrirUrna, ativarEvento, concluirEvento, encerrarUrna } from "@/server/operacao";
import type { UsuarioSessao } from "@/server/sessao";
import { invalidarVotacoesEncerradas, listarVotacoesEncerradas } from "@/server/votacoesEncerradas";
import { votarPopular } from "@/server/votacao";
import { criarAdminDireto, criarCandidatos, criarUsuarioDireto, semearEvento } from "./apoio";

// Landing da plataforma: participantes e votos das votações encerradas e, com o evento concluído, o vencedor, para
// qualquer visitante.

const SLUG = "teste-vitrine";
let eventoId: string;
let admin: UsuarioSessao;
let ids: string[];

async function daVitrine(slug = SLUG) {
  invalidarVotacoesEncerradas();
  return (await listarVotacoesEncerradas()).find((v) => v.slug === slug);
}

beforeAll(async () => {
  zerarMemoria();
  eventoId = await semearEvento(SLUG);
  admin = await criarAdminDireto(eventoId);
  ids = await criarCandidatos(eventoId, 3);
  await db().candidato.update({ where: { id: ids[2] }, data: { titulo: "Projeto Campeão" } });
  expect((await ativarEvento(admin, eventoId)).ok).toBe(true);
  expect((await abrirUrna(admin, eventoId)).ok).toBe(true);

  // Júri e totem ligados direto no banco (a configuração pelo admin tem os próprios testes).
  await db().evento.update({ where: { id: eventoId }, data: { moduloJuri: true, moduloInfantil: true } });
  await db().configPlacar.update({ where: { eventoId }, data: { pesoPopular: 60, pesoJuri: 20, pesoInfantil: 20 } });

  for (const [i, candidatoId] of [ids[2], ids[2], ids[2], ids[0], ids[1]].entries()) {
    const eleitor = await criarUsuarioDireto(eventoId);
    expect((await votarPopular(eleitor, { eventoId, candidatoId }, { ip: `192.0.2.${40 + i}` })).ok).toBe(true);
  }
  await criarUsuarioDireto(eventoId); // inscrito que não votou
  const jurado = await criarUsuarioDireto(eventoId, "JURADO", "jurado");
  await db().participacao.update({ where: { usuarioId_eventoId: { usuarioId: jurado.id, eventoId } }, data: { votou: true } });
  await criarUsuarioDireto(eventoId, "JURADO", "jurado"); // jurado que não votou

  const totem = await db().dispositivo.create({ data: { eventoId, nome: "Totem 1", hashToken: randomBytes(32).toString("hex") } });
  await db().votoInfantil.createMany({ data: [1, 2, 3, 4].map(() => ({ eventoId, candidatoId: ids[2], dispositivoId: totem.id })) });
});

afterAll(async () => {
  await desconectarBanco();
});

describe("votações encerradas na landing", () => {
  it("com a urna aberta, a votação não aparece (os números ainda mudam)", async () => {
    expect(await daVitrine()).toBeUndefined();
  });

  it("com a urna encerrada e o evento ainda ativo, aparecem participantes e votos, mas não o vencedor", async () => {
    expect((await encerrarUrna(admin, eventoId)).ok).toBe(true);
    const votacao = await daVitrine();
    expect(votacao).toBeDefined();
    if (!votacao) return;
    // 5 que votaram + 1 que não votou + 2 jurados; a organização não conta.
    expect(votacao.participantes).toBe(8);
    expect(votacao.votos).toEqual({ publico: 5, juri: 1, infantil: 4, total: 10 });
    expect(votacao.modulos).toEqual({ juri: true, infantil: true });
    expect(votacao.encerradaEmMs).toBeGreaterThan(0);
    expect(votacao.concluidaEmMs).toBeNull();
    expect(votacao.vencedores).toBeNull();
    // O título do vencedor nem sai do servidor antes da conclusão.
    expect(JSON.stringify(votacao)).not.toContain("Projeto Campeão");
  });

  it("depois de concluído, aparece também o vencedor oficial", async () => {
    const evento = await db().evento.findUniqueOrThrow({ where: { id: eventoId }, select: { nome: true } });
    expect((await concluirEvento(admin, eventoId, evento.nome)).ok).toBe(true);

    const votacao = await daVitrine();
    expect(votacao?.vencedores).toEqual([{ id: ids[2], titulo: "Projeto Campeão", imagemUrl: expect.any(String) }]);
    expect(votacao?.concluidaEmMs).toBeGreaterThan(0);
    expect(votacao?.votos.total).toBe(10);
    expect(votacao?.rotuloCandidato).toBeTruthy();
  });

  it("o vencedor é o da maior versão do resultado oficial (a desqualificação gera uma versão nova)", async () => {
    const atual = await db().resultadoOficial.findFirstOrThrow({ where: { eventoId }, orderBy: { versao: "desc" } });
    const dados = atual.dados as { ranking: { candidatoId: string; posicao: number; pontuacao: number }[] };
    const invertido = dados.ranking.map((r) => (r.candidatoId === ids[0] ? { ...r, posicao: 1, pontuacao: 99 } : { ...r, posicao: r.posicao + 1 }));
    await db().resultadoOficial.create({
      data: { eventoId, versao: atual.versao + 1, motivo: "DESQUALIFICACAO", pesoPopular: 60, pesoJuri: 20, pesoInfantil: 20, dados: { ...dados, ranking: invertido } },
    });
    expect((await daVitrine())?.vencedores?.map((v) => v.id)).toEqual([ids[0]]);
  });

  it("só sai o agregado: nenhum e-mail nem contagem por candidato", async () => {
    const texto = JSON.stringify(await daVitrine());
    expect(texto).not.toContain("@");
    expect(texto).not.toContain(ids[1]);
    expect(texto).not.toContain("placares");
  });

  it("rascunho e urna ainda aberta ou não iniciada ficam de fora; urna encerrada entra", async () => {
    await semearEvento("teste-vitrine-rascunho");
    await semearEvento("teste-vitrine-aberta", { urna: "ABERTA" });
    await semearEvento("teste-vitrine-breve", { ativo: true });
    await semearEvento("teste-vitrine-encerrada", { urna: "ENCERRADA" });
    expect(await daVitrine("teste-vitrine-rascunho")).toBeUndefined();
    expect(await daVitrine("teste-vitrine-aberta")).toBeUndefined();
    expect(await daVitrine("teste-vitrine-breve")).toBeUndefined();
    expect(await daVitrine("teste-vitrine-encerrada")).toMatchObject({ participantes: 0, votos: { total: 0 }, vencedores: null });
  });

  it("guarda a lista por um minuto: a segunda leitura não vai ao banco", async () => {
    invalidarVotacoesEncerradas();
    const agora = Date.now();
    const primeira = await listarVotacoesEncerradas(agora);
    expect(await listarVotacoesEncerradas(agora + 59_000)).toBe(primeira);
    expect(await listarVotacoesEncerradas(agora + 61_000)).not.toBe(primeira);
  });
});
