"use client";

import type { ReactNode } from "react";
import type { CampoCandidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import type { ItemLista } from "@/store/seletores/candidatos";
import { AvisoVotoProprio } from "./AvisoVotoProprio";
import { CamposExtras, temDetalhes } from "./CamposExtras";
import { ImagemCandidato } from "./ImagemCandidato";

/** Destaque vindo do mosaico do hero (19/10/2026): este cartão em evidência, os demais em tons de cinza. */
export type DestaqueCartao = "DESTACADO" | "APAGADO";

export type CartaoCandidatoProps = {
  item: ItemLista;
  campos: readonly CampoCandidato[];
  aoVerDetalhes: (candidatoId: string) => void;
  /** Slot do topo (Etapa 5: "Sua escolha", "Seu voto atual"). */
  selo?: ReactNode;
  /** Slot do rodapé ("Votar"). */
  acao?: ReactNode;
  destaque?: DestaqueCartao | null;
};

const ESTILOS = {
  NORMAL: "shadow-sm ring-1 ring-tema-borda/80 hover:-translate-y-1 hover:shadow-xl hover:shadow-marca-noite/15",
  DESTACADO: "z-10 scale-[1.03] shadow-2xl shadow-tema-primaria/30 ring-4 ring-tema-primaria",
  APAGADO: "opacity-70 shadow-sm ring-1 ring-tema-borda/80 grayscale hover:-translate-y-1",
};

/**
 * Cartão da lista de votação da entrada (Etapa 4, seção 5.5). Nunca mostra número de votos. A escolha aparece no
 * slot do topo (selo "Sua escolha"); o slot de ação leva o "Votar".
 * 19/10/2026: imagem quadrada (as dos projetos são logos e cartazes 1:1, que o 4:3 cortava) e, no lugar do botão
 * "Detalhes", o cartão inteiro abre o detalhe: um botão invisível cobre o cartão (com `data-candidato-id`, para a
 * devolução do foco) e a ação fica acima dele. No teclado e no leitor de tela: "Ver detalhes: título" e "Votar".
 * Isolado: sem isso, o Safari perde o arredondamento durante o zoom da imagem.
 */
export function CartaoCandidato({ item, campos, aoVerDetalhes, selo, acao, destaque = null }: CartaoCandidatoProps) {
  const { candidato, bloqueadoVotoProprio } = item;
  const tituloId = `cartao-titulo-${candidato.id}`;
  const dicaId = `cartao-dica-${candidato.id}`;

  return (
    <article
      data-cartao-candidato={candidato.id}
      aria-labelledby={tituloId}
      aria-describedby={bloqueadoVotoProprio ? dicaId : undefined}
      className={cx(
        "group relative isolate flex h-full flex-col overflow-hidden rounded-2xl bg-tema-fundo transition duration-500 sm:rounded-3xl",
        ESTILOS[destaque ?? "NORMAL"],
      )}
    >
      <div className="relative overflow-hidden">
        <ImagemCandidato
          titulo={candidato.titulo}
          imagemUrl={candidato.imagemUrl}
          proporcao="1/1"
          className="transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 1152px) 17rem, (min-width: 1024px) 24vw, (min-width: 768px) 32vw, 48vw"
        />
        {selo && <div className="absolute left-2 top-2 sm:left-3 sm:top-3">{selo}</div>}
      </div>
      <div aria-hidden className="h-1 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-3 sm:p-4">
        <h3 id={tituloId} className="line-clamp-2 font-display text-base font-extrabold leading-snug tracking-tight wrap-anywhere sm:text-lg">
          {candidato.titulo}
        </h3>
        <CamposExtras candidato={candidato} campos={campos} modo="resumo" />
        {bloqueadoVotoProprio && <AvisoVotoProprio dicaId={dicaId} />}
        {/* Cobre o cartão inteiro (posicionado no article); o anel de foco fica por dentro, que o article corta o de fora.
            Sem nada além do título (nem campo com valor), não há detalhe para abrir. */}
        {temDetalhes(candidato, campos) && (
          <button
            type="button"
            data-candidato-id={candidato.id}
            aria-label={`Ver detalhes: ${candidato.titulo}`}
            onClick={() => aoVerDetalhes(candidato.id)}
            className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-offset-[-4px] sm:rounded-3xl"
          />
        )}
        {acao && <div className="relative z-20 mt-auto flex pt-1 *:w-full">{acao}</div>}
      </div>
    </article>
  );
}
