"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import { resolverFasePalco, ROTULO_FASE_PALCO } from "@/dominio/apresentacao/fasePalco";
import { estadoInicialMotor, reduzirMotor } from "@/dominio/apresentacao/motor";
import { lerRevelacao } from "@/dominio/apresentacao/revelacao";
import { montarFinal, montarRoteiro } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, DadosRevelacao, EstadoMotor, EstadoTrailer } from "@/dominio/apresentacao/tipos";
import { votaveis } from "@/dominio/candidatos";
import { resolverFaseConfig } from "@/dominio/travas";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { useConsulta } from "@/lib/useConsulta";
import { carregarRevelacao, obterEstadoAoVivo, obterStatusResultado, registrarAcaoApresentacao, type AcaoApresentacao } from "@/servicos/apresentacao";
import { concluirRevelacao, definirModoAvancoLocal, gravarProgresso, iniciarRevelacao, refazerRevelacao } from "@/store/acoesApresentacao";
import { useStore } from "@/store/AppProvider";
import { usePreferenciasSala, useRevelacao } from "@/store/seletores/apresentacao";
import { useLerEstado, useDev } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { useVersaoResultado } from "@/store/seletores/resultado";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { CenaAtual, nomeDaCena, useCatalogo } from "./CenaAtual";
import { CenaAoVivo, CenaEncerrada, CenaMensagem, CenaPreVotacao, type SubestadoAoVivo } from "./cenas/CenasFase";
import { CenaFinal } from "./cenas/CenasRevelacao";
import { usePalcoTeclado, useTelaCheia, useTemporizadorDoPasso } from "./hooks";
import { Palco } from "./Palco";

// Etapa 8 (D2 a D7, 5.1): palco real. A fase vem de resolverFasePalco; o resultado só é carregado depois de
// iniciar a revelação (ou no final estático). Depois de carregado, a cerimônia nunca espera por serviço.

export function PalcoReal({
  urlQr,
  alternarTelaCheia,
  aoSair,
  aoDesligar,
}: {
  urlQr: string;
  alternarTelaCheia: () => void;
  aoSair: () => void;
  /** "Desligar" do controle remoto: a revelação em curso pausa antes da tela apagar. */
  aoDesligar: () => void;
}) {
  const ativo = useEventoAtivo()!;
  const { evento, tema, configApresentacao } = ativo;
  const eventoId = evento.id;
  const nome = tema.nomeExibicao ?? evento.nome;
  const agora = useAgora();
  const anunciar = useAnunciar();
  const dev = useDev();
  const lerEstado = useLerEstado();
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  const situacao = useSituacaoEvento({ ignorarRascunho: true });
  const { fase } = resolverFaseConfig(evento);
  const versao = useVersaoResultado(eventoId);
  const prefs = usePreferenciasSala(eventoId);
  const [mensagemHud, setMensagemHud] = useState<string | null>(null);
  const [ajuda, setAjuda] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [foraDaTelaCheia, setForaDaTelaCheia] = useState(false);
  const [carregado, setCarregado] = useState<DadosRevelacao | null>(null);
  const [trailer, setTrailer] = useState<{ cena: number; estado: EstadoTrailer }>({ cena: -1, estado: "CARREGANDO" });

  const status = useConsulta(() => obterStatusResultado(eventoId), { chave: `${eventoId}:${versao}` });
  const assinatura = status.dados?.assinatura ?? null;
  const existe = status.dados?.existe ?? versao !== null;
  const { revelacao } = useRevelacao(eventoId, assinatura);
  const fasePalco = resolverFasePalco({ fase, resultadoExiste: existe, revelacao });

  const aoVivo = useConsulta(() => obterEstadoAoVivo(eventoId), {
    // 08/10/2026: também na votação encerrada, para o total de votos; lá os números não mudam mais.
    ativo: fasePalco === "AO_VIVO" || fasePalco === "ENCERRADA_AGUARDANDO",
    intervaloMs: fasePalco === "AO_VIVO" ? 5000 : undefined,
    chave: `${eventoId}:${fasePalco}:${configApresentacao.parcialAoVivo}`,
  });

  const precisaResultado = fasePalco === "REVELACAO" || fasePalco === "FINAL_ESTATICO";
  const consultaResultado = useConsulta(() => carregarRevelacao(eventoId), {
    ativo: precisaResultado && carregado?.assinatura !== assinatura,
    chave: `${eventoId}:${assinatura}`,
  });
  const dados =
    carregado && carregado.assinatura === assinatura
      ? carregado
      : consultaResultado.dados && consultaResultado.dados.assinatura === assinatura
        ? consultaResultado.dados
        : null;

  const roteiro = useMemo(
    () => (dados ? montarRoteiro(dados.dados, { classificacaoCompleta: dados.config.classificacaoCompleta, modo: "REAL", candidatosNaDisputa: dados.candidatosNaDisputa }) : []),
    [dados],
  );
  const modoAvanco = prefs.modoAvancoLocal ?? configApresentacao.modoAvanco;
  const estadoMotor: EstadoMotor = revelacao
    ? {
        cena: revelacao.cena,
        passo: revelacao.passo,
        pausado: revelacao.pausado,
        modoAvanco,
        trailer: trailer.cena === revelacao.cena ? trailer.estado : "CARREGANDO",
        situacao: revelacao.situacao,
        emergencia: revelacao.emergencia,
      }
    : estadoInicialMotor(modoAvanco);

  function auditar(acao: AcaoApresentacao, cena?: number) {
    const v = dados?.versao ?? status.dados?.versao;
    if (!v) return;
    const r = registrarAcaoApresentacao(eventoId, acao, { versao: v, cena });
    if (!r.ok) setMensagemHud(`Auditoria não registrada: ${r.erro.mensagem}`);
  }

  /** Aplica o redutor sobre o progresso mais recente do store (handlers e timers podem se cruzar). */
  function despachar(acao: AcaoMotor) {
    const estado = lerEstado();
    const atual = lerRevelacao(estado.ui, estado.sessao.usuarioId, eventoId, assinatura).revelacao;
    if (!atual || roteiro.length === 0) return;
    const base: EstadoMotor = { ...estadoMotor, cena: atual.cena, passo: atual.passo, pausado: atual.pausado, situacao: atual.situacao, emergencia: atual.emergencia };
    const novo = reduzirMotor(base, acao, roteiro);
    if (novo === base) return;
    if (novo.modoAvanco !== base.modoAvanco) definirModoAvancoLocal(eventoId, novo.modoAvanco);
    setTrailer({ cena: novo.cena, estado: novo.trailer });
    gravarProgresso(eventoId, { cena: novo.cena, passo: novo.passo, pausado: novo.pausado, situacao: novo.situacao, emergencia: novo.emergencia });
    if (novo.situacao === "CONCLUIDA" && base.situacao !== "CONCLUIDA") auditar(novo.emergencia ? "EMERGENCIA_ACIONADA" : "REVELACAO_CONCLUIDA", novo.cena);
  }

  async function iniciar(irParaFinal: boolean) {
    const r = await carregarRevelacao(eventoId);
    if (!r.ok) return setMensagemHud("Não foi possível carregar o resultado. Tente de novo.");
    setMensagemHud(null);
    setCarregado(r.dados);
    iniciarRevelacao(eventoId, r.dados.assinatura);
    registrarAcaoApresentacao(eventoId, "REVELACAO_INICIADA", { versao: r.dados.versao });
    if (irParaFinal) {
      const final = montarRoteiro(r.dados.dados, { classificacaoCompleta: r.dados.config.classificacaoCompleta, modo: "REAL", candidatosNaDisputa: r.dados.candidatosNaDisputa }).length - 1;
      gravarProgresso(eventoId, { cena: final, passo: 0 });
      concluirRevelacao(eventoId, true);
      registrarAcaoApresentacao(eventoId, "EMERGENCIA_ACIONADA", { versao: r.dados.versao, cena: final });
    }
  }

  /**
   * 08/10/2026: a tela inicial da revelação é a de votação encerrada (fase de espera). Voltar no começo do trailer
   * desfaz a revelação e volta a ela; Avançar ali começa de novo pelo trailer.
   */
  function voltar() {
    if (estadoMotor.cena === 0 && estadoMotor.passo === 0) refazerRevelacao(eventoId);
    else despachar({ tipo: "VOLTAR" });
  }

  /** Reiniciar (controle remoto): a cerimônia volta à tela de votação encerrada. Auditado, como o "Refazer" da sala. */
  function reiniciar() {
    refazerRevelacao(eventoId);
    const v = dados?.versao ?? status.dados?.versao;
    if (v) registrarAcaoApresentacao(eventoId, "REVELACAO_REFEITA", { versao: v });
  }

  function desligar() {
    if (fasePalco === "REVELACAO" && !estadoMotor.pausado) despachar({ tipo: "PAUSAR" });
    aoDesligar();
  }

  const proximoAvancoEm = useTemporizadorDoPasso(estadoMotor, roteiro, despachar, fasePalco === "REVELACAO" && dados !== null);

  useTelaCheia(() => {
    setForaDaTelaCheia(true);
    if (fasePalco === "REVELACAO") despachar({ tipo: "PAUSAR" });
  });

  usePalcoTeclado({
    espaco: () => fasePalco === "REVELACAO" && despachar({ tipo: estadoMotor.pausado ? "RETOMAR" : "PAUSAR" }),
    avancar: () => {
      if (fasePalco === "ENCERRADA_AGUARDANDO" && existe) void iniciar(false);
      else if (fasePalco === "REVELACAO") despachar({ tipo: "AVANCAR" });
    },
    voltar: () => fasePalco === "REVELACAO" && voltar(),
    trailer: () => fasePalco === "REVELACAO" && despachar({ tipo: "PULAR_TRAILER" }),
    emergencia: () => {
      if (fasePalco === "REVELACAO") despachar({ tipo: "IR_PARA_FINAL" });
      else if (fasePalco === "ENCERRADA_AGUARDANDO" && existe) void iniciar(true);
      else if (fasePalco !== "FINAL_ESTATICO") setMensagemHud("Sem resultado para mostrar");
    },
    telaCheia: () => {
      setForaDaTelaCheia(false);
      alternarTelaCheia();
    },
    sair: () => (fasePalco === "REVELACAO" && estadoMotor.situacao === "EM_ANDAMENTO" ? setConfirmarSaida(true) : aoSair()),
    ajuda: () => setAjuda((v) => !v),
  });

  // Ajuda some sozinha.
  useEffect(() => {
    if (!ajuda) return;
    const t = setTimeout(() => setAjuda(false), DURACOES.ajudaVisivel);
    return () => clearTimeout(t);
  }, [ajuda]);

  // LiveRegion: só a fase e o nome da cena, nunca vencedores ou pontuações.
  const cenaAtual = fasePalco === "REVELACAO" ? roteiro[estadoMotor.cena] : undefined;
  const anuncio = cenaAtual ? nomeDaCena(cenaAtual) : fasePalco === "ENCERRADA_AGUARDANDO" ? TEXTOS_PALCO.votacaoEncerrada : ROTULO_FASE_PALCO[fasePalco];
  const ultimoAnuncio = useRef("");
  useEffect(() => {
    if (anuncio && anuncio !== ultimoAnuncio.current) anunciar(anuncio);
    ultimoAnuncio.current = anuncio;
  }, [anuncio, anunciar]);

  const candidatos = votaveis(ativo.candidatos).map((c) => ({ id: c.id, titulo: c.titulo, imagemUrl: c.imagemUrl, ordem: c.ordem }));
  const catalogo = useCatalogo(dados?.candidatos ?? candidatos);
  const dataEvento = evento.janelaInicio ? formatarDataHora(paraMs(evento.janelaInicio), evento.fusoHorario) : "";

  let conteudo;
  if (fasePalco === "PRE_VOTACAO") {
    const chamada =
      fase === "RASCUNHO"
        ? TEXTOS_PALCO.emBreve
        : !evento.janelaInicio
          ? TEXTOS_PALCO.aberturaADefinir
          : situacao === "ABERTURA_PENDENTE"
            ? TEXTOS_PALCO.aguardandoAbertura
            : TEXTOS_PALCO.emBreve;
    const contagem =
      fase !== "RASCUNHO" && evento.janelaInicio && situacao === "NAO_INICIADA" ? (
        <ContagemRegressiva alvoMs={paraMs(evento.janelaInicio)} rotulo={TEXTOS_PALCO.comecaEm} textoZerado={TEXTOS_PALCO.aguardandoAbertura} />
      ) : null;
    conteudo = <CenaPreVotacao nome={nome} logoUrl={tema.logoUrl} candidatos={candidatos} chamada={chamada} contagem={contagem} />;
  } else if (fasePalco === "AO_VIVO") {
    const abertaHa = evento.urnaAbertaEm ? agora - paraMs(evento.urnaAbertaEm) : Infinity;
    const subestado: SubestadoAoVivo =
      situacao === "TEMPO_ESGOTADO" ? "TEMPO_ESGOTADO" : situacao === "RETA_FINAL" ? "RETA_FINAL" : abertaHa <= DURACOES.mensagemAbertura ? "ABERTURA" : null;
    conteudo = (
      <CenaAoVivo
        nome={nome}
        logoUrl={tema.logoUrl}
        candidatos={candidatos}
        urlQr={urlQr}
        contagem={evento.janelaFim ? <ContagemRegressiva alvoMs={paraMs(evento.janelaFim)} rotulo="Encerra em" textoZerado={TEXTOS_PALCO.tempoEsgotado} /> : null}
        totalGeral={aoVivo.dados?.totalGeral ?? null}
        parcial={aoVivo.dados?.parcial ?? null}
        subestado={subestado}
      />
    );
  } else if (fasePalco === "SEM_RESULTADO") {
    conteudo = <CenaMensagem nome={nome} logoUrl={tema.logoUrl} texto={TEXTOS_PALCO.semResultado} />;
  } else if (fasePalco === "ENCERRADA_AGUARDANDO" || !dados) {
    conteudo = <CenaEncerrada nome={nome} logoUrl={tema.logoUrl} candidatos={candidatos} totalGeral={aoVivo.dados?.totalGeral ?? null} />;
  } else if (fasePalco === "FINAL_ESTATICO") {
    conteudo = <CenaFinal final={montarFinal(dados.dados)} catalogo={catalogo} config={dados.config} />;
  } else {
    conteudo = (
      <CenaAtual
        dados={dados}
        roteiro={roteiro}
        estado={estadoMotor}
        despachar={despachar}
        nome={nome}
        logoUrl={tema.logoUrl}
        dataEvento={dataEvento}
        simularTrailerFalha={dev.simularTrailerFalha}
      />
    );
  }

  const erroLeitura = aoVivo.erro || status.erro || consultaResultado.erro;
  const revelando = fasePalco === "REVELACAO";
  return (
    <>
      <Palco
        ensaio={false}
        nomeCena={revelando ? nomeDaCena(cenaAtual) : anuncio}
        progresso={revelando ? { cena: estadoMotor.cena + 1, total: roteiro.length } : null}
        proximoAvancoEm={revelando ? proximoAvancoEm : null}
        aoDesligar={desligar}
        mensagem={mensagemHud ?? (erroLeitura ? `Falha de leitura: ${erroLeitura.mensagem}. Mostrando o último dado.` : null)}
        ajudaVisivel={ajuda}
        avisoPausa={revelando && estadoMotor.pausado && foraDaTelaCheia}
        controles={{
          pausado: estadoMotor.pausado,
          alternarPausa: revelando ? () => despachar({ tipo: estadoMotor.pausado ? "RETOMAR" : "PAUSAR" }) : undefined,
          voltar: revelando ? voltar : undefined,
          avancar: revelando ? () => despachar({ tipo: "AVANCAR" }) : fasePalco === "ENCERRADA_AGUARDANDO" && existe ? () => void iniciar(false) : undefined,
          emergencia: revelando ? () => despachar({ tipo: "IR_PARA_FINAL" }) : fasePalco === "ENCERRADA_AGUARDANDO" && existe ? () => void iniciar(true) : undefined,
          reiniciar: revelacao && fase !== "CONCLUIDO" ? reiniciar : undefined,
          modoAvanco,
          alternarModo: () => {
            const modo = modoAvanco === "AUTOMATICO" ? "MANUAL" : "AUTOMATICO";
            if (usuarioId) definirModoAvancoLocal(eventoId, modo);
          },
        }}
      >
        {conteudo}
      </Palco>
      <DialogoConfirmacao
        aberto={confirmarSaida}
        aoFechar={() => setConfirmarSaida(false)}
        aoConfirmar={() => {
          setConfirmarSaida(false);
          aoSair();
        }}
        titulo="Sair da apresentação?"
        consequencia="A revelação fica salva nesta janela: dá para continuar de onde parou pela sala de controle."
        rotuloConfirmar="Sair"
        perigo={false}
      />
    </>
  );
}

