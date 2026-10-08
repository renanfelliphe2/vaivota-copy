"use client";

import { useConsulta } from "@/lib/useConsulta";
import { consultarEstadoVoto } from "@/servicos/votacao";

/**
 * "Seu voto atual" do jurado (Etapa 5, seção 5.8): consultarEstadoVoto com useConsulta, só para JURADO.
 * Enquanto carrega ou se falhar, a lista funciona sem o selo (o serviço revalida: SEM_ALTERACAO).
 */
export function useVotoAtual(eventoId: string | null, usuarioId: string | null, ativo: boolean) {
  const consulta = useConsulta(() => consultarEstadoVoto({ eventoId: eventoId ?? "" }), {
    ativo: ativo && Boolean(eventoId && usuarioId),
    chave: `${usuarioId}:${eventoId}`,
  });
  return { candidatoAtualId: ativo ? (consulta.dados?.candidatoAtualId ?? null) : null, recarregar: consulta.recarregar };
}
