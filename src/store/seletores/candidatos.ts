"use client";

import { useMemo } from "react";
import { ordenarParaVotacao } from "@/dominio/ordemVotacao";
import { itensDoCanal } from "@/dominio/categorias";
import type { CampoCandidato, Candidato, CanalCategoria } from "@/dominio/tipos";
import { candidatoBloqueadoParaVoto } from "@/dominio/votoProprio";
import { useSementeOrdem } from "../AppProvider";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

export type ItemLista = { candidato: Candidato; bloqueadoVotoProprio: boolean };

export type CandidatosParaVotacao = {
  /** Votáveis na ordem do evento (19/10/2026): embaralhados a cada carga da página ou A–Z. A mesma para todos os papéis. */
  itens: ItemLista[];
  /** Campos extras do evento, ordenados por `ordem`. */
  campos: CampoCandidato[];
  total: number;
};

/**
 * Lista da votação (Etapa 4, seção 5.4; 08/10/2026: na entrada do evento, também para o visitante). Memoizada
 * no hook (D11 da Etapa 0): o tique de 1 s do relógio não muda a referência, e os cartões não re-renderizam.
 */
export function useCandidatosParaVotacao(canal?: CanalCategoria): CandidatosParaVotacao | null {
  const ativo = useEventoAtivo();
  const usuarioId = useSessao().usuario?.id ?? null;
  const semente = useSementeOrdem();

  return useMemo(() => {
    if (!ativo) return null;
    const { evento } = ativo;
    // `canal` (25/11/2026): a página do evento pede só os ONLINE; o júri avalia todos.
    const base = canal ? itensDoCanal(ativo.candidatos, ativo.categorias, canal) : ativo.candidatos;
    const itens = ordenarParaVotacao(base, evento, semente).map((candidato) => ({
      candidato,
      bloqueadoVotoProprio: usuarioId ? candidatoBloqueadoParaVoto(candidato, usuarioId, evento) : false,
    }));
    return { itens, campos: ativo.camposCandidato, total: itens.length };
  }, [ativo, usuarioId, semente, canal]);
}
