import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST4: ativar, abrir, encerrar e concluir. Encerrar e congelar o resultado oficial acontecem na mesma transação do
// servidor. Depois de cada ação o estado público é recarregado (o painel e a trava de configuração reagem na hora).

async function executar(nome: string, args: Record<string, unknown>): Promise<Resultado<null>> {
  const r = await chamar<null>(nome, args);
  await recarregarEstado();
  return r.ok ? { ok: true, dados: null } : r;
}

export function ativarEvento(eventoId: string) {
  return executar("ativarEvento", { eventoId });
}

export function abrirUrna(eventoId: string) {
  return executar("abrirUrna", { eventoId });
}

export function encerrarUrna(eventoId: string) {
  return executar("encerrarUrna", { eventoId });
}

/** Exige digitar o nome do evento. */
export function concluirEvento(eventoId: string, confirmacaoNome: string) {
  return executar("concluirEvento", { eventoId, confirmacaoNome });
}
