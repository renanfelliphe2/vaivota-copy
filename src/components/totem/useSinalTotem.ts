"use client";

import { useEffect, useRef } from "react";
import { SINCRONIZACAO_TOTEM, type SituacaoTotem } from "@/dominio/totem";
import { sincronizarTotem } from "@/servicos/totem";

/**
 * Sincronização do totem com a página Totens do admin (24/11/2026). O aparelho manda um relatório (o que a tela mostra e se está em
 * tela cheia):
 * - ao abrir o quiosque já pareado;
 * - a cada hora, sozinho;
 * - quando o que a tela mostra muda (a urna abriu, o admin pausou...) ou a tela cheia liga ou desliga;
 * - quando o admin aperta "Forçar sincronização": o pedido chega na consulta de estado, a cada 10 s. Se o relatório falhar, o pedido
 *   continua pendente no servidor e a consulta seguinte tenta de novo.
 * Um envio por vez: o que chegar durante um envio sai logo depois, com o estado mais novo.
 */
export function useSinalTotem(entrada: { pareado: boolean; situacao: SituacaoTotem; sincronizar: boolean; respostaEm: number | null }) {
  const { pareado, situacao, sincronizar, respostaEm } = entrada;
  const situacaoAtual = useRef(situacao);
  const enviando = useRef(false);
  const deNovo = useRef(false);
  const enviar = useRef<() => void>(() => {});

  useEffect(() => {
    situacaoAtual.current = situacao;
  });

  useEffect(() => {
    enviar.current = () => {
      if (enviando.current) {
        deNovo.current = true;
        return;
      }
      enviando.current = true;
      void sincronizarTotem({ situacao: situacaoAtual.current, telaCheia: document.fullscreenElement !== null }).finally(() => {
        enviando.current = false;
        if (deNovo.current) {
          deNovo.current = false;
          enviar.current();
        }
      });
    };
  }, []);

  // Ao abrir, a cada hora e ao ligar ou desligar a tela cheia.
  useEffect(() => {
    if (!pareado) return;
    enviar.current();
    const timer = setInterval(() => enviar.current(), SINCRONIZACAO_TOTEM.intervaloMs);
    const aoMudarTelaCheia = () => enviar.current();
    document.addEventListener("fullscreenchange", aoMudarTelaCheia);
    return () => {
      clearInterval(timer);
      document.removeEventListener("fullscreenchange", aoMudarTelaCheia);
    };
  }, [pareado]);

  // A tela passou a mostrar outra coisa (o primeiro valor já saiu no envio de abertura).
  const situacaoEnviada = useRef<SituacaoTotem | null>(null);
  useEffect(() => {
    if (!pareado) return;
    if (situacaoEnviada.current !== null && situacaoEnviada.current !== situacao) enviar.current();
    situacaoEnviada.current = situacao;
  }, [pareado, situacao]);

  // Pedido do admin, visto na consulta de estado.
  useEffect(() => {
    if (pareado && sincronizar) enviar.current();
  }, [pareado, sincronizar, respostaEm]);
}
