import type { AcaoAuditoria, CanalCategoria, ConfigApresentacao, DadosResultado, Grupo, Instante, ModoAvanco, MotivoResultado } from "../tipos";

// Etapa 8 (seções 5.1 a 5.5): tipos do roteiro, do motor e do DTO da revelação.

export type FasePalco = "PRE_VOTACAO" | "AO_VIVO" | "ENCERRADA_AGUARDANDO" | "REVELACAO" | "FINAL_ESTATICO" | "SEM_RESULTADO";

/**
 * Cerimônia (25/11/2026): uma revelação só para o evento inteiro, na ordem configurada. TROFEU e POSICAO têm dois passos (a
 * contagem 3, 2, 1 e o vencedor); `categoriaId` null no TROFEU = troféu do evento todo. RESULTADO é o resumo de uma categoria, logo
 * depois do último item dela; FINAL mostra os resultados de todas, um de cada vez.
 */
export type Cena =
  | { tipo: "AO_VIVO_ENSAIO" }
  | { tipo: "ENCERRADA_ENSAIO" }
  | { tipo: "TRAILER" }
  | { tipo: "TROFEU"; grupo: Grupo; categoriaId: string | null; passos: 2 }
  | { tipo: "POSICAO"; categoriaId: string; posicao: number; passos: 2 }
  | { tipo: "DESEMPATE"; categoriaId: string; empateIndex: number; passos: 3 }
  | { tipo: "RESULTADO"; categoriaId: string }
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

export type CandidatoPalco = {
  id: string;
  titulo: string;
  imagemUrl: string | null;
  ordem: number;
  /** Categoria do item (a cerimônia junta todas). */
  categoriaId?: string | null;
  /** Campos extras do item: o telão mostra um crédito (Direção, Proponente) junto do vencedor. */
  camposExtras?: Record<string, string> | null;
};

/** O que o telão precisa de cada categoria na cerimônia (a configuração atual dela). */
export type CategoriaPalco = {
  id: string;
  nome: string;
  premio: string | null;
  canal: CanalCategoria;
  ordem: number;
  podioTamanho: number;
  podioVotos: boolean[];
  /** Rótulos dos campos extras da categoria, para achar o crédito do vencedor. */
  campos?: { chave: string; rotulo: string }[];
};

/** Única forma de o palco enxergar o resultado (carregarRevelacao e obterDadosEnsaio). */
export type DadosRevelacao = {
  versao: number;
  motivo: MotivoResultado;
  calculadoEm: Instante;
  assinatura: string;
  pesos: Record<Grupo, number>;
  dados: DadosResultado;
  /** Itens publicados de todas as categorias (na ordem de `ordem`), com título, cartaz e categoria. */
  candidatos: CandidatoPalco[];
  /** As categorias do evento, na ordem, com o pódio de cada uma. */
  categorias: CategoriaPalco[];
  config: ConfigApresentacao;
  modulos: { juri: boolean; infantil: boolean };
  candidatosNaDisputa: number;
};

export type DadosEnsaio = DadosRevelacao & {
  totalGeral: number;
  /** Curva do ao vivo simulado (totais por intervalo). */
  votosPorMinutoSimulados: number[];
};

/** O que a sala de controle sabe do resultado sem vê-lo: existe uma versão? qual a assinatura dela? */
export type StatusResultado = { existe: boolean; versao: number | null; assinatura: string | null };

/** Telão com a urna aberta: o total de votos e, só se o admin liberou (`parcialAoVivo`), a contagem do público por candidato. */
export type EstadoAoVivo = { totalGeral: number; parcial: { candidatoId: string; votos: number }[] | null };

/** Ações da cerimônia que vão à auditoria (só versão e índice da cena, nunca vencedores, pontuações ou votos). */
export type AcaoApresentacao = Extract<AcaoAuditoria, "REVELACAO_INICIADA" | "REVELACAO_CONCLUIDA" | "REVELACAO_REFEITA" | "EMERGENCIA_ACIONADA">;
