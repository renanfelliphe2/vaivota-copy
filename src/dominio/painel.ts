import type { GrupoAuditoria, ResumoAuditoria } from "./auditoria";
import type { Participantes } from "./contagens";
import type { ResumoApuracao } from "./resultado";
import type { SerieVotos } from "./serie";
import type { SituacaoEvento } from "./situacaoEvento";
import type { FaseConfig } from "./travas";
import type { DadosResultado, EstadoDispositivo, Grupo, Instante, ModoVotoJuri, MotivoResultado } from "./tipos";

// Etapa 7 (seção 5.3): DTOs do painel. Nenhum carrega e-mail, hash de código nem ipHash.
// Candidatos aparecem por id; a tela resolve o título pelo seletor público de candidatos.

export type ItemAuditoria = {
  id: number;
  criadoEm: Instante;
  acao: string;
  grupo: GrupoAuditoria;
  descricao: string;
  /** Nome do admin; "Jurado", "Participante" ou "Sistema" para os demais. */
  ator: string;
};

export type OperacaoDados = {
  eventoId: string;
  fase: FaseConfig;
  incoerente: boolean;
  situacao: SituacaoEvento;
  janela: { inicio: Instante | null; fim: Instante | null; encerramentoAutomatico: boolean };
  urna: { abertaEm: Instante | null; encerradaEm: Instante | null };
  modulos: { juri: boolean; infantil: boolean };
  /** Brutos; grupo desligado = 0. */
  totais: Record<Grupo, number>;
  participantes: Participantes;
  serie: SerieVotos;
  /** Sem escolha e sem número de alterações (D8). */
  jurados: { rotulo: string | null; nome: string; votou: boolean }[];
  totens: { nome: string; estado: EstadoDispositivo; ultimoUso: Instante | null; votos: number }[];
  convites: { disponiveis: number; usados: number; revogados: number; expirados: number };
  /** Até 50, mais recentes primeiro. */
  auditoria: { resumo: ResumoAuditoria; itens: ItemAuditoria[] };
  parcialAoVivo: boolean;
  /** null salvo flag ligada e urna ABERTA (D8). */
  parcial: { candidatoId: string; votos: number }[] | null;
  /** Existe versão e a fase permite. */
  resultadoDisponivel: boolean;
  geradoEm: Instante;
};

export type VersaoResumo = { versao: number; motivo: MotivoResultado; calculadoEm: Instante };

export type ResultadoVisao = VersaoResumo & {
  eventoId: string;
  pesos: Record<Grupo, number>;
  dados: DadosResultado;
  derivados: ResumoApuracao;
  versoes: VersaoResumo[];
  evento: { inicio: Instante | null; fim: Instante | null; candidatosNaDisputa: number };
  /** Acréscimo da Etapa 7 (relatório e resumo_evento): cadastrados e votaram por papel. */
  participantes: Participantes;
  serie: SerieVotos;
};

export type VotosJuriVisao = {
  /** 08/10/2026: modo do júri; nos modos por critério, a tabela e o CSV leem `notas` e `escolhas`. */
  modo: ModoVotoJuri;
  criterios: { id: string; nome: string }[];
  jurados: {
    nome: string;
    rotulo: string | null;
    votou: boolean;
    candidatoId: string | null;
    atualizadoEm: Instante | null;
    historico: { candidatoAnteriorId: string | null; candidatoId: string; em: Instante }[];
    /** candidatoId → criterioId → nota. */
    notas: Record<string, Record<string, number>>;
    /** criterioId → candidatoId. */
    escolhas: Record<string, string>;
  }[];
};
