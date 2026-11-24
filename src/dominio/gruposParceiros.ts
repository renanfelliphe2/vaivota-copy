import type { GrupoParceiro, Parceiro } from "./tipos";

// Grupos de parceiros (demanda C1, 25/11/2026). Funções puras: a tela e o servidor usam as mesmas regras.

/** Os grupos que todo evento novo ganha, nesta ordem. */
export const GRUPOS_PADRAO = ["Patrocínio", "Realização"] as const;

export const LIMITES_GRUPO = { nome: [2, 40] as const, maximo: 10 };

/** Erros por posição (`grupo-<i>`) e o geral (`grupos`). */
export function validarGrupos(nomes: readonly string[]): Record<string, string> {
  const erros: Record<string, string> = {};
  if (nomes.length > LIMITES_GRUPO.maximo) erros.grupos = `Use até ${LIMITES_GRUPO.maximo} grupos.`;
  const vistos = new Set<string>();
  nomes.forEach((nome, i) => {
    const t = nome.trim();
    const chave = t.toLocaleLowerCase("pt-BR");
    const [min, max] = LIMITES_GRUPO.nome;
    if (!t) erros[`grupo-${i}`] = "Informe o nome do grupo.";
    else if (t.length < min || t.length > max) erros[`grupo-${i}`] = `Use de ${min} a ${max} caracteres.`;
    else if (vistos.has(chave)) erros[`grupo-${i}`] = "Já existe um grupo com este nome.";
    vistos.add(chave);
  });
  return erros;
}

export type BlocoParceiros = { grupo: Pick<GrupoParceiro, "id" | "nome"> | null; parceiros: Parceiro[] };

/**
 * Os parceiros como a página os mostra: um bloco por grupo, na ordem dos grupos, cada um com os seus parceiros na ordem da lista.
 * Grupo sem parceiro fica de fora. Quem não está em nenhum grupo vai num último bloco sem grupo (`grupo` null), para não sumir.
 */
export function parceirosPorGrupo(grupos: readonly GrupoParceiro[], parceiros: readonly Parceiro[]): BlocoParceiros[] {
  const ordenados = [...parceiros].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id));
  const blocos: BlocoParceiros[] = [];
  const agrupados = new Set<string>();
  for (const g of [...grupos].sort((a, b) => a.ordem - b.ordem || a.id.localeCompare(b.id))) {
    const ids = new Set(g.parceiroIds);
    const doGrupo = ordenados.filter((p) => ids.has(p.id));
    doGrupo.forEach((p) => agrupados.add(p.id));
    if (doGrupo.length) blocos.push({ grupo: { id: g.id, nome: g.nome }, parceiros: doGrupo });
  }
  const soltos = ordenados.filter((p) => !agrupados.has(p.id));
  if (soltos.length) blocos.push({ grupo: null, parceiros: soltos });
  return blocos;
}
