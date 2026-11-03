import type { DadosAvaliacaoJuri } from "@/dominio/avaliacaoJuri";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Configuração da avaliação do júri: forma de votação (voto único, notas por critério ou melhor por critério) e critérios.
// Trava com a urna aberta, como o placar; quem valida e audita é o servidor (src/server/juri.ts). Depois de salvar o estado
// público é recarregado: o modo e os critérios chegam ao navegador por ele.

export type { CriterioEditado, DadosAvaliacaoJuri } from "@/dominio/avaliacaoJuri";

export async function salvarAvaliacaoJuri(eventoId: string, dados: DadosAvaliacaoJuri): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarAvaliacaoJuri", { eventoId, dados });
  if (r.ok) await recarregarEstado();
  return r;
}
