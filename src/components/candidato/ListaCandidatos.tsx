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
  /** Candidato em destaque, vindo do mosaico do hero (19/10/2026): os demais ficam em tons de cinza. */
  destaqueId?: string | null;
};

/**
 * Grade (Etapa 4, seção 5.5). Sem os slots, a lista é somente leitura. 19/10/2026: com o cartão quadrado, 2 colunas já
 * no celular (8 projetos viram 4 linhas, não 8 telas), 3 no tablet e 4 no desktop.
 */
export function ListaCandidatos({ itens, campos, aoVerDetalhes, renderAcao, renderSelo, destaqueId = null }: ListaCandidatosProps) {
  // Destaque de um candidato que não está na lista (saiu da votação no meio) não apaga os outros.
  const comDestaque = destaqueId !== null && itens.some((i) => i.candidato.id === destaqueId);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {itens.map((item) => (
        <li key={item.candidato.id}>
          <CartaoCandidato
            item={item}
            campos={campos}
            aoVerDetalhes={aoVerDetalhes}
            acao={renderAcao?.(item)}
            selo={renderSelo?.(item)}
            destaque={!comDestaque ? null : item.candidato.id === destaqueId ? "DESTACADO" : "APAGADO"}
          />
        </li>
      ))}
    </ul>
  );
}
