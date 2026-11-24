import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Parceiros do evento (08/10/2026): faixa do telão antes da revelação e página do evento. Identidade visual, então segue a trava do
// tema (livre até o evento ser concluído). Salva a lista inteira, na ordem recebida; quem valida, grava e audita é o servidor
// (src/server/parceiros.ts). O logo é enviado antes por `enviarImagemCandidato` (candidatosAdmin) e aqui entra só a URL devolvida.
// 25/11/2026 (demanda C1): junto vão os grupos, na ordem, e em quais deles cada parceiro está.

/** `id` null: grupo novo. `chave`: como os parceiros apontam para o grupo (o id, se já existe; senão uma chave local). */
export type GrupoEditado = { id: string | null; chave: string; nome: string };

/** `id` null: parceiro novo. `grupos`: as chaves dos grupos em que ele está. */
export type ParceiroEditado = { id: string | null; nome: string; logoUrl: string | null; linkUrl?: string | null; grupos?: string[] };

export type DadosParceiros = { grupos: GrupoEditado[]; parceiros: ParceiroEditado[] };

export async function salvarParceiros(eventoId: string, dados: DadosParceiros): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarParceiros", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
