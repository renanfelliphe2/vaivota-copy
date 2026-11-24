// "Sobre o evento" (demanda C2, 25/11/2026): título, texto e imagem no fim da página do evento. Funções puras.

export const LIMITES_SOBRE = { titulo: 120, texto: 3000 } as const;

export type TrechoSobre = { texto: string; negrito: boolean };

/**
 * O texto em parágrafos (separados por uma ou mais linhas em branco; quebra simples vira espaço) e cada parágrafo em trechos,
 * com **negrito** entre dois asteriscos duplos. Um `**` sem par fica como texto. Nunca vira HTML: quem desenha monta os elementos.
 */
export function paragrafosDoSobre(texto: string | null | undefined): TrechoSobre[][] {
  if (!texto?.trim()) return [];
  return texto
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map(trechosComNegrito);
}

function trechosComNegrito(paragrafo: string): TrechoSobre[] {
  const partes = paragrafo.split("**");
  // Número par de partes = um `**` sem par: o último volta a ser texto.
  if (partes.length % 2 === 0) partes.splice(partes.length - 2, 2, `${partes[partes.length - 2]}**${partes[partes.length - 1]}`);
  return partes.map((t, i) => ({ texto: t, negrito: i % 2 === 1 })).filter((t) => t.texto.length > 0);
}

/** A seção aparece? Precisa de título ou de texto (só a imagem não basta). */
export function temSobre(e: { sobreTitulo?: string | null; sobreTexto?: string | null }): boolean {
  return Boolean(e.sobreTitulo?.trim() || e.sobreTexto?.trim());
}

/** Erros por campo (`sobreTitulo`, `sobreTexto`). */
export function validarSobre(d: { titulo: string; texto: string }): Record<string, string> {
  const erros: Record<string, string> = {};
  if (d.titulo.trim().length > LIMITES_SOBRE.titulo) erros.sobreTitulo = `Use até ${LIMITES_SOBRE.titulo} caracteres.`;
  if (d.texto.trim().length > LIMITES_SOBRE.texto) erros.sobreTexto = `Use até ${LIMITES_SOBRE.texto} caracteres.`;
  return erros;
}
