import { ehRotaInterna } from "./acesso";
import type { PapelParticipacao } from "./tipos";
import type { AcaoEntrada } from "./visaoEvento";

// Etapa 3 (D6): destino pós-acesso. Pura; respeita ?de= e reaproveita a ação de resolverVisaoEvento.

export type EntradaDestino = {
  slug: string;
  de?: string | null;
  emailVerificado: boolean;
  papel: PapelParticipacao | null;
  /** Ação de resolverVisaoEvento calculada com o estado já atualizado. */
  acao: AcaoEntrada;
};

const ACOES_DE_VOTO: AcaoEntrada[] = ["VOTAR", "VOTAR_JURADO", "ALTERAR_VOTO_JURADO", "VER_CONFIRMACAO"];

/** Votação na própria página do evento (08/10/2026: /votar virou a seção #candidatos da entrada). */
export function rotaVotacao(slug: string): string {
  return `/e/${slug}#candidatos`;
}

/** Avaliação por critério de um candidato (08/10/2026: só jurado, com o júri em modo por critério). */
export function rotaAvaliacao(slug: string, candidatoId: string): string {
  return `/e/${slug}/avaliar/${encodeURIComponent(candidatoId)}`;
}

/** Confirmação do e-mail por código (sessão sem e-mail verificado), mantendo `?de=` quando for interno. */
export function rotaVerificarEmail(slug: string, de?: string | null): string {
  return ehRotaInterna(de) ? `/e/${slug}/verificar-email?de=${encodeURIComponent(de)}` : `/e/${slug}/verificar-email`;
}

export function resolverDestinoAcesso({ slug, de, emailVerificado, papel, acao }: EntradaDestino): string {
  if (!emailVerificado) return rotaVerificarEmail(slug, de);
  if (ehRotaInterna(de)) return de;
  if (papel === "ADMIN") return `/e/${slug}/admin`;
  if (ACOES_DE_VOTO.includes(acao)) return rotaVotacao(slug);
  return `/e/${slug}`;
}

/** Recuperação de senha, mantendo `?de=` quando for interno. */
export function rotaRecuperarSenha(slug: string, de?: string | null): string {
  return ehRotaInterna(de) ? `/e/${slug}/recuperar-senha?de=${encodeURIComponent(de)}` : `/e/${slug}/recuperar-senha`;
}
