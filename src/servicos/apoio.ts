import type { EstadoApp, Evento } from "@/dominio/tipos";
import { hashMock } from "@/lib/hash";
import { paraInstante } from "@/lib/tempo";
import { obterAmbiente } from "@/store/ambiente";
import { atraso, falha, simularFalha, type ErroServico, type Resultado } from "./resultado";

// Apoio comum aos serviços das Etapas 5 e 6 (regras 1 a 5 da seção 5.2 da Etapa 0).

/** ipHash constante do protótipo. */
export const IP_HASH = hashMock("ip-demo");

/** Lê o estado e o relógio na hora (sempre depois de cada `await`). */
export function lerAmbiente() {
  const { store, relogio } = obterAmbiente();
  return { estado: store.getState(), agoraMs: relogio.getAgora(), store };
}

/**
 * Latência e falha simulada. Com `{ leitura: true }` obedece só a `simularErroRede` e não consome a
 * falha pontual destinada ao próximo envio (D8 da Etapa 5, D7 da Etapa 6).
 */
export async function iniciarServico(opcoes: { leitura?: boolean } = {}): Promise<{ ok: false; erro: ErroServico } | null> {
  await atraso();
  return simularFalha(opcoes.leitura ? { consumirPontual: false } : {});
}

export function acharEvento(estado: EstadoApp, eventoId: string): Evento | undefined {
  return estado.banco.eventos.find((e) => e.id === eventoId);
}

export function instanteDoEvento(estado: EstadoApp, eventoId: string, agoraMs: number) {
  return paraInstante(agoraMs, acharEvento(estado, eventoId)?.fusoHorario);
}

/** Há convite USADO no evento (D24 da Etapa 6). Contagem pública, nunca hash. */
export function conviteUsadoNoEvento(estado: EstadoApp, eventoId: string): boolean {
  return estado.banco.convitesJurado.some((c) => c.eventoId === eventoId && c.estado === "USADO");
}

/** Serviços da configuração: sessão com e-mail verificado e participação ADMIN no evento. */
export function exigirAdmin(estado: EstadoApp, eventoId: string): Resultado<{ evento: Evento; usuarioId: string }> {
  const evento = acharEvento(estado, eventoId);
  if (!evento) return falha("NAO_ENCONTRADO", { detalhe: `evento ${eventoId} não existe` });
  const usuarioId = estado.sessao.usuarioId;
  const usuario = estado.banco.usuarios.find((u) => u.id === usuarioId);
  const admin = estado.banco.participacoes.some((p) => p.usuarioId === usuarioId && p.eventoId === eventoId && p.papel === "ADMIN");
  if (!usuario || !usuario.emailVerificadoEm || !admin) return falha("NAO_AUTORIZADO", { detalhe: "sessão sem ADMIN no evento" });
  return { ok: true, dados: { evento, usuarioId: usuario.id } };
}
