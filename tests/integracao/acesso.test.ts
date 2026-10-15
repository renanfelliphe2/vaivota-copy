import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as acesso from "@/server/acesso";
import { db, desconectarBanco } from "@/server/db";
import { caixaDeSaida } from "@/server/email";
import { garantirParticipacao } from "@/server/participacao";
import { reiniciarManutencao } from "@/server/manutencao";
import { promoverAdmin } from "@/server/semente";
import { usuarioDaSessao } from "@/server/sessao";
import { cadastrarPeloFluxo, contextoComCookies, cookieDe, esperarEmail, novoContexto, semearEvento, ultimoCodigoPara } from "./apoio";

// ST1: cadastro, código por e-mail, login, bloqueio, recuperação, participação e admin, contra o Better Auth e o banco reais.

let eventoId: string;

beforeAll(async () => {
  eventoId = await semearEvento("teste-acesso", { ativo: true });
});

afterAll(async () => {
  await desconectarBanco();
});

describe("cadastro com código por e-mail", () => {
  it("registrar não abre sessão; o código confirma o e-mail e abre a sessão com participação PUBLICO", async () => {
    const email = "ana@teste.local";
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    const ctx = novoContexto();
    const r = await acesso.registrar(ctx, { eventoId, nome: "Ana Souza", email, senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true });
    expect(r).toEqual({ ok: true, dados: { email } });
    expect(ctx.cookies).toHaveLength(0); // sem sessão antes de confirmar
    await esperarEmail(email, antes);

    // e-mail curto, com o código, remetente configurado
    const mensagem = caixaDeSaida().filter((m) => m.para === email).at(-1)!;
    expect(mensagem.assunto).toMatch(/^\d{6} é o código/);
    expect(await db().usuario.findUniqueOrThrow({ where: { email } })).toMatchObject({ emailVerificado: false });

    // Código errado: recusa genérica, e a conta segue sem verificar
    const errado = await acesso.confirmarCodigo(novoContexto(), { eventoId, email, codigo: "000000" });
    expect(errado).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS", mensagem: "Código incorreto ou expirado." } });

    const ok = novoContexto();
    const c = await acesso.confirmarCodigo(ok, { eventoId, email, codigo: ultimoCodigoPara(email) });
    expect(c).toEqual({ ok: true, dados: { emailVerificado: true } });
    expect(ok.cookies.length).toBeGreaterThan(0);

    const usuario = await usuarioDaSessao(new Headers({ cookie: cookieDe(ok.cookies) }));
    expect(usuario).toMatchObject({ email, nome: "Ana Souza", emailVerificado: true });
    const participacao = await db().participacao.findFirstOrThrow({ where: { usuarioId: usuario!.id, eventoId } });
    expect(participacao).toMatchObject({ papel: "PUBLICO", votou: false });
  });

  it("o código vale uma vez só", async () => {
    const email = "uma-vez@teste.local";
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    await acesso.registrar(novoContexto(), { eventoId, nome: "Uma Vez", email, senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true });
    await esperarEmail(email, antes);
    const codigo = ultimoCodigoPara(email);
    expect((await acesso.confirmarCodigo(novoContexto(), { eventoId, email, codigo })).ok).toBe(true);
    expect((await acesso.confirmarCodigo(novoContexto(), { eventoId, email, codigo })).ok).toBe(false);
  });

  it("cinco códigos errados seguidos invalidam o código: é preciso pedir outro", async () => {
    const email = "esgota@teste.local";
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    await acesso.registrar(novoContexto(), { eventoId, nome: "Esgota", email, senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true });
    await esperarEmail(email, antes);
    const certo = ultimoCodigoPara(email);
    const errado = certo === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++) {
      expect(await acesso.confirmarCodigo(novoContexto(), { eventoId, email, codigo: errado })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    }
    // agora até o código certo é recusado, com aviso de "muitas tentativas"
    expect(await acesso.confirmarCodigo(novoContexto(), { eventoId, email, codigo: certo })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    const bloqueios = await db().auditoria.count({ where: { eventoId, acao: "BLOQUEIO_RATE_LIMIT" } });
    expect(bloqueios).toBeGreaterThan(0);
  });

  it("e-mail já cadastrado e verificado: CADASTRO_NAO_CONCLUIDO", async () => {
    await cadastrarPeloFluxo(eventoId, "repetida@teste.local");
    const r = await acesso.registrar(novoContexto(), {
      eventoId,
      nome: "Outra",
      email: "Repetida@teste.local",
      senha: "minha-senha-1",
      confirmacaoSenha: "minha-senha-1",
      aceite: true,
    });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "CADASTRO_NAO_CONCLUIDO" } });
  });

  it("cadastro abandonado (e-mail nunca confirmado) é substituído: vale a senha digitada por último", async () => {
    const email = "abandonado@teste.local";
    let antes = caixaDeSaida().filter((m) => m.para === email).length;
    await acesso.registrar(novoContexto("203.0.113.50"), { eventoId, nome: "Ana A", email, senha: "primeira-senha-1", confirmacaoSenha: "primeira-senha-1", aceite: true });
    await esperarEmail(email, antes);
    // a limitação de reenvio é de 30 s por e-mail: espera a janela passar
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } });
    // enquanto o código vive, outro cadastro com o mesmo e-mail NÃO substitui a conta (ver o teste de pré-sequestro)
    await db().verification.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    antes = caixaDeSaida().filter((m) => m.para === email).length;
    const r = await acesso.registrar(novoContexto("203.0.113.50"), { eventoId, nome: "Bia B", email, senha: "segunda-senha-1", confirmacaoSenha: "segunda-senha-1", aceite: true });
    expect(r.ok).toBe(true);
    await esperarEmail(email, antes);
    const c = novoContexto();
    expect((await acesso.confirmarCodigo(c, { eventoId, email, codigo: ultimoCodigoPara(email) })).ok).toBe(true);
    // a senha da primeira tentativa não entra; a da segunda sim
    const ruim = await acesso.entrar(novoContexto(), { eventoId, email, senha: "primeira-senha-1" });
    expect(ruim.ok).toBe(false);
    const boa = await acesso.entrar(novoContexto(), { eventoId, email, senha: "segunda-senha-1" });
    expect(boa.ok).toBe(true);
  });

  it("valida os campos e o estado do evento", async () => {
    expect(await acesso.registrar(novoContexto(), { eventoId, nome: "", email: "x", senha: "123", confirmacaoSenha: "456", aceite: false })).toMatchObject({
      ok: false,
      erro: { codigo: "VALIDACAO" },
    });
    const rascunho = await semearEvento("teste-acesso-rascunho");
    expect(
      await acesso.registrar(novoContexto(), { eventoId: rascunho, nome: "Ana", email: "ana2@teste.local", senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true }),
    ).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
  });

  it("antes de ativar o evento só cria conta quem foi convidado como admin (e vira admin ao confirmar o código)", async () => {
    const rascunho = await semearEvento("teste-acesso-convite");
    await promoverAdmin("teste-acesso-convite", "primeira.admin@teste.local");
    const { usuario } = await cadastrarPeloFluxo(rascunho, "primeira.admin@teste.local");
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: usuario.id, eventoId: rascunho } })).papel).toBe("ADMIN");
    // outro e-mail, sem convite: continua recusado
    expect(
      await acesso.registrar(novoContexto(), { eventoId: rascunho, nome: "Sem Convite", email: "sem.convite@teste.local", senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true }),
    ).toMatchObject({ ok: false, erro: { codigo: "EVENTO_INDISPONIVEL" } });
  });
});

describe("manutenção", () => {
  it("o cadastro limpa contas que nunca confirmaram o e-mail (há mais de 2 h) e contadores antigos, sem tocar nas demais", async () => {
    const antigo = await db().usuario.create({ data: { nome: "Abandonada", email: "velha@teste.local", emailVerificado: false, criadoEm: new Date(Date.now() - 3 * 3600_000) } });
    const recente = await db().usuario.create({ data: { nome: "Recente", email: "recente@teste.local", emailVerificado: false } });
    const verificada = await db().usuario.create({ data: { nome: "Verificada", email: "verificada-velha@teste.local", emailVerificado: true, criadoEm: new Date(Date.now() - 3 * 3600_000) } });
    await db().rateLimit.create({ data: { key: "ip:velho#1", count: 3, lastRequest: BigInt(Date.now() - 2 * 24 * 3600_000) } });
    reiniciarManutencao();
    await acesso.registrar(novoContexto("203.0.113.88"), { eventoId, nome: "Gatilho Manutencao", email: "gatilho@teste.local", senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true });
    expect(await db().usuario.findUnique({ where: { id: antigo.id } })).toBeNull();
    expect(await db().usuario.findUnique({ where: { id: recente.id } })).not.toBeNull();
    expect(await db().usuario.findUnique({ where: { id: verificada.id } })).not.toBeNull();
    expect(await db().rateLimit.findUnique({ where: { key: "ip:velho#1" } })).toBeNull();
  });
});

describe("contra pré-sequestro e abuso (revisão independente)", () => {
  const dados = (email: string, senha: string, nome = "Pessoa Teste") => ({ eventoId, nome, email, senha, confirmacaoSenha: senha, aceite: true });

  it("quem chega segundo NÃO troca a senha de um cadastro com código vivo: o atacante não entra na conta da vítima", async () => {
    const email = "vitima@teste.local";
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    expect((await acesso.registrar(novoContexto("203.0.113.101"), dados(email, "senha-da-vitima-1", "Vitima Real"))).ok).toBe(true);
    await esperarEmail(email, antes);
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } }); // passa o intervalo de 30 s
    const ataque = await acesso.registrar(novoContexto("203.0.113.102"), dados(email, "senha-do-atacante-1", "Atacante"));
    expect(ataque).toMatchObject({ ok: false, erro: { codigo: "CONFLITO" } });
    const c = await acesso.confirmarCodigo(novoContexto("203.0.113.101"), { eventoId, email, codigo: ultimoCodigoPara(email) });
    expect(c.ok).toBe(true);
    expect((await acesso.entrar(novoContexto("203.0.113.102"), { eventoId, email, senha: "senha-do-atacante-1" })).ok).toBe(false);
    expect((await acesso.entrar(novoContexto("203.0.113.101"), { eventoId, email, senha: "senha-da-vitima-1" })).ok).toBe(true);
  });

  it("promover-admin não dá poder a conta que nunca provou o e-mail: apaga a conta e deixa o convite", async () => {
    const email = "admin.alvo@teste.local";
    await acesso.registrar(novoContexto("203.0.113.103"), dados(email, "senha-do-atacante-1", "Atacante"));
    expect((await db().usuario.findUniqueOrThrow({ where: { email } })).emailVerificado).toBe(false);
    expect(await promoverAdmin("teste-acesso", email)).toMatchObject({ acao: "convite_criado" });
    expect(await db().usuario.findUnique({ where: { email } })).toBeNull();
    // o dono do e-mail cria a conta de verdade (depois do intervalo de 30 s entre códigos) e entra como admin
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } });
    const dono = await cadastrarPeloFluxo(eventoId, email, "senha-do-dono-12");
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: dono.usuario.id, eventoId } })).papel).toBe("ADMIN");
  });

  it("senhas erradas em rajada: só as 5 primeiras chegam a ser verificadas (bloqueio atômico)", async () => {
    const email = "rajada@teste.local";
    await cadastrarPeloFluxo(eventoId, email, "senha-correta-1");
    const respostas = await Promise.all(
      Array.from({ length: 30 }, () => acesso.entrar(novoContexto("203.0.113.104"), { eventoId, email, senha: "senha-errada-12" })),
    );
    const recusadas = respostas.filter((r) => !r.ok && r.erro.codigo === "CREDENCIAIS_INVALIDAS").length;
    const bloqueadas = respostas.filter((r) => !r.ok && r.erro.codigo === "LIMITE_TENTATIVAS").length;
    expect(recusadas).toBe(5);
    expect(bloqueadas).toBe(25);
    // a senha certa também fica bloqueada durante os 60 s
    expect(await acesso.entrar(novoContexto("203.0.113.104"), { eventoId, email, senha: "senha-correta-1" })).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
  });

  it("variações do mesmo Gmail (pontos e +etiqueta) não criam uma segunda conta", async () => {
    await cadastrarPeloFluxo(eventoId, "fulana.silva@gmail.com");
    for (const variacao of ["fulanasilva@gmail.com", "fulana.silva+voto2@gmail.com", "f.u.l.a.n.a.s.i.l.v.a@googlemail.com"]) {
      expect(await acesso.registrar(novoContexto("203.0.113.105"), dados(variacao, "minha-senha-1"))).toMatchObject({ ok: false, erro: { codigo: "CADASTRO_NAO_CONCLUIDO" } });
    }
    // outro domínio com a mesma parte local é outra pessoa
    expect((await acesso.registrar(novoContexto("203.0.113.105"), dados("fulanasilva@outlook.com", "minha-senha-1"))).ok).toBe(true);
  });

  it("sem evento ativo não nasce participação do público (antes da ativação e depois da conclusão)", async () => {
    const antesDeAtivar = await semearEvento("teste-acesso-sem-participacao");
    const { usuario } = await cadastrarPeloFluxo(eventoId, "sem.participacao@teste.local");
    expect(await garantirParticipacao(usuario, antesDeAtivar)).toEqual({ ok: true, dados: { papel: "PUBLICO" } });
    expect(await db().participacao.count({ where: { usuarioId: usuario.id, eventoId: antesDeAtivar } })).toBe(0);
    await db().evento.update({ where: { id: antesDeAtivar }, data: { estado: "ATIVO" } });
    await garantirParticipacao(usuario, antesDeAtivar);
    expect(await db().participacao.count({ where: { usuarioId: usuario.id, eventoId: antesDeAtivar } })).toBe(1);
    await db().evento.update({ where: { id: antesDeAtivar }, data: { estado: "CONCLUIDO", estadoUrna: "ENCERRADA" } });
    const outro = await cadastrarPeloFluxo(eventoId, "sem.participacao2@teste.local");
    await garantirParticipacao(outro.usuario, antesDeAtivar);
    expect(await db().participacao.count({ where: { usuarioId: outro.usuario.id, eventoId: antesDeAtivar } })).toBe(0);
  });
});

describe("login", () => {
  it("entra com e-mail e senha, cria participação e usa a mesma mensagem para tudo que dá errado", async () => {
    const email = "login@teste.local";
    await cadastrarPeloFluxo(eventoId, email, "senha-correta-1");

    const ctx = novoContexto();
    const r = await acesso.entrar(ctx, { eventoId, email, senha: "senha-correta-1" });
    expect(r.ok).toBe(true);
    expect((await usuarioDaSessao(new Headers({ cookie: cookieDe(ctx.cookies) })))?.email).toBe(email);

    const errada = await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-errada-12" });
    const inexistente = await acesso.entrar(novoContexto(), { eventoId, email: "ninguem@teste.local", senha: "senha-errada-12" });
    expect(errada).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS", mensagem: "E-mail ou senha incorretos." } });
    expect(inexistente).toEqual(errada);
  });

  it("cinco senhas erradas seguidas bloqueiam o e-mail por 60 s, inclusive para a senha certa, e a auditoria registra", async () => {
    const email = "bloqueio@teste.local";
    await cadastrarPeloFluxo(eventoId, email, "senha-correta-1");
    for (let i = 0; i < 5; i++) {
      expect(await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-errada-12" })).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
    }
    const bloqueado = await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-correta-1" });
    expect(bloqueado).toMatchObject({ ok: false, erro: { codigo: "LIMITE_TENTATIVAS" } });
    if (!bloqueado.ok) expect(bloqueado.erro.mensagem).toMatch(/Tente novamente em \d+s/);
    const entradas = await db().auditoria.findMany({ where: { eventoId, acao: "BLOQUEIO_RATE_LIMIT" } });
    expect(entradas.some((a) => (a.detalhes as { alvo?: string } | null)?.alvo === "SENHA")).toBe(true);
    // sem e-mail nem IP em claro na auditoria
    for (const a of entradas) {
      expect(JSON.stringify(a)).not.toContain("@");
      expect(a.ipHash).toMatch(/^[0-9a-f]{64}$/);
    }

    // Passado o bloqueio (simulado), a senha certa volta a funcionar e zera o contador.
    await db().rateLimit.updateMany({ where: { key: { startsWith: "senha:" } }, data: { lastRequest: BigInt(Date.now() - 61_000) } });
    expect((await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-correta-1" })).ok).toBe(true);
  });

  it("conta sem e-mail verificado: EMAIL_NAO_VERIFICADO e o código é reenviado", async () => {
    const email = "naoverificado@teste.local";
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    await acesso.registrar(novoContexto("203.0.113.61"), { eventoId, nome: "Nao Verificado", email, senha: "minha-senha-1", confirmacaoSenha: "minha-senha-1", aceite: true });
    await esperarEmail(email, antes);
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } });
    const antes2 = caixaDeSaida().filter((m) => m.para === email).length;
    const r = await acesso.entrar(novoContexto("203.0.113.61"), { eventoId, email, senha: "minha-senha-1" });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "EMAIL_NAO_VERIFICADO" } });
    await esperarEmail(email, antes2);
  });
});

describe("recuperação de senha", () => {
  it("de ponta a ponta: pede o código, redefine, entra com a senha nova, a antiga deixa de valer", async () => {
    const email = "recupera@teste.local";
    await cadastrarPeloFluxo(eventoId, email, "senha-antiga-1");
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } });
    const antes = caixaDeSaida().filter((m) => m.para === email).length;

    const pedido = await acesso.solicitarRecuperacao(novoContexto("203.0.113.70"), { eventoId, email });
    expect(pedido.ok).toBe(true);
    await esperarEmail(email, antes);
    const mensagem = caixaDeSaida().filter((m) => m.para === email).at(-1)!;
    expect(mensagem.assunto).toMatch(/senha nova/);

    const ctx = novoContexto("203.0.113.70");
    const r = await acesso.redefinirSenha(ctx, { eventoId, email, codigo: ultimoCodigoPara(email), senha: "senha-nova-123", confirmacaoSenha: "senha-nova-123" });
    expect(r.ok).toBe(true);
    expect((await usuarioDaSessao(new Headers({ cookie: cookieDe(ctx.cookies) })))?.email).toBe(email); // já entra

    expect((await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-antiga-1" })).ok).toBe(false);
    expect((await acesso.entrar(novoContexto(), { eventoId, email, senha: "senha-nova-123" })).ok).toBe(true);
  });

  it("e-mail desconhecido tem a mesma resposta e não envia nada", async () => {
    const antes = caixaDeSaida().length;
    const r = await acesso.solicitarRecuperacao(novoContexto("203.0.113.71"), { eventoId, email: "fantasma@teste.local" });
    expect(r.ok).toBe(true);
    await new Promise((resolver) => setTimeout(resolver, 200));
    expect(caixaDeSaida().length).toBe(antes);
  });

  it("código errado: recusa genérica", async () => {
    const email = "recupera2@teste.local";
    await cadastrarPeloFluxo(eventoId, email);
    await db().rateLimit.deleteMany({ where: { key: { startsWith: "codigo:" } } });
    const antes = caixaDeSaida().filter((m) => m.para === email).length;
    await acesso.solicitarRecuperacao(novoContexto("203.0.113.72"), { eventoId, email });
    await esperarEmail(email, antes);
    const r = await acesso.redefinirSenha(novoContexto(), { eventoId, email, codigo: "000000", senha: "senha-nova-123", confirmacaoSenha: "senha-nova-123" });
    expect(r).toMatchObject({ ok: false, erro: { codigo: "CREDENCIAIS_INVALIDAS" } });
  });
});

describe("sair", () => {
  it("encerra a sessão", async () => {
    const { cookies } = await cadastrarPeloFluxo(eventoId, "sair@teste.local");
    const ctx = contextoComCookies(cookies);
    expect((await acesso.sair(ctx)).ok).toBe(true);
    // O cookie antigo não vale mais (a sessão foi apagada no banco).
    expect(await usuarioDaSessao(new Headers({ cookie: cookieDe(cookies) }))).toBeNull();
  });
});

describe("participação e admin", () => {
  it("garantirParticipacao é idempotente, inclusive com chamadas simultâneas", async () => {
    const { usuario } = await cadastrarPeloFluxo(eventoId, "idem@teste.local");
    await db().participacao.deleteMany({ where: { usuarioId: usuario.id } });
    const respostas = await Promise.all(Array.from({ length: 8 }, () => garantirParticipacao(usuario, eventoId)));
    expect(respostas.every((r) => r.ok && r.dados.papel === "PUBLICO")).toBe(true);
    expect(await db().participacao.count({ where: { usuarioId: usuario.id, eventoId } })).toBe(1);
  });

  it("promover-admin: quem já tem conta vira admin; quem não tem recebe convite que vale ao entrar com o e-mail verificado", async () => {
    const existente = await cadastrarPeloFluxo(eventoId, "admin1@teste.local");
    expect(await promoverAdmin("teste-acesso", "Admin1@teste.local")).toEqual({ acao: "promovido", email: "admin1@teste.local" });
    expect(await promoverAdmin("teste-acesso", "admin1@teste.local")).toMatchObject({ acao: "ja_era_admin" });
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: existente.usuario.id, eventoId } })).papel).toBe("ADMIN");

    expect(await promoverAdmin("teste-acesso", "futuro-admin@teste.local")).toMatchObject({ acao: "convite_criado" });
    expect(await promoverAdmin("teste-acesso", "futuro-admin@teste.local")).toMatchObject({ acao: "convite_ja_existia" });
    const novo = await cadastrarPeloFluxo(eventoId, "futuro-admin@teste.local"); // confirmar o código já chama garantirParticipacao
    expect((await db().participacao.findFirstOrThrow({ where: { usuarioId: novo.usuario.id, eventoId } })).papel).toBe("ADMIN");
    expect((await db().conviteAdmin.findFirstOrThrow({ where: { eventoId, email: "futuro-admin@teste.local" } })).estado).toBe("USADO");
    expect(await db().auditoria.count({ where: { eventoId, acao: "ADMIN_CONVITE_RESGATADO", atorUsuarioId: novo.usuario.id } })).toBe(1);
  });

  it("quem já votou como público não vira admin", async () => {
    const { usuario } = await cadastrarPeloFluxo(eventoId, "votou@teste.local");
    await db().participacao.updateMany({ where: { usuarioId: usuario.id }, data: { votou: true } });
    await expect(promoverAdmin("teste-acesso", "votou@teste.local")).rejects.toThrow(/já votou/);
  });
});
