import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// "Sobre o evento" (demanda C2, 25/11/2026): título, texto e imagem no fim da página do evento. A imagem é enviada antes por
// `enviarImagemCandidato` (candidatosAdmin) e aqui entra só a URL devolvida.

export type DadosSobre = { titulo: string; texto: string; imagemUrl: string | null };

export async function salvarSobre(eventoId: string, dados: DadosSobre): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarSobre", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
