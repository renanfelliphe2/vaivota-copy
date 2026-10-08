"use client";

import { Maximize, MonitorPlay } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { useToast } from "@/components/ui/Toast";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import type { DadosEnsaio } from "@/dominio/apresentacao/tipos";
import { useConsulta } from "@/lib/useConsulta";
import { obterDadosEnsaio } from "@/servicos/apresentacao";
import { definirPalcoAtivo } from "@/store/acoesApresentacao";
import { useTelaoPublicado, type EstadoTelao } from "@/store/canalTelao";
import { usePreferenciasSala } from "@/store/seletores/apresentacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { PalcoEnsaio } from "./PalcoEnsaio";
import { PalcoReal } from "./PalcoReal";

// 08/10/2026: o palco na aba do telão, aberto pelo "Apresentar" da sala (abrirPalco) e comandado pelo controle
// remoto (ControleRemoto, em qualquer aba do admin). O navegador só deixa entrar em tela cheia com um gesto nesta
// aba: por isso o palco espera um clique, que também libera o áudio do trailer (C19). Depois disso, nada aqui
// precisa de mouse: Desligar apaga a tela (preta, com a logo) sem fechar a aba, e Ligar volta pausado.
// Na própria janela, os atalhos de teclado continuam valendo; Q fecha a aba.

type Situacao = "AGUARDANDO" | "LIGADO" | "DESLIGADO" | "ENCERRADO";

export function TelaPalco() {
  const ativo = useEventoAtivo();
  const toast = useToast();
  const params = useSearchParams();
  const raiz = useRef<HTMLDivElement>(null);
  const [situacao, setSituacao] = useState<Situacao>("AGUARDANDO");
  /** Religado pelo controle: o ensaio (que é local e recomeça) volta pausado. */
  const [religado, setReligado] = useState(false);
  const prefs = usePreferenciasSala(ativo?.evento.id ?? "");
  const eventoId = ativo?.evento.id ?? "";
  const ensaio = params.get("modo") === "ensaio";
  const cenarios = ensaio ? cenariosDoEnsaio(eventoId) : [];
  const pedido = params.get("cenario");
  const cenarioId = pedido && cenarios.includes(pedido) ? pedido : (cenarios[0] ?? "");
  const dadosEnsaio = useConsulta<DadosEnsaio>(() => obterDadosEnsaio(eventoId, cenarioId), {
    ativo: ensaio && Boolean(eventoId && cenarioId),
    chave: `${eventoId}:${cenarioId}`,
    emSegundoPlano: true,
  });

  // Nesta aba o palco está sempre no ar: some cabeçalho e toolbar. Só nesta aba (sincronizarAbas).
  useEffect(() => {
    definirPalcoAtivo(true);
    return () => definirPalcoAtivo(false);
  }, []);

  if (!ativo) return null;
  const urlQr = `${window.location.origin}/e/${ativo.slug}`;
  const modoAvanco = prefs.modoAvancoLocal ?? ativo.configApresentacao.modoAvanco;
  const ensaioPronto = !ensaio || dadosEnsaio.dados !== null;
  const nome = ativo.tema.nomeExibicao ?? ativo.evento.nome;

  function entrarTelaCheia() {
    const el = raiz.current;
    if (!el?.requestFullscreen) return toast("Não foi possível entrar em tela cheia. A apresentação segue em janela", "erro");
    el.requestFullscreen().catch(() => toast("Não foi possível entrar em tela cheia. A apresentação segue em janela", "erro"));
  }

  function alternarTelaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else entrarTelaCheia();
  }

  /** Clique no telão: palco no ar, em tela cheia ou em janela (a tela cheia é opcional). */
  function iniciar(telaCheia: boolean) {
    if (telaCheia) entrarTelaCheia();
    setReligado(false);
    setSituacao("LIGADO");
  }

  /** "Ligar" do controle (sem gesto aqui, não pede tela cheia; se já estava, continua). Só religar volta pausado. */
  function ligar() {
    if (!ensaioPronto) return;
    setReligado(situacao === "DESLIGADO");
    setSituacao("LIGADO");
  }

  /** Q no telão: fecha a aba (aberta por script, o navegador deixa). Se não fechar, fica o aviso. */
  function sair() {
    if (document.fullscreenElement) void document.exitFullscreen();
    setSituacao("ENCERRADO");
    window.close();
  }

  let conteudo;
  if (situacao === "LIGADO" && ensaio && dadosEnsaio.dados) {
    conteudo = (
      <PalcoEnsaio
        dados={dadosEnsaio.dados}
        modoInicial={modoAvanco}
        urlQr={urlQr}
        alternarTelaCheia={alternarTelaCheia}
        aoSair={sair}
        aoDesligar={() => setSituacao("DESLIGADO")}
        iniciarPausado={religado}
      />
    );
  } else if (situacao === "LIGADO") {
    conteudo = <PalcoReal urlQr={urlQr} alternarTelaCheia={alternarTelaCheia} aoSair={sair} aoDesligar={() => setSituacao("DESLIGADO")} />;
  } else if (situacao === "DESLIGADO") {
    conteudo = (
      <main id="conteudo" aria-label="Telão desligado" className="relative flex-1 bg-black">
        <Publicar estado={{ situacao: "DESLIGADO", ensaio }} aoLigar={ligar} />
        <div className="absolute bottom-8 right-10 opacity-70">
          <LogoEvento nome={nome} logoUrl={ativo.tema.logoUrl} className="h-16" />
        </div>
      </main>
    );
  } else {
    const encerrado = situacao === "ENCERRADO";
    conteudo = (
      <main id="conteudo" className="flex flex-1 items-center justify-center px-6 py-16">
        <Publicar estado={{ situacao: "AGUARDANDO_CLIQUE", ensaio }} aoLigar={ligar} />
        <div className="flex max-w-xl flex-col items-center gap-6 text-center">
          <MonitorPlay aria-hidden className="size-16 text-tema-primaria-texto" />
          <h1 className="text-3xl font-bold">{encerrado ? "Apresentação encerrada" : ensaio ? "Telão pronto (ensaio)" : "Telão pronto"}</h1>
          <p className="text-lg text-tema-texto-suave">
            {encerrado
              ? "Pode fechar esta aba."
              : "Arraste esta janela para o monitor do telão e entre em tela cheia, ou apresente em janela (por exemplo, para testar com uma tela só). Depois, comande tudo pelo controle remoto, nas outras abas."}
          </p>
          {dadosEnsaio.erro && <Alerta variante="erro">{dadosEnsaio.erro.mensagem}</Alerta>}
          {!ensaioPronto && !dadosEnsaio.erro ? (
            <Carregando texto="Preparando o ensaio…" />
          ) : (
            <div className="flex flex-wrap justify-center gap-3">
              <Botao tamanho="grande" onClick={() => iniciar(true)} disabled={!ensaioPronto} icone={<Maximize aria-hidden className="size-5" />}>
                {encerrado ? "Apresentar de novo" : "Entrar em tela cheia"}
              </Botao>
              <Botao tamanho="grande" variante="contorno" onClick={() => iniciar(false)} disabled={!ensaioPronto} icone={<MonitorPlay aria-hidden className="size-5" />}>
                Apresentar em janela
              </Botao>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <div ref={raiz} className="flex flex-1 flex-col bg-tema-fundo">
      {conteudo}
    </div>
  );
}

/** Fora do palco (aguardando ou desligado), quem conta o estado ao controle remoto é esta aba; só Ligar vale. */
function Publicar({ estado, aoLigar }: { estado: EstadoTelao; aoLigar: () => void }) {
  useTelaoPublicado(estado, (comando) => {
    if (comando === "LIGAR") aoLigar();
  });
  return null;
}
