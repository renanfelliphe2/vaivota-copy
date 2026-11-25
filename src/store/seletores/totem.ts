"use client";

import { useMemo } from "react";
import { votaveis } from "@/dominio/candidatos";
import { itensDoTotem, situacaoTotem, type DispositivoDoTotem, type SituacaoTotem } from "@/dominio/totem";
import type { Candidato, Categoria } from "@/dominio/tipos";
import { useEventoAtivo, type EventoAtivo } from "./evento";

export type VisaoTotem = {
  ativo: EventoAtivo;
  /** Aparelho pareado com este evento (lido do servidor pelo cookie do tablet); null se não houver ou se for de outro evento. */
  dispositivo: DispositivoDoTotem | null;
  candidatos: Candidato[];
  /** Os mesmos itens, por categoria (na ordem das categorias); só as que têm item. */
  grupos: GrupoTotem[];
  situacao: SituacaoTotem;
};

export type GrupoTotem = { categoria: Categoria; itens: Candidato[] };

/**
 * O que um totem mostra: os itens das categorias que ele exibe e a situação. Usada pelo quiosque e pelo preview do admin
 * (página Totens), para os dois mostrarem a mesma coisa.
 */
export function montarVisaoTotem(ativo: EventoAtivo, pareado: DispositivoDoTotem | null): VisaoTotem {
  const dispositivo = pareado && pareado.eventoId === ativo.evento.id ? pareado : null;
  // 25/11/2026: só os itens das categorias que este totem exibe (nunca os da página do evento), agrupados por categoria.
  const candidatos = dispositivo ? itensDoTotem(votaveis(ativo.candidatos), ativo.categorias, dispositivo.categoriaIds) : [];
  const grupos = ativo.categorias
    .map((categoria) => ({ categoria, itens: candidatos.filter((c) => c.categoriaId === categoria.id) }))
    .filter((g) => g.itens.length > 0);
  return { ativo, dispositivo, candidatos, grupos, situacao: situacaoTotem(ativo.evento, dispositivo, candidatos.length) };
}

/** Visão do quiosque: evento da URL, o aparelho pareado, os candidatos votáveis e a situação. */
export function useVisaoTotem(pareado: DispositivoDoTotem | null): VisaoTotem | null {
  const ativo = useEventoAtivo();
  return useMemo(() => (ativo ? montarVisaoTotem(ativo, pareado) : null), [ativo, pareado]);
}
