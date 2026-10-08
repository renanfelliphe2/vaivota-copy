"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import type { DadosEnsaio } from "@/dominio/apresentacao/tipos";
import { obterDadosEnsaio } from "@/servicos/apresentacao";
import { definirPalcoAtivo } from "@/store/acoesApresentacao";
import { usePreferenciasSala } from "@/store/seletores/apresentacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { PalcoEnsaio } from "./PalcoEnsaio";
import { PalcoReal } from "./PalcoReal";
import { SalaControle } from "./SalaControle";

// Etapa 8: alterna sala e palco. O clique em Apresentar é o gesto que pede a tela cheia (sobre a raiz, para
// o Dialogo nativo continuar visível) e libera o áudio do trailer (C19). Não monta o SimuladorVotos (D15).

type Palco = { tipo: "REAL"; urlQr: string } | { tipo: "ENSAIO"; urlQr: string; dados: DadosEnsaio };

export function TelaApresentar() {
  const ativo = useEventoAtivo();
  const toast = useToast();
  const raiz = useRef<HTMLDivElement>(null);
  const [palco, setPalco] = useState<Palco | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [erroEnsaio, setErroEnsaio] = useState<string | null>(null);
  const prefs = usePreferenciasSala(ativo?.evento.id ?? "");

  // Sair da rota sempre desliga o palco.
  useEffect(() => () => definirPalcoAtivo(false), []);

  if (!ativo) return null;
  const eventoId = ativo.evento.id;
  const modoAvanco = prefs.modoAvancoLocal ?? ativo.configApresentacao.modoAvanco;

  function entrarTelaCheia() {
    const el = raiz.current;
    if (!el?.requestFullscreen) return toast("Não foi possível entrar em tela cheia. A apresentação segue em janela", "erro");
    el.requestFullscreen().catch(() => toast("Não foi possível entrar em tela cheia. A apresentação segue em janela", "erro"));
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else entrarTelaCheia();
  }

  async function apresentar() {
    const urlQr = `${window.location.origin}/e/${ativo!.slug}`;
    setErroEnsaio(null);
    if (prefs.modoSala === "ENSAIO") {
      entrarTelaCheia();
      setPreparando(true);
      const cenarios = cenariosDoEnsaio(eventoId);
      const cenarioId = prefs.cenarioEnsaioId && cenarios.includes(prefs.cenarioEnsaioId) ? prefs.cenarioEnsaioId : cenarios[0];
      const r = await obterDadosEnsaio(eventoId, cenarioId);
      setPreparando(false);
      if (!r.ok) {
        if (document.fullscreenElement) void document.exitFullscreen();
        return setErroEnsaio(r.erro.mensagem);
      }
      definirPalcoAtivo(true);
      setPalco({ tipo: "ENSAIO", urlQr, dados: r.dados });
      return;
    }
    entrarTelaCheia();
    definirPalcoAtivo(true);
    setPalco({ tipo: "REAL", urlQr });
  }

  function sair() {
    setPalco(null);
    definirPalcoAtivo(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  }

  return (
    <div ref={raiz} className="flex flex-1 flex-col bg-tema-fundo">
      {palco === null ? (
        <main id="conteudo" className="flex-1">
          <SalaControle aoApresentar={() => void apresentar()} preparando={preparando} erroEnsaio={erroEnsaio} />
        </main>
      ) : palco.tipo === "REAL" ? (
        <PalcoReal urlQr={palco.urlQr} alternarTelaCheia={alternarTelaCheia} aoSair={sair} />
      ) : (
        <PalcoEnsaio dados={palco.dados} modoInicial={modoAvanco} urlQr={palco.urlQr} alternarTelaCheia={alternarTelaCheia} aoSair={sair} />
      )}
    </div>
  );
}
