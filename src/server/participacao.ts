import "server-only";
import type { PapelParticipacao } from "@/dominio/tipos";
import { registrarAuditoria } from "./auditoria";
import { db } from "./db";
import { falha, sucesso, type Resultado } from "./resultado";
import type { UsuarioSessao } from "./sessao";

// C2: a participação nasce no acesso (nunca junto com o voto, para o voto não ser cruzado com ela).
// `garantirParticipacao` é idempotente e seguro com chamadas simultâneas (índice único usuário × evento).

/** E-mail do convite de admin é sempre minúsculo, sem espaços. */
export function normalizarEmailAdmin(email: string): string {
  return email.trim().toLowerCase();
}

export async function garantirParticipacao(
  usuario: UsuarioSessao | null,
  eventoId: string,
): Promise<Resultado<{ papel: PapelParticipacao }>> {
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: "sem sessão" });
  const evento = await db().evento.findUnique({ where: { id: eventoId }, select: { id: true, estado: true } });
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });

  const existente = await db().participacao.findUnique({
    where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId } },
    select: { papel: true },
  });
  if (existente) return sucesso({ papel: existente.papel });

  // Admin convidado (script `promover-admin` para quem ainda não tinha conta): vale só com o e-mail verificado.
  let papel: PapelParticipacao = "PUBLICO";
  if (usuario.emailVerificado) {
    const convite = await db().conviteAdmin.findUnique({
      where: { eventoId_email: { eventoId, email: normalizarEmailAdmin(usuario.email) } },
    });
    if (convite && convite.estado === "PENDENTE") papel = "ADMIN";
  }

  // Só se entra como público num evento ATIVO. Antes (rascunho) ou depois (concluído) não se cria participação: ela nasce
  // quando a pessoa voltar com o evento ativo (a página do evento chama isto ao abrir). Admin convidado entra sempre.
  if (papel === "PUBLICO" && evento.estado !== "ATIVO") return sucesso({ papel });

  const criada = await db().$transaction(async (tx) => {
    const { count } = await tx.participacao.createMany({
      data: [{ usuarioId: usuario.id, eventoId, papel }],
      skipDuplicates: true,
    });
    if (count === 1 && papel === "ADMIN") {
      await tx.conviteAdmin.update({
        where: { eventoId_email: { eventoId, email: normalizarEmailAdmin(usuario.email) } },
        data: { estado: "USADO", resgatadoPorId: usuario.id, resgatadoEm: new Date() },
      });
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId: usuario.id,
        acao: "ADMIN_CONVITE_RESGATADO",
        entidade: "convite_admin",
      });
    }
    return count === 1;
  });

  // Outra chamada criou primeiro: devolve a que ficou.
  if (!criada) {
    const atual = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId } },
      select: { papel: true },
    });
    return sucesso({ papel: atual?.papel ?? "PUBLICO" });
  }
  return sucesso({ papel });
}
