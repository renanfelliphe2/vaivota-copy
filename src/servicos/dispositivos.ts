import type { CodigoPareamentoGerado, CodigoPendente, DispositivoListado } from "@/dominio/totem";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Totem (Base/VotoInfantil.md §4): gestão dos aparelhos pelo admin. Toda regra (trava da fase, validação, hash do código e do
// PIN, auditoria) mora no servidor (src/server/dispositivos.ts). O código legível volta na geração e, enquanto não for usado, na
// lista de códigos pendentes (25/11/2026); nada traz hash. Depois de cada mudança o estado público é recarregado: o checklist de ativação lê os totens ativos dele.

export type { CodigoPareamentoGerado, CodigoPendente, DispositivoListado };

export function listarDispositivos(eventoId: string): Promise<Resultado<DispositivoListado[]>> {
  return chamar<DispositivoListado[]>("listarDispositivos", { eventoId });
}

/** Pede um relatório agora a todos os totens não revogados (ou a um só). Cada um responde em até uns 10 s, se estiver ligado. */
export function forcarSincronizacaoTotens(eventoId: string, dispositivoId?: string): Promise<Resultado<{ pedidos: number }>> {
  return chamar<{ pedidos: number }>("forcarSincronizacaoTotens", { eventoId, dispositivoId });
}

/** Gera o código de pareamento; o admin já define o nome e o PIN de saída do quiosque do totem. */
export async function gerarCodigoPareamento(
  eventoId: string,
  entrada: { nome: string; pin: string; categoriaIds: readonly string[] },
): Promise<Resultado<CodigoPareamentoGerado>> {
  return chamar<CodigoPareamentoGerado>("gerarCodigoPareamento", { eventoId, ...entrada });
}

/** Os códigos ainda à espera do tablet (25/11/2026: não vencem; o admin pode vê-los de novo). */
export function listarCodigosPareamento(eventoId: string): Promise<Resultado<CodigoPendente[]>> {
  return chamar<CodigoPendente[]>("listarCodigosPareamento", { eventoId });
}

/** Descarta um código que não vai ser usado: o tablet não consegue mais parear com ele. */
export function descartarCodigoPareamento(eventoId: string, codigoId: string): Promise<Resultado<null>> {
  return chamar<null>("descartarCodigoPareamento", { eventoId, codigoId });
}

/** As categorias que o totem exibe (ao menos uma, todas do totem). */
export async function alterarCategoriasDispositivo(eventoId: string, dispositivoId: string, categoriaIds: readonly string[]): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("alterarCategoriasDispositivo", { eventoId, dispositivoId, categoriaIds }));
}

async function aoMudar(r: Resultado<null>): Promise<Resultado<null>> {
  if (r.ok) await recarregarEstado();
  return r;
}

export async function pausarDispositivo(eventoId: string, dispositivoId: string): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("pausarDispositivo", { eventoId, dispositivoId }));
}

export async function reativarDispositivo(eventoId: string, dispositivoId: string): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("reativarDispositivo", { eventoId, dispositivoId }));
}

/** Definitivo: o servidor passa a rejeitar os votos do aparelho na hora. */
export async function revogarDispositivo(eventoId: string, dispositivoId: string, motivo?: string): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("revogarDispositivo", { eventoId, dispositivoId, motivo }));
}

export async function renomearDispositivo(eventoId: string, dispositivoId: string, nome: string): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("renomearDispositivo", { eventoId, dispositivoId, nome }));
}

export function alterarPinDispositivo(eventoId: string, dispositivoId: string, pin: string): Promise<Resultado<null>> {
  return chamar<null>("alterarPinDispositivo", { eventoId, dispositivoId, pin });
}

/** Liga ou desliga o módulo infantil do evento (ao desligar, o peso infantil volta a 0). */
export async function alternarModuloInfantil(eventoId: string, ligado: boolean): Promise<Resultado<null>> {
  return aoMudar(await chamar<null>("alternarModuloInfantil", { eventoId, ligado }));
}
