import type { Candidato } from "./tipos";

function porOrdem(a: Candidato, b: Candidato): number {
  return a.ordem - b.ordem || a.id.localeCompare(b.id);
}

/** Candidatos publicados (inclui desqualificados), na ordem de `ordem`. */
export function publicados(candidatos: readonly Candidato[]): Candidato[] {
  return candidatos.filter((c) => c.publicado).sort(porOrdem);
}

/** Candidatos que podem receber voto: publicados e não desqualificados, na ordem de `ordem`. */
export function votaveis(candidatos: readonly Candidato[]): Candidato[] {
  return candidatos.filter((c) => c.publicado && !c.desqualificado).sort(porOrdem);
}
