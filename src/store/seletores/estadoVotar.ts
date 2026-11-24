"use client";

import { votaveis } from "@/dominio/candidatos";
import { itensDoCanal } from "@/dominio/categorias";
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
    // Só os da página: os itens das categorias do totem não são votados aqui (25/11/2026).
    qtdVotaveis: itensDoCanal(votaveis(ativo.candidatos), ativo.categorias, "ONLINE").length,
  });
}
