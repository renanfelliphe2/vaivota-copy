"use client";

import { useMemo } from "react";
import { ordenarParaVotacao } from "@/dominio/ordemVotacao";
import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import { candidatoBloqueadoParaVoto } from "@/dominio/votoProprio";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

export type ItemLista = { candidato: Candidato; bloqueadoVotoProprio: boolean };

export type CandidatosParaVotacao = {
  /** Votáveis na ordem do usuário (D4 da Etapa 4). */
  itens: ItemLista[];
  /** Campos extras do evento, ordenados por `ordem`. */
  campos: CampoCandidato[];
  total: number;
};

/**
 * Lista de /votar (Etapa 4, seção 5.4). Memoizada no hook (D11 da Etapa 0): o tique de 1 s do relógio
 * não muda a referência, e os cartões não re-renderizam.
 */
export function useCandidatosParaVotacao(): CandidatosParaVotacao | null {
  const ativo = useEventoAtivo();
  const usuarioId = useSessao().usuario?.id ?? null;

  return useMemo(() => {
    if (!ativo || !usuarioId) return null;
    const { evento } = ativo;
    const itens = ordenarParaVotacao(ativo.candidatos, usuarioId, evento.id).map((candidato) => ({
      candidato,
      bloqueadoVotoProprio: candidatoBloqueadoParaVoto(candidato, usuarioId, evento),
    }));
    return { itens, campos: ativo.camposCandidato, total: itens.length };
  }, [ativo, usuarioId]);
}
