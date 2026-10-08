"use client";

import { useEffect, useRef } from "react";
import { garantirParticipacao } from "@/servicos/auth";
import { abrirAcesso } from "@/store/acoesAcesso";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";

/**
 * C2: com sessão e sem participação no evento ativo, cria PUBLICO ao montar (quem já está logado e
 * chega a outro evento). Montado uma vez no EventoShell.
 */
export function GarantiaParticipacao() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const emAndamento = useRef<string | null>(null);
  const eventoId = ativo?.evento.id;
  const usuarioId = sessao.usuario?.id;
  const precisa = Boolean(eventoId && usuarioId && !sessao.participacao);

  useEffect(() => {
    if (!precisa || !eventoId || !usuarioId) return;
    const chave = `${usuarioId}:${eventoId}`;
    if (emAndamento.current === chave) return;
    emAndamento.current = chave;
    void garantirParticipacao(eventoId).finally(() => {
      if (emAndamento.current === chave) emAndamento.current = null;
    });
  }, [precisa, eventoId, usuarioId]);

  return null;
}

/** `?acesso=` da entrada: pede o diálogo de acesso aberto numa aba. */
export type IntencaoAcesso = "entrar" | "criar";

/**
 * Visitante que chega para entrar (guarda com `?de=`, "Voltar para entrar" e botão da página inicial com
 * `?acesso=`): abre o diálogo de acesso do cabeçalho, uma vez por chegada.
 */
export function AbrirAcessoAutomatico({ de, intencao }: { de?: string; intencao?: IntencaoAcesso }) {
  useEffect(() => {
    if (intencao) abrirAcesso(intencao, de);
    else if (de) abrirAcesso("entrar", de);
  }, [de, intencao]);
  return null;
}
