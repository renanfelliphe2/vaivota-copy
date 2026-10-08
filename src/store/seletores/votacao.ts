"use client";

import { useMemo } from "react";
import type { EstadoUiVotacao } from "@/dominio/tipos";
import { useStore } from "../AppProvider";

const VAZIO: EstadoUiVotacao = { chave: null, selecaoId: null, envio: "OCIOSO", falhaEnvio: null, ultimoVoto: null, aviso: null };

/**
 * Estado de tela do voto (Etapa 5, D1): lido como vazio quando a chave não bate com a sessão e o evento
 * atuais (trocar de usuário ou de evento nunca herda seleção, aviso ou sucesso). Referência estável.
 */
export function useSelecaoVoto(eventoId: string | null): EstadoUiVotacao {
  const votacao = useStore((e) => e.ui.votacao);
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  return useMemo(() => {
    if (!usuarioId || !eventoId || votacao.chave !== `${usuarioId}:${eventoId}`) return VAZIO;
    return votacao;
  }, [votacao, usuarioId, eventoId]);
}
