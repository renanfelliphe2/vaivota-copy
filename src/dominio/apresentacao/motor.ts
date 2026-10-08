import type { ModoAvanco } from "../tipos";
import { DURACOES } from "./duracoes";
import { passosDaCena } from "./roteiro";
import type { AcaoMotor, Cena, EstadoMotor, EstadoTrailer } from "./tipos";

// Etapa 8 (D1, seção 5.5): redutor puro da revelação. Nunca pula passo; AVANCO_AUTOMATICO só vale para o
// (cena, passo) atual, então um timer atrasado nunca avança duas vezes.

export function estadoInicialMotor(modoAvanco: ModoAvanco, cena = 0): EstadoMotor {
  return { cena, passo: 0, pausado: false, modoAvanco, trailer: "CARREGANDO", situacao: "EM_ANDAMENTO", emergencia: false };
}

/** Primeira cena que o admin pode alcançar voltando: o TRAILER (nunca as cenas de ensaio). */
export function primeiraCenaDaRevelacao(roteiro: Cena[]): number {
  return Math.max(0, roteiro.findIndex((c) => c.tipo === "TRAILER"));
}

function irPara(estado: EstadoMotor, roteiro: Cena[], cena: number, passo: number): EstadoMotor {
  const alvo = roteiro[cena];
  return {
    ...estado,
    cena,
    passo,
    trailer: alvo?.tipo === "TRAILER" && estado.cena !== cena ? "CARREGANDO" : estado.trailer,
    situacao: alvo?.tipo === "FINAL" ? "CONCLUIDA" : estado.situacao,
  };
}

function avancar(estado: EstadoMotor, roteiro: Cena[]): EstadoMotor {
  const atual = roteiro[estado.cena];
  if (!atual || atual.tipo === "FINAL") return estado.situacao === "CONCLUIDA" ? estado : { ...estado, situacao: "CONCLUIDA" };
  if (estado.passo + 1 < passosDaCena(atual)) return { ...estado, passo: estado.passo + 1 };
  return irPara(estado, roteiro, Math.min(roteiro.length - 1, estado.cena + 1), 0);
}

export function reduzirMotor(estado: EstadoMotor, acao: AcaoMotor, roteiro: Cena[]): EstadoMotor {
  switch (acao.tipo) {
    case "AVANCAR":
      return avancar(estado, roteiro);
    case "AVANCO_AUTOMATICO":
      if (estado.pausado || acao.cena !== estado.cena || acao.passo !== estado.passo) return estado;
      return avancar(estado, roteiro);
    case "VOLTAR": {
      if (estado.passo > 0) return { ...estado, passo: estado.passo - 1 };
      if (estado.cena <= primeiraCenaDaRevelacao(roteiro)) return estado;
      const anterior = estado.cena - 1;
      return { ...irPara(estado, roteiro, anterior, passosDaCena(roteiro[anterior]) - 1), situacao: estado.situacao };
    }
    case "PAUSAR":
      return estado.pausado ? estado : { ...estado, pausado: true };
    case "RETOMAR":
      return estado.pausado ? { ...estado, pausado: false } : estado;
    case "TRAILER_PRONTO":
      return roteiro[estado.cena]?.tipo === "TRAILER" && estado.trailer === "CARREGANDO" ? { ...estado, trailer: "LINK" } : estado;
    case "TRAILER_FALHOU":
      return roteiro[estado.cena]?.tipo === "TRAILER" && estado.trailer !== "GERADO" ? { ...estado, trailer: "GERADO" } : estado;
    case "PULAR_TRAILER":
      return roteiro[estado.cena]?.tipo === "TRAILER" ? irPara(estado, roteiro, estado.cena + 1, 0) : estado;
    case "IR_PARA_FINAL":
      return { ...estado, cena: roteiro.length - 1, passo: 0, situacao: "CONCLUIDA", emergencia: true, pausado: false };
    case "DEFINIR_MODO":
      return estado.modoAvanco === acao.modo ? estado : { ...estado, modoAvanco: acao.modo };
    case "REINICIAR":
      return estadoInicialMotor(estado.modoAvanco);
  }
}

/** Duração do passo em ms; null = espera o admin (FINAL, trailer de link carregando). */
export function duracaoDoPasso(cena: Cena, passo: number, trailer: EstadoTrailer = "GERADO"): number | null {
  switch (cena.tipo) {
    case "AO_VIVO_ENSAIO":
      return DURACOES.ensaioAoVivo;
    case "ENCERRADA_ENSAIO":
      return DURACOES.ensaioEncerrada;
    case "TRAILER":
      return trailer === "CARREGANDO" ? null : trailer === "LINK" ? DURACOES.trailerLink : DURACOES.trailerGerado;
    case "CATEGORIA":
      return [DURACOES.suspense, DURACOES.nome, DURACOES.detalhe][passo] ?? DURACOES.detalhe;
    case "DESEMPATE":
      return DURACOES.desempatePasso;
    case "PODIO":
      return DURACOES.podioPasso;
    case "CLASSIFICACAO":
      return DURACOES.classificacaoPagina;
    case "FINAL":
      return null;
  }
}

/** As duas cenas iniciais do ensaio seguem tempos fixos mesmo no modo manual. */
export function avancaSozinha(cena: Cena, modo: ModoAvanco): boolean {
  return modo === "AUTOMATICO" || cena.tipo === "AO_VIVO_ENSAIO" || cena.tipo === "ENCERRADA_ENSAIO";
}
