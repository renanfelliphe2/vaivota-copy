"use client";

import { ArrowRight, Heart, LayoutGrid } from "lucide-react";
import type { CSSProperties } from "react";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";

/** Coraçõezinhos que sobem em volta do coração grande: destino (x, y), giro, atraso e tamanho. */
const CORACOEZINHOS = [
  { x: "-92px", y: "-70px", giro: "-25deg", atraso: "150ms", tamanho: "size-5" },
  { x: "88px", y: "-82px", giro: "20deg", atraso: "220ms", tamanho: "size-4" },
  { x: "-118px", y: "6px", giro: "-35deg", atraso: "300ms", tamanho: "size-3.5" },
  { x: "114px", y: "-8px", giro: "30deg", atraso: "180ms", tamanho: "size-5" },
  { x: "-60px", y: "-112px", giro: "-10deg", atraso: "360ms", tamanho: "size-3.5" },
  { x: "56px", y: "-118px", giro: "12deg", atraso: "260ms", tamanho: "size-4" },
  { x: "-30px", y: "-136px", giro: "6deg", atraso: "420ms", tamanho: "size-3" },
  { x: "26px", y: "-60px", giro: "-14deg", atraso: "480ms", tamanho: "size-3" },
];

const estilo = (vars: Record<string, string>) => vars as CSSProperties;

export type DialogoCoracaoProps = {
  aberto: boolean;
  /** Nome da categoria em que o voto entrou. Nunca o nome do filme (rev. 3 E8: o sucesso do público não diz em quem). */
  categoria: string;
  /** A próxima categoria em que a pessoa ainda não votou (null: votou em todas). */
  proxima: { nome: string; href: string } | null;
  hrefCategorias: string;
  aoFechar: () => void;
  focoAoFechar?: () => HTMLElement | null;
};

/**
 * Confirmação do voto numa categoria (09/11/2026, organograma do Festival): o pop-up com o coração animado. O coração estala,
 * uma onda de luz se abre e coraçõezinhos sobem (só em CSS; com prefers-reduced-motion, o coração aparece parado). Leva à
 * próxima categoria pendente, se houver.
 */
export function DialogoCoracao({ aberto, categoria, proxima, hrefCategorias, aoFechar, focoAoFechar }: DialogoCoracaoProps) {
  return (
    <Dialogo
      aberto={aberto}
      aoFechar={aoFechar}
      focoAoFechar={focoAoFechar}
      titulo="Voto registrado!"
      rodape={
        proxima ? (
          <>
            <Botao variante="contorno" onClick={aoFechar}>
              Fechar
            </Botao>
            <Botao href={proxima.href} onClick={aoFechar} icone={<ArrowRight aria-hidden className="size-4" />}>
              Votar em {proxima.nome}
            </Botao>
          </>
        ) : (
          <>
            <Botao variante="contorno" href={hrefCategorias} onClick={aoFechar} icone={<LayoutGrid aria-hidden className="size-4" />}>
              Ver as categorias
            </Botao>
            <Botao onClick={aoFechar}>Fechar</Botao>
          </>
        )
      }
    >
      <div role="status" className="flex flex-col items-center gap-4 pb-2 pt-4 text-center">
        <div aria-hidden className="relative grid size-40 place-items-center">
          <span className="vv-coracao-onda absolute inset-2 rounded-full bg-tema-primaria/25" />
          <span className="vv-coracao-onda absolute inset-6 rounded-full bg-tema-secundaria/30 [animation-delay:320ms]" />
          <span className="vv-estalo relative grid size-28 place-items-center rounded-full bg-tema-primaria shadow-xl shadow-tema-primaria/30">
            <Heart className="vv-coracao-batida size-14 text-tema-sobre-primaria" fill="currentColor" strokeWidth={1.5} />
          </span>
          {CORACOEZINHOS.map((c, i) => (
            <Heart
              key={i}
              className={`vv-coracaozinho ${c.tamanho} ${i % 2 === 0 ? "text-tema-primaria" : "text-tema-secundaria"}`}
              fill="currentColor"
              strokeWidth={0}
              style={estilo({ "--x": c.x, "--y": c.y, "--giro": c.giro, "--atraso": c.atraso })}
            />
          ))}
        </div>
        <p className="text-lg">
          Seu voto em <strong>{categoria}</strong> foi registrado. Obrigado por participar!
        </p>
        <p className="text-sm text-tema-texto-suave">
          {proxima ? `Ainda dá para votar em ${proxima.nome}.` : "Você votou em todas as categorias. O resultado será divulgado pela organização."}
        </p>
      </div>
    </Dialogo>
  );
}
