import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { registrarAuditoria } from "./auditoria";
import { db } from "./db";

// Retenção de dados pessoais (DocumentDesign §10: "após Concluir Evento, nome e e-mail dos participantes são anonimizados depois de um
// prazo configurável por evento, mantendo participações e votos para a integridade do resultado").
//
// Quem entra: a pessoa cujas participações são TODAS em eventos concluídos com o prazo (`prazoAnonimizacaoDias` depois de
// `concluidoEm`) já vencido. Quem ainda participa de um evento em andamento, ou dentro do prazo, não é tocada. Administradores da
// organização ficam de fora por padrão (anonimizar a conta de quem opera o sistema tiraria o acesso dela aos próximos eventos); a opção
// `incluirAdmins` os inclui, junto com os e-mails dos convites de admin dos eventos vencidos.
//
// O que muda numa pessoa anonimizada: o nome e o e-mail viram valores neutros (o e-mail original fica livre para um novo cadastro), a
// foto e a conta de login (senha e dados do Google) e as sessões e os códigos pendentes são apagados. O que fica: a participação e
// tudo o que ela carrega (que votou, voto identificado do júri), os votos e a auditoria. O voto do público nunca esteve ligado à pessoa.
//
// Não desfaz: o caminho é o de sempre (backup antes, `pnpm db:anonimizar` em simulação, depois `--executar`). Idempotente: quem já foi
// anonimizada não entra de novo.

export const NOME_ANONIMO = "Participante anônimo";
const DOMINIO_ANONIMO = "anonimizado.invalid";

/** E-mail neutro e único por pessoa (`.invalid` nunca é um endereço real). */
export function emailAnonimo(id: string): string {
  return `anonimo-${id}@${DOMINIO_ANONIMO}`;
}

export type OpcoesAnonimizacao = {
  /** false: só conta o que seria anonimizado, sem escrever nada. */
  executar: boolean;
  /** Inclui os administradores e os convites de admin dos eventos vencidos. */
  incluirAdmins?: boolean;
  /** Quantas pessoas, no máximo, nesta passada. Sem limite, todas as elegíveis. */
  limite?: number;
  agoraMs?: number;
};

export type ResultadoAnonimizacao = {
  /** Eventos concluídos com o prazo vencido. */
  eventosVencidos: { id: string; slug: string }[];
  /** Pessoas que entram pela regra (antes do limite). */
  elegiveis: number;
  /** Administradores que a regra deixou de fora (sempre 0 com `incluirAdmins`). */
  adminsPreservados: number;
  /** Pessoas realmente anonimizadas nesta passada (sempre 0 na simulação). */
  anonimizados: number;
  /** E-mails de convites de admin anonimizados (só com `incluirAdmins`). */
  convitesAdminAnonimizados: number;
};

/** Eventos concluídos cujo prazo de anonimização já passou. */
async function eventosVencidos(agoraMs: number): Promise<{ id: string; slug: string }[]> {
  return db().$queryRaw<{ id: string; slug: string }[]>`
    SELECT id, slug FROM evento
    WHERE estado = 'CONCLUIDO' AND concluido_em IS NOT NULL
      AND concluido_em + (prazo_anonimizacao_dias * INTERVAL '1 day') <= ${new Date(agoraMs)}`;
}

function elegivel(vencidos: string[], incluirAdmins: boolean): Prisma.UsuarioWhereInput {
  return {
    anonimizadoEm: null,
    participacoes: { some: {}, every: { eventoId: { in: vencidos } }, ...(incluirAdmins ? {} : { none: { papel: "ADMIN" } }) },
  };
}

export async function anonimizarVencidos(opcoes: OpcoesAnonimizacao): Promise<ResultadoAnonimizacao> {
  const agoraMs = opcoes.agoraMs ?? Date.now();
  const incluirAdmins = opcoes.incluirAdmins ?? false;
  const vencidos = await eventosVencidos(agoraMs);
  const resultado: ResultadoAnonimizacao = { eventosVencidos: vencidos, elegiveis: 0, adminsPreservados: 0, anonimizados: 0, convitesAdminAnonimizados: 0 };
  if (vencidos.length === 0) return resultado;

  const ids = vencidos.map((e) => e.id);
  const where = elegivel(ids, incluirAdmins);
  resultado.elegiveis = await db().usuario.count({ where });
  if (!incluirAdmins)
    resultado.adminsPreservados = await db().usuario.count({
      where: { anonimizadoEm: null, participacoes: { some: { papel: "ADMIN" }, every: { eventoId: { in: ids } } } },
    });
  if (!opcoes.executar) return resultado;

  const candidatos = await db().usuario.findMany({
    where,
    take: opcoes.limite,
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
    select: { id: true, email: true, participacoes: { select: { eventoId: true } } },
  });
  const porEvento = new Map<string, number>();
  for (const u of candidatos) {
    const feito = await db().$transaction(async (tx) => {
      // Trava a linha e reconfere: entre a busca e aqui a pessoa pode ter entrado em outro evento.
      await tx.$queryRaw`SELECT id FROM usuario WHERE id = ${u.id} FOR UPDATE`;
      if (!(await tx.usuario.findFirst({ where: { id: u.id, ...where }, select: { id: true } }))) return false;
      await tx.usuario.update({
        where: { id: u.id },
        data: { nome: NOME_ANONIMO, email: emailAnonimo(u.id), emailVerificado: false, imagem: null, anonimizadoEm: new Date(agoraMs) },
      });
      await tx.session.deleteMany({ where: { userId: u.id } });
      await tx.account.deleteMany({ where: { userId: u.id } });
      // Códigos de e-mail pendentes: o identificador é "<tipo>-otp-<e-mail>".
      await tx.verification.deleteMany({
        where: {
          OR: [
            { identifier: { endsWith: `-otp-${u.email}`, mode: "insensitive" } },
            { identifier: { equals: u.email, mode: "insensitive" } },
          ],
        },
      });
      return true;
    });
    if (!feito) continue;
    resultado.anonimizados += 1;
    for (const eventoId of new Set(u.participacoes.map((p) => p.eventoId))) porEvento.set(eventoId, (porEvento.get(eventoId) ?? 0) + 1);
  }

  if (incluirAdmins) {
    const convites = await db().conviteAdmin.findMany({
      where: { eventoId: { in: ids }, NOT: { email: { endsWith: `@${DOMINIO_ANONIMO}` } } },
      select: { id: true },
    });
    for (const c of convites) await db().conviteAdmin.update({ where: { id: c.id }, data: { email: `anonimo-${c.id}@${DOMINIO_ANONIMO}` } });
    resultado.convitesAdminAnonimizados = convites.length;
  }

  for (const [eventoId, quantidade] of porEvento)
    await registrarAuditoria(db(), {
      eventoId,
      usuarioId: null,
      acao: "DADOS_ANONIMIZADOS",
      entidade: "usuario",
      detalhes: { quantidade, ...(incluirAdmins ? { admins: true } : {}) },
    });
  return resultado;
}
