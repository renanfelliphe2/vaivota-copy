import { afterAll, describe, expect, it } from "vitest";
import { obterStatusResultado, carregarRevelacao } from "@/server/apresentacao";
import { db, desconectarBanco } from "@/server/db";
import { zerarMemoria } from "@/server/limites";
import { encerrarUrna } from "@/server/operacao";
import {
  comandarTelaoRemoto,
  consultarTelaoRemoto,
  desconectarTelaoRemoto,
  espelharApresentacaoTelao,
  espelharApresentacaoTelaoPareado,
  parearTelao,
  prepararTelaoRemoto,
  sincronizarTelao,
} from "@/server/telaoRemoto";
import { cookieDe, criarAdminDireto, criarCandidatos, criarUsuarioDireto, semearEvento } from "./apoio";

// Telão em outro aparelho (25/11/2026) contra um PostgreSQL de verdade: código gerado pelo palco do admin, pareamento (cookie com o
// token, só o hash no banco), sinal com os botões do controle, cópia da apresentação nos dois sentidos, leituras do telão liberadas
// só para o aparelho pareado com o evento, troca de aba e desconexão.

afterAll(async () => {
  await desconectarBanco();
});

let ip = 0;
const novoIp = () => `198.51.100.${(++ip % 250) + 1}`;

const APRESENTACAO = { chave: "x:y", modoSala: "REAL", cenarioEnsaioId: null, modoAvancoLocal: null, categoriaId: null, revelacao: null };

function aparelho(cookies: string[]) {
  return { headers: new Headers({ cookie: cookieDe(cookies) }), ip: novoIp(), cookies: [] as string[] };
}

async function sessaoPareada(slug: string) {
  zerarMemoria();
  const eventoId = await semearEvento(slug, { ativo: true, urna: "ABERTA" });
  const admin = await criarAdminDireto(eventoId);
  const gerado = await prepararTelaoRemoto(admin, { eventoId, id: null, modo: { tipo: "REAL" }, apresentacao: APRESENTACAO, criar: true });
  if (!gerado.ok || !gerado.dados) throw new Error("prepararTelaoRemoto falhou");
  const cookies: string[] = [];
  const pareado = await parearTelao({ headers: new Headers(), ip: novoIp(), cookies }, { eventoId, codigo: gerado.dados.codigo! });
  if (!pareado.ok) throw new Error(`parearTelao falhou: ${pareado.erro.codigo}`);
  return { eventoId, admin, id: gerado.dados.id, codigo: gerado.dados.codigo!, cookies };
}

describe("telão em outro aparelho", () => {
  it("sem pedir, não há código; o código nasce a pedido, vale uma vez e só o hash do token fica no banco", async () => {
    zerarMemoria();
    const eventoId = await semearEvento("teste-telao-remoto-codigo", { ativo: true });
    const admin = await criarAdminDireto(eventoId);
    const semCriar = await prepararTelaoRemoto(admin, { eventoId, id: null, modo: { tipo: "REAL" }, apresentacao: null, criar: false });
    expect(semCriar).toEqual({ ok: true, dados: null });

    const gerado = await prepararTelaoRemoto(admin, { eventoId, id: null, modo: { tipo: "REAL" }, apresentacao: APRESENTACAO, criar: true });
    expect(gerado.ok && gerado.dados?.situacao).toBe("AGUARDANDO");
    const { id, codigo } = gerado.ok && gerado.dados ? gerado.dados : { id: "", codigo: null };
    expect(codigo).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}$/);

    // Reabrir com o mesmo id devolve a mesma sessão e o mesmo código.
    const reaberto = await prepararTelaoRemoto(admin, { eventoId, id, modo: { tipo: "REAL" }, apresentacao: null, criar: true });
    expect(reaberto.ok && reaberto.dados).toMatchObject({ id, codigo });

    // Outra pessoa (não admin) não gera nem consulta.
    const publico = await criarUsuarioDireto(eventoId);
    expect((await prepararTelaoRemoto(publico, { eventoId, id: null, modo: { tipo: "REAL" }, apresentacao: null, criar: true })).ok).toBe(false);
    expect((await consultarTelaoRemoto(publico, { eventoId, id, versaoApresentacao: 0 })).ok).toBe(false);

    const errado = await parearTelao({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: "2222-2222" });
    expect(!errado.ok && errado.erro.codigo).toBe("CODIGO_INVALIDO");

    const cookies: string[] = [];
    const pareado = await parearTelao({ headers: new Headers(), ip: novoIp(), cookies }, { eventoId, codigo: codigo! });
    expect(pareado.ok).toBe(true);
    expect(cookies[0]).toMatch(/^vaivota_telao=[A-Za-z0-9_-]{43}; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax/);
    const token = cookies[0].split(";")[0].split("=")[1];
    const linha = await db().telaoRemoto.findUniqueOrThrow({ where: { id } });
    expect(linha.estado).toBe("PAREADO");
    expect(linha.codigo).toBeNull();
    expect(linha.hashToken).not.toBe(token);

    // O mesmo código não pareia um segundo aparelho.
    const deNovo = await parearTelao({ headers: new Headers(), ip: novoIp(), cookies: [] }, { eventoId, codigo: codigo! });
    expect(!deNovo.ok && deNovo.erro.codigo).toBe("CODIGO_INVALIDO");

    const consulta = await consultarTelaoRemoto(admin, { eventoId, id, versaoApresentacao: 0 });
    expect(consulta.ok && consulta.dados).toMatchObject({ situacao: "PAREADO", codigo: null });
  });

  it("sinal: estado do palco ao controle, botões ao telão (sem os antigos no primeiro sinal) e apresentação nos dois sentidos", async () => {
    const { eventoId, admin, id, cookies } = await sessaoPareada("teste-telao-remoto-sinal");

    // Botão apertado antes do telão abrir a página não dispara.
    expect((await comandarTelaoRemoto(admin, { eventoId, id, comando: "AVANCAR" })).ok).toBe(true);
    const primeiro = await sincronizarTelao(aparelho(cookies), { instancia: "aba-1", desde: null, estado: { situacao: "AGUARDANDO_CLIQUE", ensaio: false }, versaoApresentacao: 0 });
    expect(primeiro.ok).toBe(true);
    if (!primeiro.ok) return;
    expect(primeiro.dados).toMatchObject({ eventoId, dono: admin.id, modo: { tipo: "REAL" }, comandos: [] });
    expect(primeiro.dados.apresentacao?.dados).toEqual(APRESENTACAO);

    const visto = await consultarTelaoRemoto(admin, { eventoId, id, versaoApresentacao: 0 });
    expect(visto.ok && visto.dados.palco).toEqual({ situacao: "AGUARDANDO_CLIQUE", ensaio: false });

    await comandarTelaoRemoto(admin, { eventoId, id, comando: "LIGAR" });
    await comandarTelaoRemoto(admin, { eventoId, id, comando: "AVANCAR" });
    const segundo = await sincronizarTelao(aparelho(cookies), { instancia: "aba-1", desde: primeiro.dados.ultimoComando, estado: null, versaoApresentacao: primeiro.dados.apresentacao!.versao });
    expect(segundo.ok && segundo.dados.comandos).toEqual(["LIGAR", "AVANCAR"]);
    expect(segundo.ok && segundo.dados.apresentacao).toBeNull();
    const terceiro = await sincronizarTelao(aparelho(cookies), { instancia: "aba-1", desde: segundo.ok ? segundo.dados.ultimoComando : 0, estado: null, versaoApresentacao: 0 });
    expect(terceiro.ok && terceiro.dados.comandos).toEqual([]);
    expect(await db().comandoTelao.count({ where: { telaoId: id } })).toBe(0);

    // Telão → controle.
    const doTelao = { ...APRESENTACAO, revelacao: null, modoAvancoLocal: "MANUAL" };
    const gravado = await espelharApresentacaoTelaoPareado(aparelho(cookies), { instancia: "aba-1", apresentacao: doTelao });
    expect(gravado.ok).toBe(true);
    const lido = await consultarTelaoRemoto(admin, { eventoId, id, versaoApresentacao: 1 });
    expect(lido.ok && lido.dados.apresentacao).toEqual({ versao: gravado.ok ? gravado.dados.versao : -1, dados: doTelao });

    // Controle → telão.
    const daSala = { ...doTelao, modoAvancoLocal: "AUTOMATICO" };
    const r = await espelharApresentacaoTelao(admin, { eventoId, id, apresentacao: daSala });
    const lidoNoTelao = await sincronizarTelao(aparelho(cookies), { instancia: "aba-1", desde: 0, estado: null, versaoApresentacao: gravado.ok ? gravado.dados.versao : 0 });
    expect(lidoNoTelao.ok && lidoNoTelao.dados.apresentacao).toEqual({ versao: r.ok ? r.dados.versao : -1, dados: daSala });
  });

  it("outra aba do mesmo aparelho assume; a anterior recebe CONFLITO", async () => {
    const { cookies } = await sessaoPareada("teste-telao-remoto-aba");
    const a = await sincronizarTelao(aparelho(cookies), { instancia: "aba-a", desde: null, estado: null, versaoApresentacao: 0 });
    expect(a.ok).toBe(true);
    const b = await sincronizarTelao(aparelho(cookies), { instancia: "aba-b", desde: null, estado: null, versaoApresentacao: 0 });
    expect(b.ok).toBe(true);
    const deNovoA = await sincronizarTelao(aparelho(cookies), { instancia: "aba-a", desde: 0, estado: null, versaoApresentacao: 0 });
    expect(!deNovoA.ok && deNovoA.erro.codigo).toBe("CONFLITO");
    const apresentacaoA = await espelharApresentacaoTelaoPareado(aparelho(cookies), { instancia: "aba-a", apresentacao: APRESENTACAO });
    expect(!apresentacaoA.ok && apresentacaoA.erro.codigo).toBe("CONFLITO");
  });

  it("leituras do telão: só o aparelho pareado com este evento; desconectado, perde tudo e o cookie é apagado", async () => {
    const { eventoId, admin, id, cookies } = await sessaoPareada("teste-telao-remoto-leituras");
    await criarCandidatos(eventoId, 3);
    await encerrarUrna(admin, eventoId);

    const anonimo = { headers: new Headers() };
    expect((await obterStatusResultado(null, eventoId, anonimo.headers)).ok).toBe(false);
    const status = await obterStatusResultado(null, eventoId, aparelho(cookies).headers);
    expect(status.ok && status.dados.existe).toBe(true);
    expect((await carregarRevelacao(null, eventoId, aparelho(cookies).headers)).ok).toBe(true);

    // Outro evento: o token não vale.
    const outro = await semearEvento("teste-telao-remoto-outro", { ativo: true });
    expect((await obterStatusResultado(null, outro, aparelho(cookies).headers)).ok).toBe(false);

    // Apresentar no próprio computador não derruba um telão já pareado.
    const soAguardando = await desconectarTelaoRemoto(admin, { eventoId, id, soSeAguardando: true }, { ip: "203.0.113.9" });
    expect(soAguardando.ok && soAguardando.dados.situacao).toBe("PAREADO");

    const desconectado = await desconectarTelaoRemoto(admin, { eventoId, id, soSeAguardando: false }, { ip: "203.0.113.9" });
    expect(desconectado.ok && desconectado.dados.situacao).toBe("ENCERRADO");
    expect((await carregarRevelacao(null, eventoId, aparelho(cookies).headers)).ok).toBe(false);
    const ctx = aparelho(cookies);
    const sinal = await sincronizarTelao(ctx, { instancia: "aba-1", desde: null, estado: null, versaoApresentacao: 0 });
    expect(!sinal.ok && sinal.erro.codigo).toBe("NAO_AUTORIZADO");
    expect(ctx.cookies[0]).toMatch(/^vaivota_telao=; Path=\/; Max-Age=0/);
    expect((await comandarTelaoRemoto(admin, { eventoId, id, comando: "AVANCAR" })).ok).toBe(false);
  });

  it("o modo do palco passa à sessão; ao parear outra sessão, a antiga do aparelho é encerrada", async () => {
    const { eventoId, admin, id, cookies } = await sessaoPareada("teste-telao-remoto-modo");
    await prepararTelaoRemoto(admin, { eventoId, id, modo: { tipo: "ENSAIO", cenarioId: "SEM_EMPATE" }, apresentacao: null, criar: false });
    const sinal = await sincronizarTelao(aparelho(cookies), { instancia: "aba-1", desde: null, estado: null, versaoApresentacao: 0 });
    expect(sinal.ok && sinal.dados.modo).toEqual({ tipo: "ENSAIO", cenarioId: "SEM_EMPATE" });

    const nova = await prepararTelaoRemoto(admin, { eventoId, id: null, modo: { tipo: "REAL" }, apresentacao: null, criar: true });
    const novosCookies: string[] = [];
    await parearTelao({ headers: aparelho(cookies).headers, ip: novoIp(), cookies: novosCookies }, { eventoId, codigo: nova.ok && nova.dados ? nova.dados.codigo! : "" });
    expect((await db().telaoRemoto.findUniqueOrThrow({ where: { id } })).estado).toBe("ENCERRADO");
    expect((await sincronizarTelao(aparelho(novosCookies), { instancia: "aba-2", desde: null, estado: null, versaoApresentacao: 0 })).ok).toBe(true);
  });
});
