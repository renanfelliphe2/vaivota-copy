import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "./db";
import { consumirEmMemoria } from "./limites";
import { falha, falhaInterna, sucesso, type CodigoErro, type Resultado } from "./resultado";
import type { UsuarioSessao } from "./sessao";

// ST3: votação popular. O voto nunca guarda o usuário (sigilo). Voto único garantido no banco:
//   UPDATE participacao SET votou = true WHERE id = ? AND votou = false   (0 linhas → JA_VOTOU)
// e o INSERT do voto na MESMA transação. O UPDATE vem primeiro: ele serializa as requisições simultâneas da mesma
// pessoa na linha da participação, então só uma delas chega ao INSERT. A urna é conferida dentro da transação, com a
// linha do evento travada em modo compartilhado: o encerramento (que atualiza essa linha) espera os votos em andamento
// e nenhum voto entra depois dele.

/** Voto sem efeito (a transação desfaz tudo): carrega o código de erro para fora do `$transaction`. */
class VotoRecusado extends Error {
  constructor(readonly codigo: CodigoErro) {
    super(codigo);
  }
}

export type EntradaVoto = { eventoId: string; candidatoId: string };
export type ContextoVoto = { ip: string };

const VOTOS_POR_USUARIO_POR_MINUTO = 12;
// O público vota do mesmo Wi-Fi: o limite por IP só barra uma máquina disparando em massa. O voto é único por pessoa no banco.
const VOTOS_POR_IP_POR_MINUTO = 6000;

function estadoDaUrna(estado: string, estadoUrna: string): CodigoErro | null {
  if (estado === "CONCLUIDO") return "EVENTO_CONCLUIDO";
  if (estado === "RASCUNHO") return "EVENTO_INDISPONIVEL";
  if (estadoUrna === "NAO_INICIADA") return "URNA_NAO_ABERTA";
  if (estadoUrna === "ENCERRADA") return "URNA_ENCERRADA";
  return null;
}

export async function votarPopular(
  usuario: UsuarioSessao | null,
  entrada: EntradaVoto,
  ctx: ContextoVoto,
): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: "voto sem sessão" });
  if (
    !consumirEmMemoria(`voto:${usuario.id}`, VOTOS_POR_USUARIO_POR_MINUTO, 60_000) ||
    !consumirEmMemoria(`voto-ip:${ctx.ip}`, VOTOS_POR_IP_POR_MINUTO, 60_000)
  )
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });

  try {
    const evento = await db().evento.findUnique({
      where: { id: entrada.eventoId },
      select: { id: true, estado: true, estadoUrna: true, bloquearVotoProprio: true },
    });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    if (!usuario.emailVerificado) return falha("EMAIL_NAO_VERIFICADO");
    const recusaEstado = estadoDaUrna(evento.estado, evento.estadoUrna);
    if (recusaEstado === "EVENTO_CONCLUIDO" || recusaEstado === "EVENTO_INDISPONIVEL") return falha(recusaEstado);

    const participacao = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      select: { id: true, papel: true, votou: true },
    });
    // O voto nunca cria participação (C2): sem ela, o acesso não foi concluído.
    if (!participacao) return falha("NAO_AUTORIZADO", { detalhe: `voto sem participação de ${usuario.id} em ${evento.id}` });
    if (participacao.papel !== "PUBLICO") return falha("PAPEL_INVALIDO", { detalhe: `voto popular com papel ${participacao.papel}` });
    if (recusaEstado) return falha(recusaEstado);
    if (participacao.votou) return falha("JA_VOTOU", { detalhe: "participação já com votou = true" });

    const candidato = await db().candidato.findFirst({
      where: { id: entrada.candidatoId, eventoId: evento.id, publicado: true, desqualificado: false },
      select: { id: true, usuarioVinculadoId: true },
    });
    if (!candidato) return falha("CANDIDATO_INDISPONIVEL", { detalhe: `candidato ${entrada.candidatoId} não votável em ${evento.id}` });
    if (evento.bloquearVotoProprio && candidato.usuarioVinculadoId === usuario.id) return falha("VOTO_PROPRIO");

    await db().$transaction(async (tx) => {
      // Trava compartilhada na linha do evento e relê a urna: o encerramento espera este voto terminar.
      const linhas = await tx.$queryRaw<{ estado: string; estado_urna: string }[]>`
        SELECT estado::text AS estado, estado_urna::text AS estado_urna FROM evento WHERE id = ${evento.id} FOR SHARE`;
      const atual = linhas[0];
      const recusaAtual = atual ? estadoDaUrna(atual.estado, atual.estado_urna) : "NAO_ENCONTRADO";
      if (recusaAtual) throw new VotoRecusado(recusaAtual);

      const marcada = await tx.participacao.updateMany({
        where: { id: participacao.id, votou: false, papel: "PUBLICO" },
        data: { votou: true },
      });
      if (marcada.count === 0) throw new VotoRecusado("JA_VOTOU");

      // C20: recibo aleatório de 32 bytes, nunca derivado de sequência, id ou instante.
      await tx.voto.create({
        data: { eventoId: evento.id, candidatoId: candidato.id, hashRecibo: randomBytes(32).toString("hex") },
      });
    });
    return sucesso({ resultado: "REGISTRADO" });
  } catch (e) {
    if (e instanceof VotoRecusado) return falha(e.codigo, { detalhe: `voto recusado dentro da transação: ${e.codigo}` });
    return falhaInterna(e, "votarPopular");
  }
}

/**
 * Estado real do voto (verificação depois de erro de rede). Só diz SE a pessoa votou, nunca em quem: `candidatoAtualId`
 * existe para o jurado do Festival e aqui é sempre nulo.
 */
export async function consultarEstadoVoto(
  usuario: UsuarioSessao | null,
  entrada: { eventoId: string },
  ctx: ContextoVoto,
): Promise<Resultado<{ votou: boolean; candidatoAtualId: string | null }>> {
  if (!usuario) return falha("NAO_AUTORIZADO", { detalhe: "consulta sem sessão" });
  if (
    !consumirEmMemoria(`consulta-voto:${usuario.id}`, 60, 60_000) ||
    !consumirEmMemoria(`consulta-voto-ip:${ctx.ip}`, 3000, 60_000)
  )
    return falha("LIMITE_TENTATIVAS", { parametros: { n: 60 } });
  try {
    const evento = await db().evento.findUnique({ where: { id: entrada.eventoId }, select: { id: true } });
    if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${entrada.eventoId} não existe` });
    const participacao = await db().participacao.findUnique({
      where: { usuarioId_eventoId: { usuarioId: usuario.id, eventoId: evento.id } },
      select: { papel: true, votou: true },
    });
    if (!participacao || participacao.papel === "ADMIN") return sucesso({ votou: false, candidatoAtualId: null });
    return sucesso({ votou: participacao.votou, candidatoAtualId: null });
  } catch (e) {
    return falhaInterna(e, "consultarEstadoVoto");
  }
}
