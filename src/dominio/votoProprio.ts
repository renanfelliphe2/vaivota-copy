import type { Candidato, Evento } from "./tipos";

// Etapa 4 (D6): voto em si mesmo. A UI não oferece a ação; os serviços de voto (Etapa 5) revalidam
// e recusam com VOTO_PROPRIO.

export function candidatoBloqueadoParaVoto(
  candidato: Pick<Candidato, "usuarioVinculadoId">,
  usuarioId: string | null,
  evento: Pick<Evento, "bloquearVotoProprio">,
): boolean {
  return evento.bloquearVotoProprio && usuarioId !== null && candidato.usuarioVinculadoId === usuarioId;
}
