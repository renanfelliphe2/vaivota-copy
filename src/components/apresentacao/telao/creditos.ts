import type { GrupoParceiro, Parceiro } from "@/dominio/tipos";
import type { CreditosParceiros } from "./CenasCerimonia";

/**
 * Os parceiros como créditos de filme no pé do resultado (25/11/2026): por grupo (Patrocínio, Realização…), na ordem dos grupos;
 * quem não está em grupo nenhum vai em "Parceiros".
 */
export function creditosDosParceiros(parceiros: readonly Parceiro[], grupos: readonly GrupoParceiro[]): CreditosParceiros {
  const porId = new Map(parceiros.map((p) => [p.id, p]));
  const lista = grupos
    .map((g) => ({ titulo: g.nome, nomes: g.parceiroIds.flatMap((id) => (porId.has(id) ? [porId.get(id)!.nome] : [])) }))
    .filter((g) => g.nomes.length > 0);
  const agrupados = new Set(grupos.flatMap((g) => g.parceiroIds));
  const soltos = parceiros.filter((p) => !agrupados.has(p.id)).map((p) => p.nome);
  return soltos.length ? [...lista, { titulo: "Parceiros", nomes: soltos }] : lista;
}
