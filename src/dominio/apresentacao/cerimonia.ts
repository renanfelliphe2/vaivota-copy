import type { ConfigTrofeu, Grupo, ModeloOrdemCerimonia, OrdemCerimonia } from "../tipos";

// Cerimônia no telão (25/11/2026): os troféus por tipo de votação, o pódio de cada categoria e a ordem da revelação. Puro: o
// roteiro (roteiro.ts) e o editor da ordem (Configuração > Categorias) usam as mesmas funções, então a lista que o admin vê é a
// que o telão segue.

/** Ordem dos troféus na lista (e nos modelos): a do protótipo aprovado. */
export const GRUPOS_TROFEU: readonly Grupo[] = ["POPULAR", "JURI", "INFANTIL"];

/** De que votação sai cada troféu (rótulo fixo da tela de configuração). */
export const ORIGEM_TROFEU: Record<Grupo, string> = {
  POPULAR: "Votação Online",
  JURI: "Votação Especializada",
  INFANTIL: "Votação Infantil",
};

export const TROFEUS_PADRAO: Record<Grupo, ConfigTrofeu> = {
  POPULAR: { ativo: true, escopo: "CATEGORIA", mostrarVotos: true },
  JURI: { ativo: true, escopo: "CATEGORIA", mostrarVotos: true },
  INFANTIL: { ativo: true, escopo: "CATEGORIA", mostrarVotos: true },
};

export const ORDEM_PADRAO: OrdemCerimonia = { modelo: "CATEGORIA", ultimoPrimeiro: true, itens: [], mostrarDesempate: true };

export const MODELOS_ORDEM: readonly ModeloOrdemCerimonia[] = ["CATEGORIA", "POSICAO", "INTERCALADO", "PERSONALIZADA"];

export const PODIO = { minimo: 1, maximo: 10, padrao: 3 } as const;

/** Frase no lugar do QR Code na categoria do totem, quando a categoria não define a dela. */
export const MENSAGEM_TOTEM_PADRAO = "Vote nos totens";
export const LIMITE_MENSAGEM_TELAO = 60;
/** Itens de uma ordem personalizada (troféus + posições de todas as categorias, com folga). */
export const LIMITE_ITENS_ORDEM = 400;

function objeto(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Lê o JSON gravado (ou nada) sem confiar nele: o que faltar ou vier torto fica com o padrão. */
export function lerTrofeus(v: unknown): Record<Grupo, ConfigTrofeu> {
  const o = objeto(v);
  const um = (g: Grupo): ConfigTrofeu => {
    const t = objeto(o?.[g]);
    const p = TROFEUS_PADRAO[g];
    return {
      ativo: typeof t?.ativo === "boolean" ? t.ativo : p.ativo,
      escopo: t?.escopo === "EVENTO" || t?.escopo === "CATEGORIA" ? t.escopo : p.escopo,
      mostrarVotos: typeof t?.mostrarVotos === "boolean" ? t.mostrarVotos : p.mostrarVotos,
    };
  };
  return { POPULAR: um("POPULAR"), JURI: um("JURI"), INFANTIL: um("INFANTIL") };
}

export function lerOrdem(v: unknown): OrdemCerimonia {
  const o = objeto(v);
  const modelo = MODELOS_ORDEM.includes(o?.modelo as ModeloOrdemCerimonia) ? (o!.modelo as ModeloOrdemCerimonia) : ORDEM_PADRAO.modelo;
  const itens = Array.isArray(o?.itens) ? (o!.itens as unknown[]).filter((x): x is string => typeof x === "string").slice(0, LIMITE_ITENS_ORDEM) : [];
  return {
    modelo,
    ultimoPrimeiro: typeof o?.ultimoPrimeiro === "boolean" ? o.ultimoPrimeiro : ORDEM_PADRAO.ultimoPrimeiro,
    itens,
    mostrarDesempate: typeof o?.mostrarDesempate === "boolean" ? o.mostrarDesempate : ORDEM_PADRAO.mostrarDesempate,
  };
}

/** Os votos e a porcentagem aparecem nesta posição? Sem valor gravado, só no 1º lugar. */
export function mostraVotosNaPosicao(podioVotos: readonly boolean[], posicao: number): boolean {
  return podioVotos[posicao - 1] ?? posicao === 1;
}

export function tamanhoDoPodio(n: number): number {
  return Number.isInteger(n) ? Math.min(PODIO.maximo, Math.max(PODIO.minimo, n)) : PODIO.padrao;
}

export type CategoriaDaCerimonia = { id: string; podioTamanho: number };

export type ItemCerimonia =
  | { id: string; tipo: "TROFEU"; grupo: Grupo; categoriaId: string | null }
  | { id: string; tipo: "POSICAO"; categoriaId: string; posicao: number };

export function idTrofeu(grupo: Grupo, categoriaId: string | null): string {
  return categoriaId ? `T:${grupo}:${categoriaId}` : `T:${grupo}`;
}

export function idPosicao(categoriaId: string, posicao: number): string {
  return `P:${categoriaId}:${posicao}`;
}

function trofeu(grupo: Grupo, categoriaId: string | null): ItemCerimonia {
  return { id: idTrofeu(grupo, categoriaId), tipo: "TROFEU", grupo, categoriaId };
}

function posicaoDe(categoriaId: string, posicao: number): ItemCerimonia {
  return { id: idPosicao(categoriaId, posicao), tipo: "POSICAO", categoriaId, posicao };
}

/**
 * A ordem da revelação, sem olhar o resultado (o roteiro descarta depois o que não tiver vencedor). `gruposAtivos`: os tipos de
 * votação ligados no evento; troféu de votação desligada não entra.
 *  - CATEGORIA: troféus do evento; depois, categoria a categoria, os troféus dela e o pódio dela;
 *  - POSICAO: troféus do evento e os das categorias; depois o mesmo lugar em todas as categorias, lugar a lugar;
 *  - INTERCALADO: cada troféu (com todas as suas categorias) antes de um lugar; o que sobrar no fim;
 *  - PERSONALIZADA: a lista gravada; o que faltar nela (um troféu ligado depois, um pódio maior) entra no fim, na ordem de CATEGORIA.
 */
export function ordenarCerimonia(
  categorias: readonly CategoriaDaCerimonia[],
  trofeus: Record<Grupo, ConfigTrofeu>,
  gruposAtivos: readonly Grupo[],
  ordem: OrdemCerimonia,
): ItemCerimonia[] {
  const ligados = GRUPOS_TROFEU.filter((g) => trofeus[g].ativo && gruposAtivos.includes(g));
  const doEvento = ligados.filter((g) => trofeus[g].escopo === "EVENTO").map((g) => trofeu(g, null));
  const porCategoria = ligados.filter((g) => trofeus[g].escopo === "CATEGORIA");
  const podio = (c: CategoriaDaCerimonia) => {
    const lista = Array.from({ length: tamanhoDoPodio(c.podioTamanho) }, (_, i) => posicaoDe(c.id, i + 1));
    return ordem.ultimoPrimeiro ? lista.reverse() : lista;
  };
  const maior = categorias.reduce((m, c) => Math.max(m, tamanhoDoPodio(c.podioTamanho)), 0);
  const niveis = Array.from({ length: maior }, (_, i) => i + 1);
  if (ordem.ultimoPrimeiro) niveis.reverse();
  const nivel = (k: number) => categorias.filter((c) => tamanhoDoPodio(c.podioTamanho) >= k).map((c) => posicaoDe(c.id, k));

  const porCategoriaPrimeiro = [...doEvento, ...categorias.flatMap((c) => [...porCategoria.map((g) => trofeu(g, c.id)), ...podio(c)])];
  switch (ordem.modelo) {
    case "CATEGORIA":
      return porCategoriaPrimeiro;
    case "POSICAO":
      return [...doEvento, ...porCategoria.flatMap((g) => categorias.map((c) => trofeu(g, c.id))), ...niveis.flatMap(nivel)];
    case "INTERCALADO": {
      const blocos = ligados.map((g) => (trofeus[g].escopo === "EVENTO" ? [trofeu(g, null)] : categorias.map((c) => trofeu(g, c.id))));
      return [...niveis.flatMap((k, i) => [...(blocos[i] ?? []), ...nivel(k)]), ...blocos.slice(niveis.length).flat()];
    }
    case "PERSONALIZADA": {
      const porId = new Map(porCategoriaPrimeiro.map((x) => [x.id, x]));
      const vistos = new Set<string>();
      const lista: ItemCerimonia[] = [];
      for (const id of ordem.itens) {
        const x = porId.get(id);
        if (x && !vistos.has(id)) {
          vistos.add(id);
          lista.push(x);
        }
      }
      return [...lista, ...porCategoriaPrimeiro.filter((x) => !vistos.has(x.id))];
    }
  }
}
