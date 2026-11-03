import type { AcaoApresentacao, DadosEnsaio, DadosRevelacao, EstadoAoVivo, StatusResultado } from "@/dominio/apresentacao/tipos";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Telão (sala de controle, palco, ensaio e revelação). Toda regra mora no servidor (src/server/apresentacao.ts): o admin do evento
// é conferido a cada chamada e o resultado só sai por `carregarRevelacao` (urna encerrada) e `obterDadosEnsaio` (inventado, sem
// ler voto). A sala só pergunta `obterStatusResultado`, que nunca traz o resultado.

export type { AcaoApresentacao, EstadoAoVivo, StatusResultado };

export function obterStatusResultado(eventoId: string): Promise<Resultado<StatusResultado>> {
  return chamar<StatusResultado>("obterStatusResultado", { eventoId });
}

export function obterEstadoAoVivo(eventoId: string): Promise<Resultado<EstadoAoVivo>> {
  return chamar<EstadoAoVivo>("obterEstadoAoVivo", { eventoId });
}

/** Uma vez por cerimônia. Depois de carregado, a cerimônia nunca espera por serviço. */
export function carregarRevelacao(eventoId: string): Promise<Resultado<DadosRevelacao>> {
  return chamar<DadosRevelacao>("carregarRevelacao", { eventoId });
}

/** Ensaio: um resultado inventado em cima dos itens e dos módulos do evento; não altera nada do evento real. */
export function obterDadosEnsaio(eventoId: string, cenarioId: string): Promise<Resultado<DadosEnsaio>> {
  return chamar<DadosEnsaio>("obterDadosEnsaio", { eventoId, cenarioId });
}

/**
 * Trilha da cerimônia, sem esperar: quem chama dispara e só olha o resultado se quiser avisar a falha. `detalhes` leva só a versão
 * e o índice da cena, nunca vencedores, pontuações ou votos.
 */
export function registrarAcaoApresentacao(eventoId: string, acao: AcaoApresentacao, info: { versao: number; cena?: number }): Promise<Resultado<null>> {
  return chamar<null>("registrarAcaoApresentacao", { eventoId, acao, ...info });
}
