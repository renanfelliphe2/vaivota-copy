"use client";

import type { ReactNode } from "react";
import type { CampoCandidato } from "@/dominio/tipos";
import type { ItemLista } from "@/store/seletores/candidatos";
import { CartaoCandidato } from "./CartaoCandidato";

export type ListaCandidatosProps = {
  itens: readonly ItemLista[];
  campos: readonly CampoCandidato[];
  aoVerDetalhes: (candidatoId: string) => void;
  /** Rodapé do cartão ("Votar"). */
  renderAcao?: (item: ItemLista) => ReactNode;
  /** Topo do cartão ("Seu voto atual", na Etapa 5). */
  renderSelo?: (item: ItemLista) => ReactNode;
};

/** Grade 1/2/3 colunas (Etapa 4, seção 5.5). Sem os slots, a lista é somente leitura. */
export function ListaCandidatos({ itens, campos, aoVerDetalhes, renderAcao, renderSelo }: ListaCandidatosProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((item) => (
        <li key={item.candidato.id}>
          <CartaoCandidato
            item={item}
            campos={campos}
            aoVerDetalhes={aoVerDetalhes}
            acao={renderAcao?.(item)}
            selo={renderSelo?.(item)}
          />
        </li>
      ))}
    </ul>
  );
}
