import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Parceiros do evento (08/10/2026): faixa do telão antes da revelação e página do evento. Identidade visual, então segue a trava do
// tema (livre até o evento ser concluído). Salva a lista inteira, na ordem recebida; quem valida, grava e audita é o servidor
// (src/server/parceiros.ts). O logo é enviado antes por `enviarImagemCandidato` (candidatosAdmin) e aqui entra só a URL devolvida.

/** `id` null: parceiro novo. */
export type ParceiroEditado = { id: string | null; nome: string; logoUrl: string | null };

export async function salvarParceiros(eventoId: string, lista: readonly ParceiroEditado[]): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarParceiros", { eventoId, lista });
  if (r.ok) await recarregarEstado();
  return r;
}
