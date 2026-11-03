import type { CodigoGerado, ConviteListado } from "@/dominio/convites";
import type { Instante } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Festival: convites do júri. Toda regra (trava da fase, validação, hash do código, auditoria) mora no servidor
// (src/server/convites.ts). O código legível volta UMA vez, na resposta da geração; a lista nunca traz hash nem e-mail.
// Depois de gerar ou revogar, o estado público é recarregado: o checklist de ativação e a trava do módulo júri leem dele.

export type { CodigoGerado, ConviteListado };

export function listarConvites(eventoId: string): Promise<Resultado<ConviteListado[]>> {
  return chamar<ConviteListado[]>("listarConvites", { eventoId });
}

export async function gerarConvites(
  eventoId: string,
  entrada: { quantidade: number; rotuloBase?: string; validadeAte: Instante | null },
): Promise<Resultado<{ codigos: CodigoGerado[] }>> {
  const r = await chamar<{ codigos: CodigoGerado[] }>("gerarConvites", { eventoId, ...entrada });
  if (r.ok) await recarregarEstado();
  return r;
}

/** "Baixar CSV": audita a exportação; nunca recebe nem registra códigos. */
export function registrarExportacaoConvites(eventoId: string, quantidade: number): Promise<Resultado<null>> {
  return chamar<null>("registrarExportacaoConvites", { eventoId, quantidade });
}

export function renomearConvite(eventoId: string, conviteId: string, rotulo: string): Promise<Resultado<null>> {
  return chamar<null>("renomearConvite", { eventoId, conviteId, rotulo });
}

/** Só convite disponível (inclui o expirado). O substituto mantém o rótulo e, se ainda no futuro, a validade. */
export async function revogarConvite(
  eventoId: string,
  conviteId: string,
  opcoes: { gerarSubstituto: boolean; motivo?: string },
): Promise<Resultado<{ substituto: CodigoGerado | null }>> {
  const r = await chamar<{ substituto: CodigoGerado | null }>("revogarConvite", { eventoId, conviteId, ...opcoes });
  if (r.ok) await recarregarEstado();
  return r;
}
