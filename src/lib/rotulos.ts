import type { EstadoEvento, EstadoUrna, PapelParticipacao } from "@/dominio/tipos";

// Rótulos de exibição dos enums (pt-BR).

export const ROTULO_ESTADO_EVENTO: Record<EstadoEvento, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  CONCLUIDO: "Concluído",
};

export const ROTULO_ESTADO_URNA: Record<EstadoUrna, string> = {
  NAO_INICIADA: "Urna não iniciada",
  ABERTA: "Urna aberta",
  ENCERRADA: "Urna encerrada",
};

export const ROTULO_PAPEL: Record<PapelParticipacao, string> = {
  PUBLICO: "Público",
  JURADO: "Jurado",
  ADMIN: "Administrador",
};

/** Rótulo do tema em minúsculas (pt-BR), para frases sem artigo. */
export function minusculas(texto: string): string {
  return texto.toLocaleLowerCase("pt-BR");
}

/**
 * Nome do evento em dois tons (página do evento): a primeira palavra e o resto ("Maratona" + "Tech Tivit").
 * Nome de uma palavra só fica inteiro, sem o segundo tom.
 */
export function dividirNome(nome: string): { primeira: string; resto: string | null } {
  const [primeira, ...resto] = nome.trim().split(/\s+/);
  return { primeira, resto: resto.length > 0 ? resto.join(" ") : null };
}

/**
 * Título de cartaz do estilo cinema (07/11/2026): a edição vira uma linha de chamada acima do nome ("9º Festival" +
 * "Ver e Fazer Filmes"). Sem número de edição no começo (ou sem nada depois dele), o nome fica inteiro, sem chamada.
 */
export function dividirTitulo(nome: string): { chamada: string | null; principal: string } {
  const limpo = nome.trim().replace(/\s+/g, " ");
  const edicao = /^(\d+\s?[ºª°o]\.?\s+\S+)\s+(.+)$/u.exec(limpo);
  return edicao ? { chamada: edicao[1], principal: edicao[2] } : { chamada: null, principal: limpo };
}
