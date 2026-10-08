import type { ConfigApresentacao, DadosResultado, Grupo, Instante, ModoAvanco, MotivoResultado } from "../tipos";

// Etapa 8 (seções 5.1 a 5.5): tipos do roteiro, do motor e do DTO da revelação.

export type FasePalco = "PRE_VOTACAO" | "AO_VIVO" | "ENCERRADA_AGUARDANDO" | "REVELACAO" | "FINAL_ESTATICO" | "SEM_RESULTADO";

export type Cena =
  | { tipo: "AO_VIVO_ENSAIO" }
  | { tipo: "ENCERRADA_ENSAIO" }
  | { tipo: "TRAILER" }
  | { tipo: "CATEGORIA"; grupo: Grupo; passos: 3 }
  | { tipo: "DESEMPATE"; empateIndex: number; passos: 3 }
  | { tipo: "PODIO"; posicao: 1 | 2 | 3; passos: 3 }
  | { tipo: "CLASSIFICACAO"; paginas: number }
  | { tipo: "FINAL" };

export type ModoRevelacao = "REAL" | "ENSAIO";

export type EstadoTrailer = "CARREGANDO" | "LINK" | "GERADO";

export type EstadoMotor = {
  cena: number;
  passo: number;
  pausado: boolean;
  modoAvanco: ModoAvanco;
  trailer: EstadoTrailer;
  situacao: "EM_ANDAMENTO" | "CONCLUIDA";
  emergencia: boolean;
};

export type AcaoMotor =
  | { tipo: "AVANCAR" }
  | { tipo: "VOLTAR" }
  | { tipo: "PAUSAR" }
  | { tipo: "RETOMAR" }
  | { tipo: "AVANCO_AUTOMATICO"; cena: number; passo: number }
  | { tipo: "TRAILER_PRONTO" }
  | { tipo: "TRAILER_FALHOU" }
  | { tipo: "PULAR_TRAILER" }
  | { tipo: "IR_PARA_FINAL" }
  | { tipo: "DEFINIR_MODO"; modo: ModoAvanco }
  | { tipo: "REINICIAR" };

export type CandidatoPalco = { id: string; titulo: string; imagemUrl: string | null; ordem: number };

/** Única forma de o palco enxergar o resultado (carregarRevelacao e obterDadosEnsaio). */
export type DadosRevelacao = {
  versao: number;
  motivo: MotivoResultado;
  calculadoEm: Instante;
  assinatura: string;
  pesos: Record<Grupo, number>;
  dados: DadosResultado;
  /** Votáveis no momento do congelamento (na ordem de `ordem`), com título e cartaz. */
  candidatos: CandidatoPalco[];
  config: ConfigApresentacao;
  modulos: { juri: boolean; infantil: boolean };
  candidatosNaDisputa: number;
};

export type DadosEnsaio = DadosRevelacao & {
  totalGeral: number;
  /** Curva do ao vivo simulado (totais por intervalo). */
  votosPorMinutoSimulados: number[];
};
