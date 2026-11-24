// "Em quem eu votei" (24/11/2026). O voto popular é secreto: o servidor não sabe em quem cada pessoa votou (a tabela de votos não
// tem ligação com a pessoa). Por isso a lembrança fica SÓ no aparelho de quem votou, no navegador, e nunca vai ao servidor.
// Funções puras sobre o conteúdo guardado; o armazenamento e o hook ficam em src/store/meusVotos.ts.

/** Chave da categoria quando o evento não tem categorias (voto único). */
export const VOTO_UNICO = "*";

/** `"<usuarioId>|<eventoId>"` → categoria (ou VOTO_UNICO) → id do item votado. */
export type MeusVotosGuardados = Record<string, Record<string, string>>;

const chaveDe = (usuarioId: string, eventoId: string) => `${usuarioId}|${eventoId}`;

/** Lê o texto guardado; qualquer coisa fora do formato vira vazio (nunca derruba a página). */
export function lerMeusVotos(texto: string | null): MeusVotosGuardados {
  if (!texto) return {};
  try {
    const bruto: unknown = JSON.parse(texto);
    if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
    const limpo: MeusVotosGuardados = {};
    for (const [chave, votos] of Object.entries(bruto)) {
      if (!votos || typeof votos !== "object" || Array.isArray(votos)) continue;
      const dele: Record<string, string> = {};
      for (const [categoria, candidato] of Object.entries(votos)) if (typeof candidato === "string") dele[categoria] = candidato;
      limpo[chave] = dele;
    }
    return limpo;
  } catch {
    return {};
  }
}

/** Acrescenta (ou troca) o voto da pessoa nesta categoria do evento, sem mexer no resto. */
export function comMeuVoto(
  atuais: MeusVotosGuardados,
  voto: { usuarioId: string; eventoId: string; categoriaId: string | null; candidatoId: string },
): MeusVotosGuardados {
  const chave = chaveDe(voto.usuarioId, voto.eventoId);
  return { ...atuais, [chave]: { ...atuais[chave], [voto.categoriaId ?? VOTO_UNICO]: voto.candidatoId } };
}

/** Os votos desta pessoa neste evento: categoria (ou VOTO_UNICO) → item. Vazio para visitante. */
export function meusVotosNoEvento(guardados: MeusVotosGuardados, usuarioId: string | null, eventoId: string | null): Record<string, string> {
  if (!usuarioId || !eventoId) return {};
  return guardados[chaveDe(usuarioId, eventoId)] ?? {};
}
