"use client";

import { useMemo } from "react";
import type { Categoria } from "@/dominio/tipos";
import { useCandidatosParaVotacao, type ItemLista } from "./candidatos";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

export type CategoriaComItens = {
  categoria: Categoria;
  /** Votáveis da categoria, na ordem da votação (a mesma da lista do evento: embaralhada a cada carga ou A–Z). */
  itens: ItemLista[];
  /** A pessoa já votou nesta categoria (só o SE; nunca em quem). */
  votou: boolean;
};

/**
 * Categorias do evento ativo (09/11/2026), na ordem, cada uma com os seus votáveis e se a pessoa já votou nela. Vazio em evento
 * sem categorias; null sem evento. Memoizado: o tique do relógio não muda a referência.
 */
export function useCategoriasDoEvento(): CategoriaComItens[] | null {
  const ativo = useEventoAtivo();
  const lista = useCandidatosParaVotacao();
  const { categoriasVotadas } = useSessao();
  return useMemo(() => {
    if (!ativo || !lista) return null;
    return ativo.categorias.map((categoria) => ({
      categoria,
      itens: lista.itens.filter((i) => i.candidato.categoriaId === categoria.id),
      votou: categoriasVotadas.includes(categoria.id),
    }));
  }, [ativo, lista, categoriasVotadas]);
}
