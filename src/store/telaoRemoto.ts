"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  SEM_SINAL_REMOTO_MS,
  chaveDoModo,
  type ComandoTelao,
  type ConsultaTelaoRemoto,
  type CopiaApresentacao,
  type EstadoTelao,
  type ModoPalco,
} from "@/dominio/telaoRemoto";
import type { EstadoUiApresentacao } from "@/dominio/tipos";
import {
  comandarTelaoRemoto,
  consultarTelaoRemoto,
  espelharApresentacaoTelao,
  espelharApresentacaoTelaoPareado,
  sincronizarTelao,
} from "@/servicos/telaoRemoto";
import { definirDonoApresentacao } from "./acoesApresentacao";
import { useAmbiente } from "./AppProvider";
import { entregarComandoTelao, observarEstadoTelao, type TelaoNoControle } from "./canalTelao";
import type { Store } from "./criarStore";
import { lerApresentacao } from "./sincronizarApresentacao";

// Telão em outro aparelho (25/11/2026): o lado do navegador.
//  - O palco do admin gera o código (prepararTelaoRemoto) e guarda o id da sessão no localStorage: o controle remoto de qualquer
//    aba deste navegador passa a comandar o aparelho pareado pelo servidor (useTelaoRemotoNoControle).
//  - O aparelho pareado (useTelaoPareado) manda um sinal por segundo com o que o palco mostra e recebe os botões apertados.
//  - `ui.apresentacao` (modo, avanço, progresso da revelação) é copiada nos dois sentidos pelo espelho: quem muda envia; quem lê
//    aplica a versão mais nova. É o mesmo "a última escrita vale" das abas do mesmo navegador (sincronizarApresentacao).

const INTERVALO_SINAL_MS = 1000;
const INTERVALO_CONTROLE_MS = 1000;
/** Sessão à espera do aparelho: só para saber quando ele chega. */
const INTERVALO_ESPERA_MS = 3000;

// ─────────────────────────────────────────────
// A sessão deste navegador (localStorage)
// ─────────────────────────────────────────────

const PREFIXO_SESSAO = "vaivota:telao-remoto:";
const ouvintesSessao = new Set<() => void>();

function lerSessao(eventoId: string): string | null {
  try {
    return window.localStorage.getItem(PREFIXO_SESSAO + eventoId);
  } catch {
    return null;
  }
}

/** Guarda (ou apaga, com null) o id da sessão do telão remoto deste evento. Todas as abas ficam sabendo. */
export function guardarSessaoTelaoRemoto(eventoId: string, id: string | null, soSeFor?: string): void {
  if (soSeFor !== undefined && lerSessao(eventoId) !== soSeFor) return;
  try {
    if (id) window.localStorage.setItem(PREFIXO_SESSAO + eventoId, id);
    else window.localStorage.removeItem(PREFIXO_SESSAO + eventoId);
  } catch {
    // Sem armazenamento: o controle só não acha a sessão depois de recarregar.
  }
  for (const avisar of ouvintesSessao) avisar();
}

function inscreverSessao(avisar: () => void): () => void {
  ouvintesSessao.add(avisar);
  const aoMudar = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(PREFIXO_SESSAO)) avisar();
  };
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesSessao.delete(avisar);
    window.removeEventListener("storage", aoMudar);
  };
}

/** O id da sessão do telão remoto deste evento neste navegador, ou null. */
export function useSessaoTelaoRemoto(eventoId: string | null): string | null {
  return useSyncExternalStore(
    inscreverSessao,
    () => (eventoId ? lerSessao(eventoId) : null),
    () => null,
  );
}

// ─────────────────────────────────────────────
// Espelho de ui.apresentacao
// ─────────────────────────────────────────────

/** JSON com as chaves em ordem: o mesmo conteúdo dá o mesmo texto, venha de onde vier (o banco reordena as chaves). */
export function textoEstavel(valor: unknown): string {
  return JSON.stringify(valor, (_chave, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) : v,
  );
}

export type EspelhoApresentacao = {
  /** A versão mais nova vista no servidor (o próximo pedido só traz uma cópia se houver outra mais nova). */
  versao(): number;
  /**
   * Uma leitura do servidor. `aplicar`: a cópia mais nova vale aqui (o telão está pareado e pode ter avançado). Sem `aplicar`
   * (a sessão ainda espera o aparelho), quem vale é o daqui, e o servidor recebe se estiver diferente.
   */
  receber(copia: CopiaApresentacao | null, aplicar: boolean): void;
  cancelar(): void;
};

/**
 * Liga `ui.apresentacao` desta aba a uma sessão do servidor. Nada é enviado antes da primeira leitura (o que está guardado
 * neste navegador pode ser de outra apresentação). Um envio por vez, sempre do estado mais recente; durante um envio as leituras
 * esperam, senão uma cópia antiga desfaria a mudança que está a caminho.
 */
export function criarEspelhoApresentacao(
  store: Store,
  opcoes: { enviar: (dados: EstadoUiApresentacao) => Promise<number | null>; podeEnviar: () => boolean },
): EspelhoApresentacao {
  let versaoVista = 0;
  let conhecido: string | null = null;
  let pronto = false;
  let aplicando = false;
  let enviando = false;
  let pendente = false;
  let cancelado = false;
  let ultima = store.getState().ui.apresentacao;

  async function enviar() {
    if (enviando) {
      pendente = true;
      return;
    }
    enviando = true;
    try {
      do {
        pendente = false;
        const atual = store.getState().ui.apresentacao;
        const texto = textoEstavel(atual);
        if (texto === conhecido) continue;
        const versao = await opcoes.enviar(atual);
        if (cancelado) return;
        // Falhou: `conhecido` fica como estava e a próxima leitura tenta de novo.
        if (versao !== null) {
          conhecido = texto;
          versaoVista = Math.max(versaoVista, versao);
        }
      } while (pendente && !cancelado);
    } finally {
      enviando = false;
    }
  }

  const precisaEnviar = () => pronto && !cancelado && opcoes.podeEnviar() && textoEstavel(store.getState().ui.apresentacao) !== conhecido;

  const cancelarInscricao = store.subscribe(() => {
    const atual = store.getState().ui.apresentacao;
    if (atual === ultima) return;
    ultima = atual;
    if (!aplicando && precisaEnviar()) void enviar();
  });

  return {
    versao: () => versaoVista,
    receber(copia, aplicar) {
      if (cancelado || enviando) return;
      if (copia && copia.versao > versaoVista) {
        versaoVista = copia.versao;
        const texto = textoEstavel(copia.dados);
        conhecido = texto;
        const lida = aplicar ? lerApresentacao(copia.dados) : null;
        if (lida && texto !== textoEstavel(store.getState().ui.apresentacao)) {
          aplicando = true;
          try {
            store.atualizar((e) => ({ ...e, ui: { ...e.ui, apresentacao: lida } }));
          } finally {
            aplicando = false;
          }
        }
      }
      pronto = true;
      // O daqui mudou depois da última troca (envio que falhou, mudança com a aba oculta, sessão ainda à espera): vai ao servidor.
      if (precisaEnviar()) void enviar();
    },
    cancelar() {
      cancelado = true;
      cancelarInscricao();
    },
  };
}

// ─────────────────────────────────────────────
// Controle remoto (o navegador que gerou o código)
// ─────────────────────────────────────────────

/** O que o telão contou, com o avanço automático trazido para o relógio deste computador. */
function noRelogioDaqui(palco: EstadoTelao, recebidoEm: number, sinalHaMs: number | null): EstadoTelao {
  if (palco.situacao !== "LIGADO" || palco.proximoAvancoEm === null) return palco;
  return { ...palco, proximoAvancoEm: recebidoEm - (sinalHaMs ?? 0) + palco.proximoAvancoEm };
}

export type TelaoRemotoNoControle = {
  /** O telão do outro aparelho (SEM_SINAL se ele parou de responder), ou null sem aparelho pareado. */
  telao: TelaoNoControle | null;
  comandar: (comando: ComandoTelao) => void;
};

/**
 * Controle remoto: com uma sessão deste navegador, pergunta ao servidor o que o telão do outro aparelho mostra (a cada segundo,
 * só com a aba visível: é ela que está sendo usada) e leva a apresentação daqui para lá e de lá para cá.
 */
export function useTelaoRemotoNoControle(eventoId: string | null, habilitado: boolean): TelaoRemotoNoControle {
  const { store } = useAmbiente();
  const id = useSessaoTelaoRemoto(eventoId);
  const ativo = habilitado && eventoId !== null && id !== null;
  const [lido, setLido] = useState<{ id: string; consulta: ConsultaTelaoRemoto; em: number } | null>(null);
  const [agora, setAgora] = useState(0);

  useEffect(() => {
    if (!ativo) return;
    const ev = eventoId!;
    const sessao = id!;
    let parado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pareado = false;
    const espelho = criarEspelhoApresentacao(store, {
      enviar: async (apresentacao) => {
        const r = await espelharApresentacaoTelao({ eventoId: ev, id: sessao, apresentacao });
        return r.ok ? r.dados.versao : null;
      },
      podeEnviar: () => document.visibilityState === "visible",
    });

    async function consultar() {
      clearTimeout(timer);
      if (parado || document.visibilityState === "hidden") return; // retoma no visibilitychange
      const r = await consultarTelaoRemoto({ eventoId: ev, id: sessao, versaoApresentacao: espelho.versao() });
      if (parado) return;
      const em = Date.now();
      setAgora(em);
      if (r.ok) {
        if (r.dados.situacao === "ENCERRADO") {
          guardarSessaoTelaoRemoto(ev, null, sessao);
          return;
        }
        pareado = r.dados.situacao === "PAREADO";
        espelho.receber(r.dados.apresentacao, pareado);
        setLido({ id: sessao, consulta: r.dados, em });
      } else if (r.erro.codigo === "NAO_ENCONTRADO") {
        guardarSessaoTelaoRemoto(ev, null, sessao);
        return;
      }
      timer = setTimeout(() => void consultar(), pareado ? INTERVALO_CONTROLE_MS : INTERVALO_ESPERA_MS);
    }

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    const relogio = setInterval(() => setAgora(Date.now()), INTERVALO_CONTROLE_MS);
    void consultar();
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    return () => {
      parado = true;
      clearTimeout(timer);
      clearInterval(relogio);
      espelho.cancelar();
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [ativo, eventoId, id, store]);

  const atual = ativo && lido && lido.id === id ? lido : null;
  let telao: TelaoNoControle | null = null;
  if (atual && atual.consulta.situacao === "PAREADO") {
    // Sem resposta do servidor há um tempo (a internet daqui caiu), o último estado lido não vale mais.
    const velho = agora - atual.em > SEM_SINAL_REMOTO_MS + INTERVALO_CONTROLE_MS;
    const palco = velho ? null : atual.consulta.palco;
    telao = palco ? { ...noRelogioDaqui(palco, atual.em, atual.consulta.sinalHaMs), remoto: true } : { situacao: "SEM_SINAL", ensaio: false, remoto: true };
  }

  const alvo = useRef({ eventoId, id });
  useEffect(() => {
    alvo.current = { eventoId, id };
  });
  const comandar = (comando: ComandoTelao) => {
    const { eventoId: ev, id: sessao } = alvo.current;
    if (ev && sessao) void comandarTelaoRemoto({ eventoId: ev, id: sessao, comando });
  };

  return { telao, comandar };
}

// ─────────────────────────────────────────────
// O aparelho pareado
// ─────────────────────────────────────────────

export type SituacaoTelaoPareado =
  | { tipo: "CONECTANDO" }
  | { tipo: "PRONTO"; modo: ModoPalco }
  /** Sem cookie, cookie de uma sessão encerrada (o admin desconectou) ou de outro evento. */
  | { tipo: "NAO_PAREADO"; outroEvento: boolean }
  /** Outra aba deste aparelho abriu o telão e assumiu. */
  | { tipo: "SUBSTITUIDO" };

function novoId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `aba-${Date.now()}-${Math.random()}`;
}

/** Para o servidor, o avanço automático vai como os ms que faltam: os relógios dos dois aparelhos não batem. */
function paraOSinal(estado: EstadoTelao | null): EstadoTelao | null {
  if (!estado || estado.situacao !== "LIGADO" || estado.proximoAvancoEm === null) return estado;
  return { ...estado, proximoAvancoEm: Math.max(0, Math.round(estado.proximoAvancoEm - Date.now())) };
}

/**
 * O telão pareado: um sinal por segundo (e a cada mudança do que o palco mostra) leva o estado do palco e traz os botões do
 * controle, o modo e a apresentação. Os botões são executados aqui como se tivessem vindo de outra aba (entregarComandoTelao).
 * Sem internet o palco segue sozinho (a cerimônia já está carregada) e os sinais continuam tentando.
 */
export function useTelaoPareado(eventoId: string | null): SituacaoTelaoPareado {
  const { store } = useAmbiente();
  const [situacao, setSituacao] = useState<SituacaoTelaoPareado>({ tipo: "CONECTANDO" });

  useEffect(() => {
    if (!eventoId) return;
    const instancia = novoId();
    let desde: number | null = null;
    let ultimoEstado: EstadoTelao | null = null;
    let ultimoTexto = textoEstavel(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let emCurso = false;
    let deNovo = false;
    let parado = false;
    let modoAtual: string | null = null;

    const espelho = criarEspelhoApresentacao(store, {
      enviar: async (apresentacao) => {
        const r = await espelharApresentacaoTelaoPareado({ instancia, apresentacao });
        return r.ok ? r.dados.versao : null;
      },
      podeEnviar: () => true,
    });

    function parar(final: SituacaoTelaoPareado) {
      parado = true;
      clearTimeout(timer);
      setSituacao(final);
    }

    async function sinalizar() {
      if (parado) return;
      if (emCurso) {
        deNovo = true;
        return;
      }
      emCurso = true;
      clearTimeout(timer);
      try {
        do {
          deNovo = false;
          const r = await sincronizarTelao({ instancia, desde, estado: paraOSinal(ultimoEstado), versaoApresentacao: espelho.versao() });
          if (parado) return;
          if (r.ok) {
            const s = r.dados;
            if (s.eventoId !== eventoId) return parar({ tipo: "NAO_PAREADO", outroEvento: true });
            definirDonoApresentacao(s.dono);
            // A apresentação antes dos botões: um Avançar age sobre o progresso mais recente.
            espelho.receber(s.apresentacao, true);
            desde = s.ultimoComando;
            const chave = chaveDoModo(s.modo);
            if (chave !== modoAtual) {
              modoAtual = chave;
              setSituacao({ tipo: "PRONTO", modo: s.modo });
            }
            for (const comando of s.comandos) entregarComandoTelao(comando);
          } else if (r.erro.codigo === "NAO_AUTORIZADO") {
            return parar({ tipo: "NAO_PAREADO", outroEvento: false });
          } else if (r.erro.codigo === "CONFLITO") {
            return parar({ tipo: "SUBSTITUIDO" });
          }
          // REDE e o resto: o próximo sinal tenta de novo.
        } while (deNovo && !parado);
      } finally {
        emCurso = false;
        if (!parado) timer = setTimeout(() => void sinalizar(), INTERVALO_SINAL_MS);
      }
    }

    const pararObservar = observarEstadoTelao((estado) => {
      const texto = textoEstavel(estado);
      ultimoEstado = estado;
      if (texto === ultimoTexto) return;
      ultimoTexto = texto;
      void sinalizar();
    });
    void sinalizar();
    return () => {
      parado = true;
      clearTimeout(timer);
      pararObservar();
      espelho.cancelar();
      definirDonoApresentacao(null);
    };
  }, [eventoId, store]);

  return situacao;
}
