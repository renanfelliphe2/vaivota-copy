import type { DispositivoDoTotem } from "@/dominio/totem";
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

/** O totem deste aparelho (null = não pareado). Lido de tempos em tempos: pausar ou revogar aparece no quiosque. */
export function obterEstadoTotem(): Promise<Resultado<{ dispositivo: DispositivoDoTotem | null }>> {
  return chamar<{ dispositivo: DispositivoDoTotem | null }>("obterEstadoTotem", undefined, { tempoMs: 10_000 });
}

/**
 * Um toque confirmado = um voto. `REDE` significa "pode ter gravado": o totem não tem como conferir (não há identificação da
 * criança), então a tela oferece tentar de novo e o mediador adulto cuida da integridade (§8).
 */
export function votarInfantil(entrada: { eventoId: string; candidatoId: string }): Promise<Resultado<{ resultado: "REGISTRADO" }>> {
  return chamar<{ resultado: "REGISTRADO" }>("votarInfantil", entrada, { tempoMs: 15_000 });
}

/** Saída do modo quiosque (§6): só com o PIN do totem. */
export function conferirPinTotem(entrada: { pin: string }): Promise<Resultado<null>> {
  return chamar<null>("conferirPinTotem", entrada, { tempoMs: 10_000 });
}
