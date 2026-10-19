import { randomUUID } from "node:crypto";
import * as acesso from "@/server/acesso";
import { db } from "@/server/db";
import { caixaDeSaida } from "@/server/email";
import { usuarioDaSessao, type UsuarioSessao } from "@/server/sessao";
import { semearMaratonaTechTivit } from "@/server/semente";
import type { PapelParticipacao } from "@/dominio/tipos";

// Apoio dos testes de integração (banco real).

export const IMAGEM_FALSA = "/uploads/teste.png";

export function novoContexto(ip = "203.0.113.10"): acesso.ContextoAcesso {
  return { headers: new Headers(), ip, cookies: [] };
}

/** `Set-Cookie` → cabeçalho `Cookie` (só nome=valor). */
export function cookieDe(setCookies: string[]): string {
  return setCookies.map((c) => c.split(";")[0]).join("; ");
}

export function contextoComCookies(setCookies: string[], ip = "203.0.113.10"): acesso.ContextoAcesso {
  return { headers: new Headers({ cookie: cookieDe(setCookies) }), ip, cookies: [] };
}

export function ultimoCodigoPara(email: string): string {
  const mensagens = caixaDeSaida().filter((m) => m.para === email);
  const ultima = mensagens.at(-1);
  if (!ultima) throw new Error(`nenhum e-mail enviado para ${email}`);
  const achou = /\b(\d{6})\b/.exec(ultima.texto);
  if (!achou) throw new Error(`sem código no e-mail para ${email}`);
  return achou[1];
}

/** Espera o envio de e-mail em segundo plano (o Better Auth manda sem aguardar). */
export async function esperarEmail(email: string, antes: number, ms = 5000): Promise<void> {
  const limite = Date.now() + ms;
  while (Date.now() < limite) {
    if (caixaDeSaida().filter((m) => m.para === email).length > antes) return;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error(`e-mail para ${email} não chegou`);
}

export async function semearEvento(slug: string, opcoes: { ativo?: boolean; urna?: "NAO_INICIADA" | "ABERTA" | "ENCERRADA" } = {}) {
  const { eventoId } = await semearMaratonaTechTivit({ slug, nome: `Evento ${slug}` });
  if (opcoes.ativo || opcoes.urna) {
    await db().evento.update({
      where: { id: eventoId },
      data: {
        estado: "ATIVO",
        estadoUrna: opcoes.urna ?? "NAO_INICIADA",
        ...(opcoes.urna === "ABERTA" ? { urnaAbertaEm: new Date() } : {}),
      },
    });
  }
  return eventoId;
}

export async function criarCandidatos(eventoId: string, quantidade: number, opcoes: { publicados?: boolean } = {}) {
  const ids: string[] = [];
  for (let i = 1; i <= quantidade; i++) {
    const c = await db().candidato.create({
      data: {
        eventoId,
        titulo: `Projeto ${i}`,
        imagemUrl: IMAGEM_FALSA,
        publicado: opcoes.publicados ?? true,
        ordem: i,
      },
    });
    ids.push(c.id);
  }
  return ids;
}

/** Usuário com e-mail verificado e participação, criado direto no banco (rápido, para testes de volume). */
export async function criarUsuarioDireto(eventoId: string, papel: PapelParticipacao = "PUBLICO", prefixo = "u"): Promise<UsuarioSessao> {
  const id = randomUUID();
  const email = `${prefixo}-${id}@teste.local`;
  await db().usuario.create({ data: { id, nome: `Pessoa ${prefixo}`, email, emailVerificado: true } });
  await db().participacao.create({ data: { usuarioId: id, eventoId, papel } });
  return { id, nome: `Pessoa ${prefixo}`, email, emailVerificado: true };
}

export async function criarAdminDireto(eventoId: string): Promise<UsuarioSessao> {
  return criarUsuarioDireto(eventoId, "ADMIN", "admin");
}

/** Cadastro completo pelo fluxo real: registrar → código do e-mail → confirmar. Devolve o usuário e os cookies da sessão. */
export async function cadastrarPeloFluxo(eventoId: string, email: string, senha = "senha-segura-1", nome = "Pessoa Teste") {
  const antes = caixaDeSaida().filter((m) => m.para === email).length;
  const ctx = novoContexto();
  const r = await acesso.registrar(ctx, { eventoId, nome, email, senha, confirmacaoSenha: senha, aceite: true });
  if (!r.ok) throw new Error(`registrar falhou: ${r.erro.codigo} ${r.erro.mensagem}`);
  await esperarEmail(email, antes);
  const confirmacao = novoContexto();
  const c = await acesso.confirmarCodigo(confirmacao, { eventoId, email, codigo: ultimoCodigoPara(email) });
  if (!c.ok) throw new Error(`confirmarCodigo falhou: ${c.erro.codigo} ${c.erro.mensagem}`);
  const usuario = await usuarioDaSessao(new Headers({ cookie: cookieDe(confirmacao.cookies) }));
  if (!usuario) throw new Error("sem sessão depois da confirmação");
  return { usuario, cookies: confirmacao.cookies };
}
