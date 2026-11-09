import type { Candidato, Categoria, Participacao } from "./tipos";

// Categorias do evento (Festival, 09/11/2026): cada uma tem os seus itens, a sua página (/e/[slug]/categoria/[slug]), o seu QR
// Code e o seu voto popular (uma pessoa vota uma vez em CADA categoria). Evento sem categorias segue com a urna única de sempre.
// Funções puras: a tela e o servidor usam as mesmas regras.

export const LIMITES_CATEGORIA = {
  nome: [2, 60],
  premio: 60,
  slug: [2, 40],
  maximo: 12,
} as const;

const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Vídeo-escola" → "video-escola"; sufixo numérico em caso de colisão ("mostra-2"). */
export function gerarSlugCategoria(nome: string, existentes: readonly string[]): string {
  const base =
    nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, LIMITES_CATEGORIA.slug[1] - 3)
      .replace(/-+$/g, "") || "categoria";
  if (!existentes.includes(base)) return base;
  let n = 2;
  while (existentes.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type CategoriaEditada = { nome: string; premio: string; slug: string };

/** Erros por posição (`nome-<i>`, `premio-<i>`, `slug-<i>`) e o geral (`categorias`). */
export function validarCategorias(lista: readonly CategoriaEditada[]): Record<string, string> {
  const erros: Record<string, string> = {};
  if (lista.length > LIMITES_CATEGORIA.maximo) erros.categorias = `Use até ${LIMITES_CATEGORIA.maximo} categorias.`;
  const nomes = new Set<string>();
  const slugs = new Set<string>();
  lista.forEach((c, i) => {
    const nome = c.nome.trim();
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!nome) erros[`nome-${i}`] = "Informe o nome da categoria.";
    else if (nome.length < LIMITES_CATEGORIA.nome[0] || nome.length > LIMITES_CATEGORIA.nome[1]) erros[`nome-${i}`] = "Use de 2 a 60 caracteres.";
    else if (nomes.has(chave)) erros[`nome-${i}`] = "Já existe uma categoria com este nome.";
    nomes.add(chave);
    if (c.premio.trim().length > LIMITES_CATEGORIA.premio) erros[`premio-${i}`] = "Use até 60 caracteres.";
    const slug = c.slug.trim();
    if (!slug) erros[`slug-${i}`] = "Informe o endereço.";
    else if (slug.length < LIMITES_CATEGORIA.slug[0] || slug.length > LIMITES_CATEGORIA.slug[1]) erros[`slug-${i}`] = "Use de 2 a 40 caracteres.";
    else if (!RE_SLUG.test(slug)) erros[`slug-${i}`] = "Use só letras minúsculas, números e hífen (sem hífen no começo ou no fim).";
    else if (slugs.has(slug)) erros[`slug-${i}`] = "Este endereço já está em uso por outra categoria.";
    slugs.add(slug);
  });
  return erros;
}

/** Categorias do evento, na ordem (desempate por id). */
export function categoriasDoEvento(categorias: readonly Categoria[], eventoId: string): Categoria[] {
  return categorias.filter((c) => c.eventoId === eventoId).sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
}

/** Itens de uma categoria (qualquer estado; quem chama filtra os votáveis). */
export function itensDaCategoria<T extends Pick<Candidato, "categoriaId">>(candidatos: readonly T[], categoriaId: string): T[] {
  return candidatos.filter((c) => c.categoriaId === categoriaId);
}

/** Página da categoria (também o destino do QR Code). */
export function rotaCategoria(slugEvento: string, slugCategoria: string): string {
  return `/e/${slugEvento}/categoria/${slugCategoria}`;
}

/** "Mostra Infantil · Melhor filme" (ou só o nome, sem prêmio). */
export function tituloCategoria(c: Pick<Categoria, "nome" | "premio">): string {
  return c.premio ? `${c.nome} · ${c.premio}` : c.nome;
}

/** A pessoa já votou nesta categoria? (Só o SE; nunca em quem.) */
export function votouNaCategoria(participacao: Pick<Participacao, "categoriasVotadas"> | null, categoriaId: string): boolean {
  return participacao?.categoriasVotadas?.includes(categoriaId) ?? false;
}

/**
 * A categoria que o telão apresenta (09/11/2026): a escolhida na sala, se ainda existe; senão a primeira. null em evento sem
 * categorias (o telão segue com a votação única).
 */
export function categoriaApresentada(escolhida: string | null, categorias: readonly Pick<Categoria, "id">[]): string | null {
  if (categorias.length === 0) return null;
  return categorias.some((c) => c.id === escolhida) ? escolhida : categorias[0].id;
}
