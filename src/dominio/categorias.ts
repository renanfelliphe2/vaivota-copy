import type { Candidato, Categoria, Participacao } from "./tipos";

// Categorias do evento (Festival, 09/11/2026): cada uma tem os seus itens, a sua página (/e/[slug]/[categoria]), o seu QR
// Code e o seu voto popular (uma pessoa vota uma vez em CADA categoria). Evento sem categorias segue com a urna única de sempre.
// Funções puras: a tela e o servidor usam as mesmas regras.

export const LIMITES_CATEGORIA = {
  nome: [2, 60],
  premio: 60,
  descricao: 500,
  slug: [2, 40],
  maximo: 12,
} as const;

/**
 * Endereços que já são páginas do evento (/e/[slug]/votar, /e/[slug]/admin...): uma categoria não pode ocupá-los, senão a
 * página dela nunca abriria. Manter em dia com as pastas de src/app/e/[slug]. "categoria" é o endereço antigo, que redireciona.
 */
export const ENDERECOS_RESERVADOS = ["admin", "avaliar", "categoria", "continuar", "convite", "qr", "recuperar-senha", "totem", "verificar-email", "votar"] as const;

/**
 * "Vídeo-escola" → "video-escola"; sufixo numérico em caso de colisão ("mostra-2"), inclusive com os endereços reservados
 * ("Votar" → "votar-2").
 */
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
  const ocupados = [...existentes, ...ENDERECOS_RESERVADOS];
  if (!ocupados.includes(base)) return base;
  let n = 2;
  while (ocupados.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** `descricao` ausente conta como vazia (opcional). O endereço não vem de quem edita: é gerado do nome (enderecosDasCategorias). */
export type CategoriaEditada = { nome: string; premio: string; descricao?: string };

/**
 * Endereço de cada categoria (24/11/2026): sempre gerado do nome, nunca digitado. As que estão em `manter` (índice → endereço
 * atual) ficam com o endereço que têm: é o caso com a urna aberta, quando o QR Code já está em uso. As outras, na ordem da
 * lista, recebem o endereço do nome sem colidir com nenhuma.
 */
export function enderecosDasCategorias(nomes: readonly string[], manter: ReadonlyMap<number, string> = new Map()): string[] {
  const usados = [...manter.values()];
  return nomes.map((nome, i) => {
    const fixo = manter.get(i);
    if (fixo !== undefined) return fixo;
    const slug = gerarSlugCategoria(nome, usados);
    usados.push(slug);
    return slug;
  });
}

/** Erros por posição (`nome-<i>`, `premio-<i>`, `descricao-<i>`) e o geral (`categorias`). */
export function validarCategorias(lista: readonly CategoriaEditada[]): Record<string, string> {
  const erros: Record<string, string> = {};
  if (lista.length > LIMITES_CATEGORIA.maximo) erros.categorias = `Use até ${LIMITES_CATEGORIA.maximo} categorias.`;
  const nomes = new Set<string>();
  lista.forEach((c, i) => {
    const nome = c.nome.trim();
    const chave = nome.toLocaleLowerCase("pt-BR");
    if (!nome) erros[`nome-${i}`] = "Informe o nome da categoria.";
    else if (nome.length < LIMITES_CATEGORIA.nome[0] || nome.length > LIMITES_CATEGORIA.nome[1]) erros[`nome-${i}`] = "Use de 2 a 60 caracteres.";
    else if (nomes.has(chave)) erros[`nome-${i}`] = "Já existe uma categoria com este nome.";
    nomes.add(chave);
    if (c.premio.trim().length > LIMITES_CATEGORIA.premio) erros[`premio-${i}`] = "Use até 60 caracteres.";
    if ((c.descricao ?? "").trim().length > LIMITES_CATEGORIA.descricao) erros[`descricao-${i}`] = `Use até ${LIMITES_CATEGORIA.descricao} caracteres.`;
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

/** Página da categoria (também o destino do QR Code): o endereço do evento seguido do da categoria (24/11/2026). */
export function rotaCategoria(slugEvento: string, slugCategoria: string): string {
  return `/e/${slugEvento}/${slugCategoria}`;
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
