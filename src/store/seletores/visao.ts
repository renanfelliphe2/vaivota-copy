"use client";

import { votaveis } from "@/dominio/candidatos";
import { resolverVisaoEvento, type SaidaVisao } from "@/dominio/visaoEvento";
import { useAgora } from "../AppProvider";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

/** Variante e ação da entrada do evento ativo (Etapa 2). Os componentes não repetem a regra. */
export function useVisaoEvento(): SaidaVisao | null {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const agora = useAgora();
  if (!ativo) return null;
  return resolverVisaoEvento({
    evento: ativo.evento,
    configApresentacao: ativo.configApresentacao,
    agoraMs: agora,
    sessao: {
      logado: sessao.logado,
      papel: sessao.papel,
      emailVerificado: sessao.emailVerificado,
      jaVotou: sessao.jaVotou,
    },
    qtdVotaveis: votaveis(ativo.candidatos).length,
  });
}
