import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Categorias do evento (Festival, 09/11/2026). Salva a lista inteira, na ordem recebida; quem valida, grava e audita é o servidor
// (src/server/categorias.ts). Criar, remover e trocar o endereço travam com a urna aberta; nome, prêmio e ordem, só ao concluir.

/** `id` null: categoria nova. `premio` vazio: sem prêmio. */
export type CategoriaEditada = { id: string | null; nome: string; premio: string; slug: string };

export async function salvarCategorias(eventoId: string, lista: readonly CategoriaEditada[]): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarCategorias", { eventoId, lista });
  if (r.ok) await recarregarEstado();
  return r;
}
