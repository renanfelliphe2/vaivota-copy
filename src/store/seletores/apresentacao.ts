"use client";

import { useMemo } from "react";
import { chaveApresentacao, lerRevelacao } from "@/dominio/apresentacao/revelacao";
import type { EstadoUiApresentacao } from "@/dominio/tipos";
import { criarApresentacaoInicial } from "@/mocks/criarEstadoNucleo";
import { useStore } from "../AppProvider";

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
