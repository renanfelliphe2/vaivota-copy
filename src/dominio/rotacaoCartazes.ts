// Rotação dos cartazes do hero do estilo cinema (23/11/2026): seis casas em três fitas, e de tempos em tempos uma casa troca de
// filme. Funções puras (o sorteio vem de fora) para provar a regra: o mesmo filme nunca ocupa duas casas ao mesmo tempo.

export const CASAS_DO_HERO = 6;

/** Os cartazes de partida: os primeiros da lista, na ordem dela (igual no servidor e no navegador, sem sorteio). */
export function cartazesIniciais(ids: readonly string[], casas = CASAS_DO_HERO): string[] {
  return [...new Set(ids)].slice(0, casas);
}

export type Troca = { casa: number; id: string };

/**
 * A próxima troca: uma casa (nunca a que acabou de trocar) recebe um filme que NÃO está em nenhuma casa agora (nem o que acabou
 * de sair, enquanto houver outro). Sem filme livre (a lista cabe inteira nas casas), não há troca.
 * `sorteio` devolve um número em [0, 1), como Math.random.
 */
export function proximaTroca(
  atuais: readonly string[],
  todos: readonly string[],
  sorteio: () => number,
  ultima: Troca | null,
): Troca | null {
  const emUso = new Set(atuais);
  const livres = [...new Set(todos)].filter((id) => !emUso.has(id));
  if (livres.length === 0 || atuais.length === 0) return null;

  const semOQueSaiu = ultima ? livres.filter((id) => id !== ultima.id) : livres;
  const candidatosAoFilme = semOQueSaiu.length > 0 ? semOQueSaiu : livres;
  const casas = atuais.map((_, i) => i).filter((i) => atuais.length === 1 || i !== ultima?.casa);

  return {
    casa: casas[Math.floor(sorteio() * casas.length)],
    id: candidatosAoFilme[Math.floor(sorteio() * candidatosAoFilme.length)],
  };
}

/** Aplica a troca sem mexer no vetor original. */
export function aplicarTroca(atuais: readonly string[], troca: Troca): string[] {
  return atuais.map((id, i) => (i === troca.casa ? troca.id : id));
}
