"use client";

import { votaveis } from "@/dominio/candidatos";
import { resolverEstadoVotar, type EstadoVotar } from "@/dominio/estadoVotar";
import { useAgora } from "../AppProvider";
import { useEventoAtivo } from "./evento";
import { useSessao } from "./sessao";

/** Gate de /votar do evento ativo (Etapa 4). null se não há evento. Os componentes não repetem a regra. */
export function useEstadoVotar(): EstadoVotar | null {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const agora = useAgora();
  if (!ativo) return null;
  return resolverEstadoVotar({
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
