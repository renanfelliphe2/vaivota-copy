import type { CampoCandidato, Candidato, TipoCampo } from "./tipos";

// Etapa 6 (D13): campos extras. A `chave` nasce do rótulo e é imutável; remover o campo apaga os valores nos itens na mesma
// operação. D1 (25/11/2026): os campos são de cada categoria; o item preenche os da categoria dele. A mesma chave em duas
// categorias é o mesmo campo: o valor fica quando o item muda entre elas.

/** "Direção de Arte" → "direcao_de_arte"; sufixo numérico em caso de colisão ("elenco_2"). */
export function gerarChave(rotulo: string, existentes: readonly string[]): string {
  const base =
    rotulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 36) || "campo";
  if (!existentes.includes(base)) return base;
  let n = 2;
  while (existentes.includes(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}

/** Chave aceitável vinda de outra categoria (copiar campos): o formato que `gerarChave` produz. */
export function chaveValida(chave: string): boolean {
  return /^[a-z0-9_]{1,40}$/.test(chave);
}

/** Os campos de uma categoria, na ordem. Item sem categoria não tem campos. */
export function camposDaCategoria(campos: readonly CampoCandidato[], categoriaId: string | null): CampoCandidato[] {
  if (!categoriaId) return [];
  return campos.filter((c) => c.categoriaId === categoriaId).sort((a, b) => a.ordem - b.ordem);
}

function temValor(candidato: Candidato, chave: string): boolean {
  return Boolean(candidato.camposExtras?.[chave]?.trim());
}

/** Quantos itens da categoria têm valor no campo (para a confirmação da remoção). */
export function contarValores(candidatos: readonly Candidato[], categoriaId: string, chave: string): number {
  return candidatos.filter((c) => c.categoriaId === categoriaId && temValor(c, chave)).length;
}

/** Apaga os valores das chaves removidas nos itens da categoria. */
export function removerValores(candidatos: readonly Candidato[], categoriaId: string, chaves: readonly string[]): Candidato[] {
  if (chaves.length === 0) return [...candidatos];
  return candidatos.map((c) => {
    if (c.categoriaId !== categoriaId || !c.camposExtras) return c;
    if (!chaves.some((k) => k in c.camposExtras!)) return c;
    const camposExtras = Object.fromEntries(Object.entries(c.camposExtras).filter(([k]) => !chaves.includes(k)));
    return { ...c, camposExtras };
  });
}

/**
 * Campos preenchidos no item que a categoria de destino não tem: os valores deles se perdem na mudança. O rótulo vem do campo
 * da categoria atual do item (ou de qualquer categoria com a mesma chave; por fim, a própria chave).
 */
export function camposPerdidosNaMudanca(
  candidato: Candidato,
  campos: readonly CampoCandidato[],
  destinoId: string,
): { chave: string; rotulo: string }[] {
  if (candidato.categoriaId === destinoId) return [];
  const doDestino = new Set(campos.filter((c) => c.categoriaId === destinoId).map((c) => c.chave));
  const rotuloDe = (chave: string) =>
    campos.find((c) => c.categoriaId === candidato.categoriaId && c.chave === chave)?.rotulo ?? campos.find((c) => c.chave === chave)?.rotulo ?? chave;
  return Object.keys(candidato.camposExtras ?? {})
    .filter((chave) => temValor(candidato, chave) && !doDestino.has(chave))
    .map((chave) => ({ chave, rotulo: rotuloDe(chave) }));
}

/** Os tipos na ordem do seletor, com o nome que a tela mostra (24/11/2026). */
export const TIPOS_CAMPO: readonly { tipo: TipoCampo; nome: string }[] = [
  { tipo: "TEXTO", nome: "Texto" },
  { tipo: "NUMERO", nome: "Número" },
  { tipo: "DATA", nome: "Data" },
  { tipo: "LINK", nome: "Link" },
  { tipo: "VIDEO", nome: "Vídeo" },
];

/** O valor como a página mostra: data em dd/mm/aaaa, link sem o "https://"; o resto como foi digitado. */
export function formatarValorCampo(tipo: TipoCampo, valor: string): string {
  if (tipo === "DATA") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : valor;
  }
  if (tipo === "LINK" || tipo === "VIDEO") return valor.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return valor;
}

/** Endereço seguro para o `href` de um campo LINK: só http(s). Qualquer outra coisa (ou valor antigo) não vira link. */
export function hrefDoCampo(valor: string): string | null {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

/** "Direção", "Direção e Duração", "Direção, Duração e Elenco". */
export function listarNomes(nomes: readonly string[]): string {
  if (nomes.length <= 1) return nomes.join("");
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

/** A pergunta antes de mudar itens de categoria (D1), com os campos que se perdem. */
export function avisoCamposPerdidos(rotulos: readonly string[]): string {
  const plural = rotulos.length > 1;
  return `Essa categoria não possui ${plural ? "os campos" : "o campo"} ${listarNomes(rotulos)} e os dados serão perdidos. Tem certeza que deseja fazer a migração?`;
}
