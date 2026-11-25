import type { CanalCategoria } from "@/dominio/tipos";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// Categorias do evento (Festival, 09/11/2026). Salva a lista inteira, na ordem recebida; quem valida, grava e audita é o servidor
// (src/server/categorias.ts). Criar, remover e trocar o endereço travam com a urna aberta; nome, prêmio e ordem, só ao concluir.

/**
 * `id` null: categoria nova. `premio`/`descricao` vazios: sem prêmio/descrição. O endereço é gerado do nome pelo servidor.
 * `canal` (25/11/2026): onde a categoria é votada, na página do evento ou só no totem.
 */
export type CategoriaEditada = {
  id: string | null;
  nome: string;
  premio: string;
  descricao: string;
  canal: CanalCategoria;
  /** D1 (25/11/2026): só na categoria nova, de qual categoria copiar os campos extras. */
  copiarCamposDe?: string | null;
  /** Telão (25/11/2026): quantos lugares a revelação mostra, em quais aparecem os votos e, no totem, a frase no lugar do QR Code. */
  podioTamanho?: number;
  podioVotos?: boolean[];
  mensagemTelao?: string | null;
};

/** Os itens da categoria (24/11/2026), a lista inteira: quem entra muda de categoria, quem sai fica sem categoria. */
export async function vincularCandidatosCategoria(eventoId: string, categoriaId: string, candidatoIds: readonly string[]): Promise<Resultado<null>> {
  const r = await chamar<null>("vincularCandidatosCategoria", { eventoId, categoriaId, candidatoIds });
  if (r.ok) await recarregarEstado();
  return r;
}

export async function salvarCategorias(eventoId: string, lista: readonly CategoriaEditada[]): Promise<Resultado<null>> {
  const r = await chamar<null>("salvarCategorias", { eventoId, lista });
  if (r.ok) await recarregarEstado();
  return r;
}
