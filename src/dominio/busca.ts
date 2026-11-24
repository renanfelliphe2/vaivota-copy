// Busca dos itens pelo título (demanda B1, 25/11/2026): sem diferença de maiúsculas nem de acentos, por trecho.

/** "Ação" → "acao": minúsculas, sem acentos, espaços juntos. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

/** Os itens cujo título contém o termo; termo vazio devolve todos, na mesma ordem. */
export function filtrarPorTitulo<T>(itens: readonly T[], termo: string, titulo: (item: T) => string): T[] {
  const busca = normalizarBusca(termo);
  if (!busca) return [...itens];
  return itens.filter((i) => normalizarBusca(titulo(i)).includes(busca));
}
