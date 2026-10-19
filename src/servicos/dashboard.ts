import type { GrupoAuditoria } from "@/dominio/auditoria";
import type { ItemAuditoria, OperacaoDados, ResultadoVisao, VotosJuriVisao } from "@/dominio/painel";
import { chamar } from "./rpc";
import { falha, type Resultado } from "./resultado";

// ST5: leituras do painel. O cálculo e o filtro são do servidor: durante a votação nenhuma contagem por projeto sai
// (nem pela resposta de rede), e o resultado só existe depois do encerramento (src/server/dashboard.ts).

export function obterOperacao(eventoId: string): Promise<Resultado<OperacaoDados>> {
  return chamar<OperacaoDados>("obterOperacao", { eventoId });
}

export function obterResultado(eventoId: string): Promise<Resultado<ResultadoVisao>> {
  return chamar<ResultadoVisao>("obterResultado", { eventoId });
}

export function listarAuditoria(eventoId: string, opcoes: { grupo?: GrupoAuditoria; limite?: number } = {}): Promise<Resultado<ItemAuditoria[]>> {
  return chamar<ItemAuditoria[]>("listarAuditoria", { eventoId, ...opcoes });
}

/** Votos identificados do júri: fica para o MVP do Festival. */
export async function obterVotosJuri(eventoId: string): Promise<Resultado<VotosJuriVisao>> {
  void eventoId;
  return falha("RESULTADO_INDISPONIVEL", { detalhe: "votos do júri não existem no MVP da Maratona Tech Tivit" });
}
