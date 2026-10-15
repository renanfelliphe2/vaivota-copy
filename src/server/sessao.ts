import "server-only";
import type { Evento } from "@/generated/prisma/client";
import { auth } from "./auth";
import { db } from "./db";
import { falha, sucesso, type Resultado } from "./resultado";

export type UsuarioSessao = { id: string; nome: string; email: string; emailVerificado: boolean };

/**
 * Usuário da sessão (cookie do Better Auth) ou null. Nunca lança por sessão inválida.
 *
 * Por padrão confere a sessão no banco (uma sessão encerrada ou revogada deixa de valer na hora). Só a leitura do estado
 * público (polling de todo mundo) aceita o cache assinado no cookie, que vale até 5 minutos: `{ estrita: false }`.
 */
export async function usuarioDaSessao(headers: Headers, opcoes: { estrita?: boolean } = {}): Promise<UsuarioSessao | null> {
  try {
    const sessao = await auth().api.getSession({
      headers,
      query: opcoes.estrita === false ? undefined : { disableCookieCache: true },
    });
    if (!sessao?.user) return null;
    const { id, name, email, emailVerified } = sessao.user;
    return { id, nome: name, email, emailVerificado: Boolean(emailVerified) };
  } catch (erro) {
    console.error("[servidor] falha ao ler a sessão:", erro);
    return null;
  }
}

/** Sessão com e-mail verificado e participação ADMIN no evento (senão NAO_AUTORIZADO). Revalidada a cada chamada. */
export async function exigirAdmin(
  usuario: UsuarioSessao | null,
  eventoId: string,
): Promise<Resultado<{ evento: Evento; usuarioId: string }>> {
  const evento = await db().evento.findUnique({ where: { id: eventoId } });
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });
  if (!usuario || !usuario.emailVerificado) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão verificada" });
  const admin = await db().participacao.findFirst({
    where: { usuarioId: usuario.id, eventoId, papel: "ADMIN" },
    select: { id: true },
  });
  if (!admin) return falha("NAO_AUTORIZADO", { detalhe: "sessão sem ADMIN no evento" });
  return sucesso({ evento, usuarioId: usuario.id });
}
