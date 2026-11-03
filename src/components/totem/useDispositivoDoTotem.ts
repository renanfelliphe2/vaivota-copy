"use client";

import { useConsulta } from "@/lib/useConsulta";
import { obterEstadoTotem } from "@/servicos/totem";

/** De quanto em quanto tempo o quiosque pergunta ao servidor como está o aparelho (pausa e revogação chegam por aqui). */
export const INTERVALO_ESTADO_TOTEM_MS = 10_000;

/**
 * O totem deste aparelho, lido do servidor pelo cookie. `carregando` só na primeira leitura (sem ela o quiosque piscaria
 * "não pareado"); `semConexao` quando nunca houve resposta. Depois da primeira resposta, uma falha de rede mantém o último
 * estado conhecido, e o servidor continua a valer a cada voto.
 */
export function useDispositivoDoTotem(eventoId: string | null) {
  const consulta = useConsulta(() => obterEstadoTotem(), { intervaloMs: INTERVALO_ESTADO_TOTEM_MS, chave: eventoId ?? "", ativo: eventoId !== null });
  return {
    dispositivo: consulta.dados?.dispositivo ?? null,
    carregando: consulta.dados === null && consulta.erro === null,
    semConexao: consulta.dados === null && consulta.erro !== null,
    recarregar: consulta.recarregar,
  };
}
