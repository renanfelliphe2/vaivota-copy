import type { EstadoPublico } from "@/dominio/estadoPublico";
import type { EstadoApp } from "@/dominio/tipos";
import { chamar } from "@/servicos/rpc";
import { obterAmbiente } from "./ambiente";
import { aplicarEstadoDoServidor } from "./estadoReal";

// Sincronização do estado público com o servidor: depois de cada ação que muda algo e a cada polling.

/** Alinha o relógio do navegador ao do servidor (metade do tempo de ida e volta) e aplica o estado novo. */
export function aplicarEstadoPublico(publico: EstadoPublico, atrasoMs = 0): void {
  const { store, relogio } = obterAmbiente();
  relogio.sincronizar({ agora: publico.agoraMs + atrasoMs / 2, pausado: false });
  store.atualizar((e) => aplicarEstadoDoServidor(e, publico));
}

/** Busca o estado público e aplica. false se o servidor não respondeu (o estado antigo segue valendo). */
export async function recarregarEstado(): Promise<boolean> {
  const inicio = typeof performance !== "undefined" ? performance.now() : Date.now();
  const r = await chamar<EstadoPublico>("obterEstado", undefined, { tempoMs: 10_000 });
  if (!r.ok) return false;
  const fim = typeof performance !== "undefined" ? performance.now() : Date.now();
  aplicarEstadoPublico(r.dados, Math.max(0, fim - inicio));
  return true;
}

/**
 * De quanto em quanto tempo o navegador busca o estado público (a tela aberta, com a aba visível). A cada consulta uma
 * função serverless roda: quem só espera a urna abrir (ou fechar) consulta a cada 10 s; quem já votou ou administra, a cada
 * 30 s; com a urna encerrada ou o evento concluído, a cada 60 s. Com ±20% de variação, para ninguém sincronizar.
 */
export function intervaloDePollingMs(estado: EstadoApp, sorteio: number = Math.random()): number {
  const evento = estado.banco.eventos[0];
  let base = 30_000;
  if (evento) {
    const minha = estado.banco.participacoes.find((p) => p.eventoId === evento.id);
    if (evento.estado === "CONCLUIDO" || evento.estadoUrna === "ENCERRADA") base = 60_000;
    else if (evento.estadoUrna === "ABERTA" && (minha?.votou || minha?.papel === "ADMIN")) base = 30_000;
    else base = 10_000;
  }
  return Math.round(base * (0.8 + sorteio * 0.4));
}
