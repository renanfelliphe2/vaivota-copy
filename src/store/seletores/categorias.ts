"use client";

import { useMemo } from "react";
import { categoriasDoCanal } from "@/dominio/categorias";
import type { Categoria } from "@/dominio/tipos";
import { useCandidatosParaVotacao, type ItemLista } from "./candidatos";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

export type CategoriaComItens = {
  categoria: Categoria;
  /** Votáveis da categoria, na ordem da votação (a mesma da lista do evento: embaralhada a cada carga ou A–Z). */
  itens: ItemLista[];
  /** A pessoa já votou nesta categoria (só o SE; nunca em quem). Sempre false nas do totem. */
  votou: boolean;
  /** Categoria do totem (25/11/2026): aparece na página do evento só para divulgar os itens; o voto é só nos totens. */
  soTotem: boolean;
};

/**
 * Categorias do evento ativo (09/11/2026), na ordem, cada uma com os seus votáveis e se a pessoa já votou nela. Vazio em evento
 * sem categorias; null sem evento. Memoizado: o tique do relógio não muda a referência.
 * Por padrão só as da página (as do totem são votadas só nos totens); `incluirTotem` traz também as do totem, na mesma ordem,
 * marcadas com `soTotem` (demanda A3: a landing as mostra, sem voto).
 */
export function useCategoriasDoEvento({ incluirTotem = false }: { incluirTotem?: boolean } = {}): CategoriaComItens[] | null {
  const ativo = useEventoAtivo();
  const lista = useCandidatosParaVotacao();
  const { categoriasVotadas } = useSessao();
  return useMemo(() => {
    if (!ativo || !lista) return null;
    const categorias = incluirTotem ? ativo.categorias : categoriasDoCanal(ativo.categorias, "ONLINE");
    return categorias.map((categoria) => {
      const soTotem = categoria.canal === "TOTEM";
      return {
        categoria,
        itens: lista.itens.filter((i) => i.candidato.categoriaId === categoria.id),
        votou: !soTotem && categoriasVotadas.includes(categoria.id),
        soTotem,
      };
    });
  }, [ativo, lista, categoriasVotadas, incluirTotem]);
}
