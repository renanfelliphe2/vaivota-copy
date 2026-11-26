import type { ComandoTelao, ConsultaTelaoRemoto, EstadoTelao, ModoPalco, SinalTelaoPareado, StatusTelaoRemoto } from "@/dominio/telaoRemoto";
import type { EstadoUiApresentacao } from "@/dominio/tipos";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Telão em outro aparelho (25/11/2026). Toda regra mora no servidor (src/server/telaoRemoto.ts). O admin gera o código no palco e
// comanda pelo controle remoto; o aparelho pareado se identifica pelo cookie HttpOnly gravado no pareamento.

/** Sinal e consulta saem a cada segundo: com tempo curto, um que trave não segura os seguintes. */
const TEMPO_SINAL_MS = 8000;

// Lado do admin

/** Reabre a sessão `id` (passando a ela o modo do palco) ou, com `criar`, gera um código novo. null sem sessão viva e sem `criar`. */
export function prepararTelaoRemoto(entrada: {
  eventoId: string;
  id: string | null;
  modo: ModoPalco;
  apresentacao: EstadoUiApresentacao | null;
  criar: boolean;
}): Promise<Resultado<StatusTelaoRemoto | null>> {
  return chamar<StatusTelaoRemoto | null>("prepararTelaoRemoto", entrada);
}

export function consultarTelaoRemoto(entrada: { eventoId: string; id: string; versaoApresentacao: number }): Promise<Resultado<ConsultaTelaoRemoto>> {
  return chamar<ConsultaTelaoRemoto>("consultarTelaoRemoto", entrada, { tempoMs: TEMPO_SINAL_MS });
}

export function comandarTelaoRemoto(entrada: { eventoId: string; id: string; comando: ComandoTelao }): Promise<Resultado<null>> {
  return chamar<null>("comandarTelaoRemoto", entrada, { tempoMs: TEMPO_SINAL_MS });
}

export function espelharApresentacaoTelao(entrada: { eventoId: string; id: string; apresentacao: EstadoUiApresentacao }): Promise<Resultado<{ versao: number }>> {
  return chamar<{ versao: number }>("espelharApresentacaoTelao", entrada, { tempoMs: TEMPO_SINAL_MS });
}

/** `soSeAguardando`: só descarta um código ainda não usado (o status devolvido diz se um aparelho acabou de parear). */
export function desconectarTelaoRemoto(entrada: { eventoId: string; id: string; soSeAguardando: boolean }): Promise<Resultado<StatusTelaoRemoto>> {
  return chamar<StatusTelaoRemoto>("desconectarTelaoRemoto", entrada);
}

// Lado do aparelho

export function parearTelao(entrada: { eventoId: string; codigo: string }): Promise<Resultado<null>> {
  return chamar<null>("parearTelao", entrada);
}

export function sincronizarTelao(entrada: {
  instancia: string;
  desde: number | null;
  estado: EstadoTelao | null;
  versaoApresentacao: number;
}): Promise<Resultado<SinalTelaoPareado>> {
  return chamar<SinalTelaoPareado>("sincronizarTelao", entrada, { tempoMs: TEMPO_SINAL_MS });
}

export function espelharApresentacaoTelaoPareado(entrada: { instancia: string; apresentacao: EstadoUiApresentacao }): Promise<Resultado<{ versao: number }>> {
  return chamar<{ versao: number }>("espelharApresentacaoTelaoPareado", entrada, { tempoMs: TEMPO_SINAL_MS });
}
