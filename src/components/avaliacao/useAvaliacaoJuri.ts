"use client";

import type { AvaliacaoJurado } from "@/dominio/avaliacaoJuri";
import type { ModoVotoJuri } from "@/dominio/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { consultarAvaliacaoJuri } from "@/servicos/avaliacaoJuri";

const VAZIA: AvaliacaoJurado = { notas: {}, escolhas: {} };

/**
 * Notas e escolhas do jurado logado (08/10/2026), lidas por serviço como o "Seu voto atual" (useVotoAtual).
 * A chave inclui o modo: trocar o modo pela toolbar refaz a leitura. Enquanto carrega, `avaliacao` é vazia.
 */
export function useAvaliacaoJuri(eventoId: string | null, usuarioId: string | null, modo: ModoVotoJuri, ativo: boolean) {
  const consulta = useConsulta(() => consultarAvaliacaoJuri({ eventoId: eventoId ?? "" }), {
    ativo: ativo && Boolean(eventoId && usuarioId),
    chave: `${usuarioId}:${eventoId}:${modo}`,
  });
  return {
    avaliacao: ativo ? (consulta.dados?.avaliacao ?? VAZIA) : VAZIA,
    carregando: ativo && consulta.carregando && !consulta.dados,
    erro: ativo ? consulta.erro : null,
    recarregar: consulta.recarregar,
  };
}
