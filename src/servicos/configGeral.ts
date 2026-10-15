import type { Evento } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST7: seção Geral (nome, descrição, janela). O servidor valida por campo alterado e pela fase do evento
// (src/server/configuracao.ts). O método de identificação fica por seed.

export type PatchGeral = Partial<
  Pick<Evento, "nome" | "slug" | "descricao" | "janelaInicio" | "janelaFim" | "fusoHorario" | "encerramentoAutomatico">
>;

export async function salvarGeral(eventoId: string, patch: PatchGeral, motivo?: string): Promise<Resultado<{ slug: string }>> {
  const r = await chamar<{ slug: string }>("salvarGeral", { eventoId, patch, motivo });
  if (r.ok) await recarregarEstado();
  return r;
}
