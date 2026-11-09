"use client";

import { useMemo } from "react";
import { chaveApresentacao, lerRevelacao } from "@/dominio/apresentacao/revelacao";
import { categoriaApresentada } from "@/dominio/categorias";
import type { Categoria, EstadoUiApresentacao } from "@/dominio/tipos";
import { criarApresentacaoInicial } from "../estadoInicial";
import { useStore } from "../AppProvider";
import { useEventoAtivo } from "./evento";

/** Etapa 8 (D4): revelação válida para a sessão, o evento e a assinatura atuais. */
export function useRevelacao(eventoId: string, assinaturaAtual: string | null) {
  const apresentacao = useStore((e) => e.ui.apresentacao);
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  return useMemo(() => lerRevelacao({ apresentacao }, usuarioId, eventoId, assinaturaAtual), [apresentacao, usuarioId, eventoId, assinaturaAtual]);
}

/** Preferências da sala (modo, cenário, avanço) só da chave atual; senão o valor inicial. */
export function usePreferenciasSala(eventoId: string): EstadoUiApresentacao {
  const apresentacao = useStore((e) => e.ui.apresentacao);
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  return useMemo(
    () => (usuarioId && apresentacao.chave === chaveApresentacao(usuarioId, eventoId) ? apresentacao : criarApresentacaoInicial()),
    [apresentacao, usuarioId, eventoId],
  );
}

/**
 * Evento com categorias (09/11/2026): a categoria que o telão apresenta (a escolhida na sala, ou a primeira), a mesma em todas
 * as abas. null em evento sem categorias.
 */
export function useCategoriaApresentada(eventoId: string): Categoria | null {
  const prefs = usePreferenciasSala(eventoId);
  const categorias = useEventoAtivo()?.categorias;
  return useMemo(() => {
    if (!categorias) return null;
    const id = categoriaApresentada(prefs.categoriaId, categorias);
    return categorias.find((c) => c.id === id) ?? null;
  }, [prefs.categoriaId, categorias]);
}
