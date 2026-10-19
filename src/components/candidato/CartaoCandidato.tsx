"use client";

import { Eye } from "lucide-react";
import type { ReactNode } from "react";
import type { CampoCandidato } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import type { ItemLista } from "@/store/seletores/candidatos";
import { AvisoVotoProprio } from "./AvisoVotoProprio";
import { CamposExtras } from "./CamposExtras";
import { ImagemCandidato } from "./ImagemCandidato";

export type CartaoCandidatoProps = {
  item: ItemLista;
  campos: readonly CampoCandidato[];
  aoVerDetalhes: (candidatoId: string) => void;
  /** Slot do topo (Etapa 5: "Sua escolha", "Seu voto atual"). */
  selo?: ReactNode;
  /** Slot do rodapé ("Votar"). */
  acao?: ReactNode;
};

/**
 * Cartão da lista de votação da entrada (Etapa 4, seção 5.5). Nunca mostra número de votos. A escolha aparece no
 * slot do topo (selo "Sua escolha"); o slot de ação leva o "Votar".
 */
export function CartaoCandidato({ item, campos, aoVerDetalhes, selo, acao }: CartaoCandidatoProps) {
  const { candidato, bloqueadoVotoProprio } = item;
  const tituloId = `cartao-titulo-${candidato.id}`;
  const dicaId = `cartao-dica-${candidato.id}`;

  return (
    <article
      aria-labelledby={tituloId}
      aria-describedby={bloqueadoVotoProprio ? dicaId : undefined}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-tema-borda bg-tema-superficie"
    >
      <div className="relative">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
        {selo && <div className="absolute left-3 top-3">{selo}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 id={tituloId} className="line-clamp-2 text-lg font-bold leading-snug">
          {candidato.titulo}
        </h2>
        <CamposExtras candidato={candidato} campos={campos} modo="resumo" />
        {bloqueadoVotoProprio && <AvisoVotoProprio dicaId={dicaId} />}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Botao
            variante="contorno"
            tamanho="pequeno"
            data-candidato-id={candidato.id}
            aria-label={`Ver detalhes: ${candidato.titulo}`}
            icone={<Eye aria-hidden className="size-4" />}
            onClick={() => aoVerDetalhes(candidato.id)}
          >
            Ver detalhes
          </Botao>
          {acao}
        </div>
      </div>
    </article>
  );
}
