import type { PapelParticipacao } from "./tipos";

/**
 * O que a pessoa pode fazer numa categoria, na página dela e (desde 25/11/2026, B1) no carrossel da landing:
 * - VISITANTE (sem sessão ou sem e-mail verificado), com a urna aberta: o toque no item pede o acesso e volta com `?votar=`;
 * - AGUARDANDO: logado, a participação ainda está sendo criada (GarantiaParticipacao);
 * - ESCOLHA: público que ainda não votou nesta categoria; o toque abre a confirmação;
 * - JA_VOTOU: público que já votou nesta categoria (só o SE; nunca em quem);
 * - LEITURA: urna fechada, admin, jurado ou categoria do totem (votada só nos totens): só a lista.
 */
export type ModoVotoCategoria = "VISITANTE" | "AGUARDANDO" | "ESCOLHA" | "JA_VOTOU" | "LEITURA";

export function modoVotoCategoria(entrada: {
  urnaAberta: boolean;
  logado: boolean;
  emailVerificado: boolean;
  papel: PapelParticipacao | null;
  soTotem: boolean;
  votou: boolean;
}): ModoVotoCategoria {
  if (!entrada.urnaAberta || entrada.soTotem) return "LEITURA";
  if (!entrada.logado || !entrada.emailVerificado) return "VISITANTE";
  if (entrada.papel === null) return "AGUARDANDO";
  if (entrada.papel !== "PUBLICO") return "LEITURA";
  return entrada.votou ? "JA_VOTOU" : "ESCOLHA";
}
