"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ErroServico, Resultado } from "@/servicos/resultado";
import { useAmbiente } from "@/store/AppProvider";

// Leitura "de servidor" (D3, regra 6): polling opcional que pausa com a aba oculta e nunca acumula timers.

export type OpcoesConsulta = {
  /** Sem intervalo, consulta uma vez (e de novo em recarregar ou ao mudar a chave). */
  intervaloMs?: number;
  ativo?: boolean;
  /** Muda a chave para refazer a consulta (ex.: eventoId). */
  chave?: string;
};

export type EstadoConsulta<T> = {
  dados: T | null;
  erro: ErroServico | null;
  carregando: boolean;
  /** Instante simulado (ms) da última resposta. */
  atualizadoEm: number | null;
  recarregar: () => void;
};

export function useConsulta<T>(consulta: () => Promise<Resultado<T>>, opcoes: OpcoesConsulta = {}): EstadoConsulta<T> {
  const { intervaloMs, ativo = true, chave = "" } = opcoes;
  const { relogio } = useAmbiente();
  const consultaAtual = useRef(consulta);
  const [rodada, setRodada] = useState(0);
  const [estado, setEstado] = useState<Omit<EstadoConsulta<T>, "recarregar">>({
    dados: null,
    erro: null,
    carregando: ativo,
    atualizadoEm: null,
  });

  useEffect(() => {
    consultaAtual.current = consulta;
  });

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const agendar = () => {
      clearTimeout(timer);
      if (intervaloMs && !cancelado) timer = setTimeout(executar, intervaloMs);
    };

    async function executar() {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return; // retoma no visibilitychange
      const resposta = await consultaAtual.current();
      if (cancelado) return;
      setEstado((anterior) =>
        resposta.ok
          ? { dados: resposta.dados, erro: null, carregando: false, atualizadoEm: relogio.getAgora() }
          : { ...anterior, erro: resposta.erro, carregando: false, atualizadoEm: relogio.getAgora() },
      );
      agendar();
    }

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") void executar();
      else clearTimeout(timer);
    };

    void executar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      cancelado = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [ativo, intervaloMs, chave, rodada, relogio]);

  const recarregar = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, carregando: true }));
    setRodada((r) => r + 1);
  }, []);

  return { ...estado, recarregar };
}
