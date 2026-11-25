"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import { resolverFasePalco, ROTULO_FASE_PALCO } from "@/dominio/apresentacao/fasePalco";
import { estadoInicialMotor, reduzirMotor } from "@/dominio/apresentacao/motor";
import { lerRevelacao } from "@/dominio/apresentacao/revelacao";
import { MENSAGEM_TOTEM_PADRAO } from "@/dominio/apresentacao/cerimonia";
import { montarFinal, montarRoteiro } from "@/dominio/apresentacao/roteiro";
import type { AcaoMotor, DadosRevelacao, EstadoMotor, EstadoTrailer } from "@/dominio/apresentacao/tipos";
import { votaveis } from "@/dominio/candidatos";
import { rotaCategoria } from "@/dominio/categorias";
import { categoriaDoTelao } from "@/dominio/telao";
import { resolverFaseConfig } from "@/dominio/travas";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { useConsulta } from "@/lib/useConsulta";
import { carregarRevelacao, obterEstadoAoVivo, obterStatusResultado, registrarAcaoApresentacao, type AcaoApresentacao } from "@/servicos/apresentacao";
import { concluirRevelacao, definirModoAvancoLocal, gravarProgresso, iniciarRevelacao, refazerRevelacao } from "@/store/acoesApresentacao";
import { useStore } from "@/store/AppProvider";
import { useCategoriaApresentada, usePreferenciasSala, useRevelacao } from "@/store/seletores/apresentacao";
import { useLerEstado, useDev } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { useVersaoResultado } from "@/store/seletores/resultado";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { CenaAtual, nomeDaCena, useContextoCerimonia } from "./CenaAtual";
import { CenaAoVivo, CenaEncerrada, CenaMensagem, CenaPreVotacao, type SubestadoAoVivo } from "./telao/CenasVotacao";
import { CenaFinal } from "./telao/CenasCerimonia";
import { creditosDosParceiros } from "./telao/creditos";
import { usePalcoTeclado, useTemporizadorDoPasso } from "./hooks";
import { Palco } from "./Palco";

/** "28 nov · 20h" no fuso do evento (o canhoto do ingresso). */
function fimPorExtenso(ms: number, fuso: string): string {
  const partes = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: fuso }).formatToParts(new Date(ms));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  const minuto = p("minute");
  return `${p("day")} ${p("month").replace(".", "")} · ${p("hour")}h${minuto === "00" ? "" : minuto}`;
}

/** Com a urna encerrada o telão pergunta de novo se há resultado (e qual a assinatura): ele pode surgir ou mudar de versão. */
const INTERVALO_STATUS_MS = 10_000;

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
  // Evento com categorias (09/11/2026): o telão apresenta uma categoria por vez (escolhida na sala): o nome dela vai junto, e os
  // itens, o status e a revelação são só dela.
  const categoria = useCategoriaApresentada(eventoId);
  const categoriaId = categoria?.id ?? null;
  // Cerimônia (25/11/2026): a revelação é do evento inteiro; a categoria escolhida na sala só vale fora da votação aberta.
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
  const [carregado, setCarregado] = useState<DadosRevelacao | null>(null);
  const [trailer, setTrailer] = useState<{ cena: number; estado: EstadoTrailer }>({ cena: -1, estado: "CARREGANDO" });

  // 08/10/2026: emSegundoPlano em todas: com uma tela só, o telão fica numa aba de fundo enquanto o controle comanda.
  // O resultado nasce no encerramento e pode ganhar versão nova (desqualificação) com o telão aberto, e o estado do navegador não
  // traz o resultado: a fase entra na chave e, com a urna encerrada, o status é perguntado de novo de tempos em tempos.
  const status = useConsulta(() => obterStatusResultado(eventoId), {
    chave: `${eventoId}:${versao}:${fase}`,
    intervaloMs: fase === "URNA_ENCERRADA" ? INTERVALO_STATUS_MS : undefined,
    emSegundoPlano: true,
  });
  const assinatura = status.dados?.assinatura ?? null;
  const existe = status.dados?.existe ?? versao !== null;
  const { revelacao } = useRevelacao(eventoId, assinatura);
  const fasePalco = resolverFasePalco({ fase, resultadoExiste: existe, revelacao });

  const aoVivo = useConsulta(() => obterEstadoAoVivo(eventoId), {
    // 08/10/2026: também na votação encerrada, para o total de votos; lá os números não mudam mais.
    ativo: fasePalco === "AO_VIVO" || fasePalco === "ENCERRADA_AGUARDANDO",
    intervaloMs: fasePalco === "AO_VIVO" ? 5000 : undefined,
    chave: `${eventoId}:${fasePalco}:${configApresentacao.parcialAoVivo}`,
    emSegundoPlano: true,
  });

  const precisaResultado = fasePalco === "REVELACAO" || fasePalco === "FINAL_ESTATICO";
  const consultaResultado = useConsulta(() => carregarRevelacao(eventoId), {
    ativo: precisaResultado && carregado?.assinatura !== assinatura,
    chave: `${eventoId}:${assinatura}`,
    emSegundoPlano: true,
  });
  const dados =
    carregado && carregado.assinatura === assinatura
      ? carregado
      : consultaResultado.dados && consultaResultado.dados.assinatura === assinatura
        ? consultaResultado.dados
        : null;

  const roteiro = useMemo(
    () => (dados ? montarRoteiro(dados, { modo: "REAL" }) : []),
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

  /** Sem esperar: a cerimônia não depende da resposta. Falha só avisa no HUD. */
  async function registrar(acao: AcaoApresentacao, versao: number, cena?: number) {
    const r = await registrarAcaoApresentacao(eventoId, acao, { versao, cena });
    if (!r.ok) setMensagemHud(`Auditoria não registrada: ${r.erro.mensagem}`);
  }

  function auditar(acao: AcaoApresentacao, cena?: number) {
    const v = dados?.versao ?? status.dados?.versao;
    if (v) void registrar(acao, v, cena);
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
    const versaoIniciada = r.dados.versao;
    let final: number | null = null;
    if (irParaFinal) {
      final = montarRoteiro(r.dados, { modo: "REAL" }).length - 1;
      gravarProgresso(eventoId, { cena: final, passo: 0 });
      concluirRevelacao(eventoId, true);
    }
    // Em ordem (a trilha lê o início antes da emergência), mas sem segurar a cerimônia.
    void (async () => {
      await registrar("REVELACAO_INICIADA", versaoIniciada);
      if (final !== null) await registrar("EMERGENCIA_ACIONADA", versaoIniciada, final);
    })();
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
    auditar("REVELACAO_REFEITA");
  }

  function desligar() {
    if (fasePalco === "REVELACAO" && !estadoMotor.pausado) despachar({ tipo: "PAUSAR" });
    aoDesligar();
  }

  const proximoAvancoEm = useTemporizadorDoPasso(estadoMotor, roteiro, despachar, fasePalco === "REVELACAO" && dados !== null);

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
    telaCheia: alternarTelaCheia,
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
  const anuncio = cenaAtual ? nomeDaCena(cenaAtual, dados?.categorias) : fasePalco === "ENCERRADA_AGUARDANDO" ? TEXTOS_PALCO.votacaoEncerrada : ROTULO_FASE_PALCO[fasePalco];
  const ultimoAnuncio = useRef("");
  useEffect(() => {
    if (anuncio && anuncio !== ultimoAnuncio.current) anunciar(anuncio);
    ultimoAnuncio.current = anuncio;
  }, [anuncio, anunciar]);

  const candidatos = votaveis(ativo.candidatos)
    .filter((c) => !categoriaId || c.categoriaId === categoriaId)
    .map((c) => ({ id: c.id, titulo: c.titulo, imagemUrl: c.imagemUrl, ordem: c.ordem }));
  const ctx = useContextoCerimonia(dados?.candidatos ?? candidatos, dados?.categorias ?? []);
  const creditos = useMemo(() => creditosDosParceiros(ativo.parceiros, ativo.gruposParceiros), [ativo.parceiros, ativo.gruposParceiros]);
  const todosVotaveis = votaveis(ativo.candidatos);
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
    conteudo = <CenaPreVotacao nome={nome} logoUrl={tema.logoUrl} chamada={chamada} contagem={contagem} />;
  } else if (fasePalco === "AO_VIVO") {
    const abertaHa = evento.urnaAbertaEm ? agora - paraMs(evento.urnaAbertaEm) : Infinity;
    const subestado: SubestadoAoVivo =
      situacao === "TEMPO_ESGOTADO" ? "TEMPO_ESGOTADO" : situacao === "RETA_FINAL" ? "RETA_FINAL" : abertaHa <= DURACOES.mensagemAbertura ? "ABERTURA" : null;
    // B2 (25/11/2026): durante a votação, uma categoria por vez, trocando a cada n segundos (as do totem também, sem QR Code).
    // A escolha da sala continua valendo para a revelação. Sem nenhuma categoria com item, a de antes.
    const idsComItens = new Set(todosVotaveis.flatMap((c) => (c.categoriaId ? [c.categoriaId] : [])));
    const ciclo = categoriaDoTelao(ativo.categorias, idsComItens, agora, configApresentacao.telaoIntervaloSegundos);
    const emTela = ciclo?.categoria ?? categoria;
    const candidatosEmTela = emTela
      ? todosVotaveis.filter((c) => c.categoriaId === emTela.id).map((c) => ({ id: c.id, titulo: c.titulo, imagemUrl: c.imagemUrl, ordem: c.ordem }))
      : candidatos;
    conteudo = (
      <CenaAoVivo
        nome={nome}
        rotuloCandidato={tema.rotuloCandidato}
        fimTexto={evento.janelaFim ? fimPorExtenso(paraMs(evento.janelaFim), evento.fusoHorario) : null}
        intervaloSegundos={configApresentacao.telaoIntervaloSegundos}
        logoUrl={tema.logoUrl}
        candidatos={candidatosEmTela}
        urlQr={emTela ? `${window.location.origin}${rotaCategoria(ativo.slug, emTela.slug)}` : urlQr}
        mostrar={configApresentacao.telaoMostrar}
        categoria={
          emTela
            ? {
                nome: emTela.nome,
                premio: emTela.premio,
                soTotem: emTela.canal === "TOTEM",
                mensagem: emTela.mensagemTelao ?? MENSAGEM_TOTEM_PADRAO,
                posicao: ciclo ? { indice: ciclo.indice, total: ciclo.total } : null,
              }
            : null
        }
        contagem={evento.janelaFim ? <ContagemRegressiva alvoMs={paraMs(evento.janelaFim)} rotulo="Encerra em" textoZerado={TEXTOS_PALCO.tempoEsgotado} /> : null}
        totalGeral={aoVivo.dados?.totalGeral ?? null}
        subestado={subestado}
      />
    );
  } else if (fasePalco === "SEM_RESULTADO") {
    conteudo = <CenaMensagem nome={nome} logoUrl={tema.logoUrl} texto={TEXTOS_PALCO.semResultado} />;
  } else if (fasePalco === "ENCERRADA_AGUARDANDO" || !dados) {
    conteudo = (
      <CenaEncerrada
        nome={nome}
        logoUrl={tema.logoUrl}
        totalGeral={aoVivo.dados?.totalGeral ?? null}
        itens={todosVotaveis.length}
        categorias={ativo.categorias.length}
        rotuloCandidatos={tema.rotuloCandidatos}
      />
    );
  } else if (fasePalco === "FINAL_ESTATICO") {
    conteudo = <CenaFinal resultados={montarFinal(dados)} ctx={ctx} nome={nome} logoUrl={tema.logoUrl} creditos={creditos} />;
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
        rotuloCandidatos={tema.rotuloCandidatos}
        creditos={creditos}
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
        nomeCena={revelando ? nomeDaCena(cenaAtual, dados?.categorias) : anuncio}
        progresso={revelando ? { cena: estadoMotor.cena + 1, total: roteiro.length } : null}
        proximoAvancoEm={revelando ? proximoAvancoEm : null}
        aoDesligar={desligar}
        chaveTransicao={cenaAtual?.tipo === "TRAILER" ? "trailer" : "cena"}
        mensagem={mensagemHud ?? (erroLeitura ? `Falha de leitura: ${erroLeitura.mensagem}. Mostrando o último dado.` : null)}
        ajudaVisivel={ajuda}
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

