import type { AnaliseTotem, ContagemVotoTotem, ResumoSessao } from "@/dominio/sessaoTotem";
import type { DispositivoDoTotem, RelatorioTotem } from "@/dominio/totem";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Totem (Base/VotoInfantil.md §4, §6 e §9). Toda regra mora no servidor (src/server/totem.ts): aparelho pareado e ativo, módulo,
// urna, candidato e PIN. O totem não tem login: a identidade é o token que o pareamento grava num cookie HttpOnly do tablet, e o
// navegador o envia sozinho. Por isso nenhuma destas chamadas leva o id do aparelho.

export type { DispositivoDoTotem };

/** Troca o código de pareamento (digitado uma vez no tablet) pelo token do aparelho, gravado no cookie. */
export function parearTotem(entrada: { eventoId: string; codigo: string }): Promise<Resultado<{ dispositivo: DispositivoDoTotem }>> {
  return chamar<{ dispositivo: DispositivoDoTotem }>("parearTotem", entrada, { tempoMs: 15_000 });
}

/**
 * O totem deste aparelho (null = não pareado). Lido de tempos em tempos: pausar ou revogar aparece no quiosque. `sincronizar`: o
 * admin pediu um relatório agora ("Forçar sincronização").
 */
export function obterEstadoTotem(): Promise<Resultado<{ dispositivo: DispositivoDoTotem | null; sincronizar: boolean }>> {
  return chamar<{ dispositivo: DispositivoDoTotem | null; sincronizar: boolean }>("obterEstadoTotem", undefined, { tempoMs: 10_000 });
}

/** Relatório do aparelho para a página Totens do admin: o que a tela mostra e se está em tela cheia. */
export function sincronizarTotem(relatorio: RelatorioTotem): Promise<Resultado<null>> {
  return chamar<null>("sincronizarTotem", relatorio, { tempoMs: 10_000 });
}

/**
 * Um toque confirmado = um voto. `REDE` significa "pode ter gravado": o totem não tem como conferir (não há identificação da
 * criança). Por isso cada tentativa leva uma `idEnvio` aleatória e o "tentar de novo" reenvia a MESMA: se o voto tinha chegado, o
 * servidor responde REGISTRADO sem contar outro. O mediador adulto segue cuidando do resto da integridade (§8).
 */
export type RespostaVotoTotem = { resultado: "REGISTRADO" } & Partial<ContagemVotoTotem>;

export function votarInfantil(entrada: { eventoId: string; candidatoId: string; idEnvio?: string }): Promise<Resultado<RespostaVotoTotem>> {
  return chamar<RespostaVotoTotem>("votarInfantil", entrada, { tempoMs: 15_000 });
}

/** Saída do modo quiosque (§6): só com o PIN do totem. */
export function conferirPinTotem(entrada: { pin: string }): Promise<Resultado<null>> {
  return chamar<null>("conferirPinTotem", entrada, { tempoMs: 10_000 });
}

// Menu do PIN (logTotem.md): cada chamada leva o PIN, conferido no servidor com o bloqueio de 5 erros. Nada traz o item votado.

export function analisarTotem(pin: string): Promise<Resultado<AnaliseTotem>> {
  return chamar<AnaliseTotem>("analisarTotem", { pin }, { tempoMs: 15_000 });
}

export function encerrarSessaoTotem(pin: string): Promise<Resultado<{ resumo: ResumoSessao }>> {
  return chamar<{ resumo: ResumoSessao }>("encerrarSessaoTotem", { pin }, { tempoMs: 15_000 });
}

export function abrirSessaoTotem(pin: string, criancasEsperadas: number | null): Promise<Resultado<{ sessaoId: string; numero: number }>> {
  return chamar<{ sessaoId: string; numero: number }>("abrirSessaoTotem", { pin, criancasEsperadas }, { tempoMs: 15_000 });
}

export function configurarTotem(pin: string, inatividadeMin: number): Promise<Resultado<{ inatividadeMin: number }>> {
  return chamar<{ inatividadeMin: number }>("configurarTotem", { pin, inatividadeMin }, { tempoMs: 15_000 });
}
