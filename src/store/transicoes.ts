import { congelarResultado } from "@/dominio/resultado";
import type { EstadoApp, EstadoEvento, EstadoUrna, Evento, OrigemEncerramento } from "@/dominio/tipos";
import { paraInstante, paraMs } from "@/lib/tempo";
import { criarApresentacaoInicial } from "./estadoInicial";
import { registrarAuditoria } from "./auditoria";

// D8: todas as transições de estado do evento e da urna moram aqui (funções puras sobre o estado).
// Usadas pelos serviços da Etapa 6, pelo relógio (fechamento automático) e pela toolbar.

export type ContextoTransicao = {
  agoraMs: number;
  usuarioId?: string | null;
};

function evento(estado: EstadoApp, eventoId: string): Evento | undefined {
  return estado.banco.eventos.find((e) => e.id === eventoId);
}

function alterarEvento(estado: EstadoApp, eventoId: string, mudanca: Partial<Evento>): EstadoApp {
  return {
    ...estado,
    banco: {
      ...estado.banco,
      eventos: estado.banco.eventos.map((e) => (e.id === eventoId ? { ...e, ...mudanca } : e)),
    },
  };
}

function instante(estado: EstadoApp, eventoId: string, agoraMs: number) {
  return paraInstante(agoraMs, evento(estado, eventoId)?.fusoHorario);
}

/** RASCUNHO → ATIVO. */
export function ativarEvento(estado: EstadoApp, eventoId: string, ctx: ContextoTransicao): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estado !== "RASCUNHO") return estado;
  const agora = instante(estado, eventoId, ctx.agoraMs);
  const proximo = alterarEvento(estado, eventoId, { estado: "ATIVO", atualizadoEm: agora });
  return registrarAuditoria(proximo, {
    eventoId,
    usuarioId: ctx.usuarioId ?? null,
    acao: "EVENTO_ATIVADO",
    entidade: "evento",
    entidadeId: eventoId,
    criadoEm: agora,
  });
}

/** NAO_INICIADA → ABERTA (sempre manual; D7). */
export function abrirUrna(estado: EstadoApp, eventoId: string, ctx: ContextoTransicao): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estadoUrna !== "NAO_INICIADA") return estado;
  const agora = instante(estado, eventoId, ctx.agoraMs);
  const proximo = alterarEvento(estado, eventoId, { estadoUrna: "ABERTA", urnaAbertaEm: agora, atualizadoEm: agora });
  return registrarAuditoria(proximo, {
    eventoId,
    usuarioId: ctx.usuarioId ?? null,
    acao: "URNA_ABERTA",
    entidade: "evento",
    entidadeId: eventoId,
    criadoEm: agora,
  });
}

/** ABERTA → ENCERRADA. Sempre congela o resultado (versão nova, motivo ENCERRAMENTO) e audita com a origem. */
export function encerrarUrna(
  estado: EstadoApp,
  eventoId: string,
  ctx: ContextoTransicao & { origem: OrigemEncerramento },
): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estadoUrna !== "ABERTA") return estado;
  const agora = instante(estado, eventoId, ctx.agoraMs);
  let proximo = alterarEvento(estado, eventoId, { estadoUrna: "ENCERRADA", urnaEncerradaEm: agora, atualizadoEm: agora });
  proximo = congelarResultado(proximo, eventoId, "ENCERRAMENTO", {
    calculadoPorId: ctx.usuarioId ?? null,
    calculadoEm: agora,
  });
  return registrarAuditoria(proximo, {
    eventoId,
    usuarioId: ctx.usuarioId ?? null,
    acao: "URNA_ENCERRADA",
    entidade: "evento",
    entidadeId: eventoId,
    detalhes: { origem: ctx.origem },
    criadoEm: agora,
  });
}

/** → CONCLUIDO. Se a urna ainda estiver aberta, encerra antes (com a origem informada). */
export function concluirEvento(
  estado: EstadoApp,
  eventoId: string,
  ctx: ContextoTransicao & { origem: OrigemEncerramento },
): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estado === "CONCLUIDO") return estado;
  let proximo = atual.estadoUrna === "ABERTA" ? encerrarUrna(estado, eventoId, ctx) : estado;
  const agora = instante(proximo, eventoId, ctx.agoraMs);
  proximo = alterarEvento(proximo, eventoId, { estado: "CONCLUIDO", concluidoEm: agora, atualizadoEm: agora });
  return registrarAuditoria(proximo, {
    eventoId,
    usuarioId: ctx.usuarioId ?? null,
    acao: "EVENTO_CONCLUIDO",
    entidade: "evento",
    entidadeId: eventoId,
    criadoEm: agora,
  });
}

/** Fechamento automático (D7): toda urna ABERTA com encerramentoAutomatico e agora ≥ janelaFim. */
export function fecharUrnasVencidas(estado: EstadoApp, agoraMs: number): EstadoApp {
  return estado.banco.eventos.reduce((acc, e) => {
    if (e.estadoUrna !== "ABERTA" || !e.encerramentoAutomatico || !e.janelaFim) return acc;
    if (agoraMs < paraMs(e.janelaFim)) return acc;
    return encerrarUrna(acc, e.id, { agoraMs, origem: "AUTOMATICO" });
  }, estado);
}

// ─────────────────────────────────────────────
// Só toolbar (protótipo)
// ─────────────────────────────────────────────

/** Para trás: limpa o encerramento, descarta os resultados do evento e zera o progresso da revelação. */
function voltarUrna(estado: EstadoApp, eventoId: string, alvo: EstadoUrna): EstadoApp {
  const mudanca: Partial<Evento> = { estadoUrna: alvo, urnaEncerradaEm: null };
  if (alvo === "NAO_INICIADA") mudanca.urnaAbertaEm = null;
  const proximo = alterarEvento(estado, eventoId, mudanca);
  return {
    ...proximo,
    banco: { ...proximo.banco, resultados: proximo.banco.resultados.filter((r) => r.eventoId !== eventoId) },
    ui: { ...proximo.ui, apresentacao: criarApresentacaoInicial(), dashboard: { resultadoVisivel: null } },
  };
}

const ORDEM_URNA: EstadoUrna[] = ["NAO_INICIADA", "ABERTA", "ENCERRADA"];

export function forcarEstadoUrna(
  estado: EstadoApp,
  eventoId: string,
  alvo: EstadoUrna,
  ctx: ContextoTransicao,
): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estadoUrna === alvo) return estado;
  const de = ORDEM_URNA.indexOf(atual.estadoUrna);
  const para = ORDEM_URNA.indexOf(alvo);
  if (para < de) return voltarUrna(estado, eventoId, alvo);
  let proximo = estado;
  if (atual.estadoUrna === "NAO_INICIADA") proximo = abrirUrna(proximo, eventoId, ctx);
  if (alvo === "ENCERRADA") proximo = encerrarUrna(proximo, eventoId, { ...ctx, origem: "TOOLBAR" });
  return proximo;
}

export function forcarEstadoEvento(
  estado: EstadoApp,
  eventoId: string,
  alvo: EstadoEvento,
  ctx: ContextoTransicao,
): EstadoApp {
  const atual = evento(estado, eventoId);
  if (!atual || atual.estado === alvo) return estado;
  if (alvo === "CONCLUIDO") {
    const ativo = atual.estado === "RASCUNHO" ? ativarEvento(estado, eventoId, ctx) : estado;
    return concluirEvento(ativo, eventoId, { ...ctx, origem: "TOOLBAR" });
  }
  if (alvo === "ATIVO" && atual.estado === "RASCUNHO") return ativarEvento(estado, eventoId, ctx);
  // Para trás (CONCLUIDO → ATIVO/RASCUNHO, ATIVO → RASCUNHO): só muda o estado; a urna fica como está.
  return alterarEvento(estado, eventoId, { estado: alvo, concluidoEm: null });
}
