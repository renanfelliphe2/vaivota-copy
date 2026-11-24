// Rotação dos cartazes do hero do estilo cinema (23/11/2026): seis casas em três fitas de dois quadros. Funções puras (o
// sorteio vem de fora) para provar a regra: o mesmo filme nunca ocupa duas casas ao mesmo tempo.
//
// 24/11/2026: a troca é da fita inteira, não de uma casa. A fita corre e os dois quadros mudam juntos; trocar um só por fita
// ficava estranho (um quadro parado e o outro correndo na mesma película).

export const CASAS_POR_FITA = 2;
export const FITAS_DO_HERO = 3;
export const CASAS_DO_HERO = CASAS_POR_FITA * FITAS_DO_HERO;

/** Os cartazes de partida: os primeiros da lista, na ordem dela (igual no servidor e no navegador, sem sorteio). */
export function cartazesIniciais(ids: readonly string[], casas = CASAS_DO_HERO): string[] {
  return [...new Set(ids)].slice(0, casas);
}

/** Uma troca: a fita que corre e os filmes dela depois de correr, de cima para baixo. */
export type Troca = { fita: number; ids: string[] };
/** A troca anterior: a fita que correu e os filmes que saíram dela. */
export type UltimaTroca = { fita: number; saiu: string[] };

/** Os filmes de uma fita, de cima para baixo. */
export function filmesDaFita(atuais: readonly string[], fita: number): string[] {
  return atuais.slice(fita * CASAS_POR_FITA, (fita + 1) * CASAS_POR_FITA);
}

/**
 * A próxima troca: uma fita (nunca a que acabou de correr) recebe filmes que NÃO estão em nenhuma casa agora (de preferência
 * nenhum que acabou de sair). A fita corre como película: os quadros novos entram por baixo e empurram os velhos para fora.
 * Com dois filmes livres ou mais, os dois quadros mudam; com um só, a fita anda um quadro (o de baixo sobe, o novo entra).
 * Sem filme livre (a lista cabe inteira nas casas), não há troca. `sorteio` devolve um número em [0, 1), como Math.random.
 */
export function proximaTroca(
  atuais: readonly string[],
  todos: readonly string[],
  sorteio: () => number,
  ultima: UltimaTroca | null,
): Troca | null {
  const emUso = new Set(atuais);
  const livres = [...new Set(todos)].filter((id) => !emUso.has(id));
  const totalDeFitas = Math.ceil(atuais.length / CASAS_POR_FITA);
  if (livres.length === 0 || totalDeFitas === 0) return null;

  const fitas = Array.from({ length: totalDeFitas }, (_, i) => i).filter((i) => totalDeFitas === 1 || i !== ultima?.fita);
  const fita = fitas[Math.floor(sorteio() * fitas.length)];
  const atual = filmesDaFita(atuais, fita);

  // Primeiro os que não acabaram de sair; só se faltar, os que saíram (a rotação não trava com poucos filmes).
  const saiu = new Set(ultima?.saiu ?? []);
  const preferidos = livres.filter((id) => !saiu.has(id));
  const resto = livres.filter((id) => saiu.has(id));
  const novos: string[] = [];
  for (const grupo of [preferidos, resto]) {
    const sobra = [...grupo];
    while (novos.length < atual.length && sobra.length > 0) novos.push(sobra.splice(Math.floor(sorteio() * sobra.length), 1)[0]);
  }

  return { fita, ids: [...atual, ...novos].slice(-atual.length) };
}

/** Aplica a troca sem mexer no vetor original. */
export function aplicarTroca(atuais: readonly string[], troca: Troca): string[] {
  const inicio = troca.fita * CASAS_POR_FITA;
  return atuais.map((id, i) => (i >= inicio && i < inicio + troca.ids.length ? troca.ids[i - inicio] : id));
}
