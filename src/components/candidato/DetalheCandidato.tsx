"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { PosicaoNaOrdem } from "@/dominio/ordemVotacao";
import type { CampoCandidato } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import type { ItemLista } from "@/store/seletores/candidatos";
import { AvisoVotoProprio } from "./AvisoVotoProprio";
import { CamposExtras } from "./CamposExtras";
import { ImagemCandidato } from "./ImagemCandidato";

export type DetalheCandidatoProps = {
  /** null = fechado. */
  posicao: PosicaoNaOrdem<ItemLista> | null;
  campos: readonly CampoCandidato[];
  aoFechar: () => void;
  aoNavegar: (candidatoId: string) => void;
  /** Foco ao fechar: o "Ver detalhes" do último candidato exibido. */
  focoAoFechar?: () => HTMLElement | null;
  /** Rodapé, ao lado de "Fechar" (Etapa 5). */
  renderAcoes?: (item: ItemLista) => ReactNode;
};

/** Detalhe sobre o Dialogo (Etapa 4, D3): bottom sheet no celular, modal no desktop. */
export function DetalheCandidato({ posicao, campos, aoFechar, aoNavegar, focoAoFechar, renderAcoes }: DetalheCandidatoProps) {
  const item = posicao?.item ?? null;
  const candidato = item?.candidato;
  const dicaId = candidato ? `detalhe-dica-${candidato.id}` : undefined;

  return (
    <Dialogo
      aberto={posicao !== null}
      aoFechar={aoFechar}
      focoAoFechar={focoAoFechar}
      titulo={candidato?.titulo ?? ""}
      className="max-h-[95dvh] sm:max-w-2xl!"
      rodape={
        item && (
          <>
            <Botao variante="contorno" onClick={aoFechar}>
              Fechar
            </Botao>
            {renderAcoes?.(item)}
          </>
        )
      }
    >
      {posicao && item && candidato && (
        <div className="flex flex-col gap-4">
          <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="16/9" className="rounded-xl" sizes="(min-width: 640px) 640px, 100vw" />
          {item.bloqueadoVotoProprio && dicaId && <AvisoVotoProprio dicaId={dicaId} />}
          <CamposExtras candidato={candidato} campos={campos} modo="completo" />
          {posicao.total > 1 && (
            <nav aria-label="Navegar entre opções" className="flex items-center justify-between gap-2 border-t border-tema-borda pt-4">
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                disabled={!posicao.anterior}
                onClick={() => posicao.anterior && aoNavegar(posicao.anterior.candidato.id)}
                icone={<ChevronLeft aria-hidden className="size-4" />}
              >
                Anterior
              </Botao>
              <span className="text-sm tabular-nums text-tema-texto-suave">
                {posicao.indice + 1} de {posicao.total}
              </span>
              <Botao
                variante="fantasma"
                tamanho="pequeno"
                disabled={!posicao.seguinte}
                onClick={() => posicao.seguinte && aoNavegar(posicao.seguinte.candidato.id)}
              >
                Seguinte
                <ChevronRight aria-hidden className="ml-1 inline size-4" />
              </Botao>
            </nav>
          )}
        </div>
      )}
    </Dialogo>
  );
}
