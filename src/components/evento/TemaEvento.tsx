"use client";

import { useMemo, type CSSProperties, type HTMLAttributes } from "react";
import { cx } from "@/lib/classes";
import { calcularTokens, type CoresTema } from "@/lib/tema";
import { useEventoAtivo } from "@/store/seletores/evento";

export type TemaEventoProps = HTMLAttributes<HTMLDivElement> & {
  /** Tem precedência sobre o tema do evento ativo (prévia da Etapa 6). */
  tema?: CoresTema;
  inert?: boolean;
};

/** Aplica os tokens --tema-* do evento ativo (ou do `tema` recebido) e as classes base. */
export function TemaEvento({ tema, className, style, children, ...resto }: TemaEventoProps) {
  const temaAtivo = useEventoAtivo()?.tema;
  const cores = tema ?? temaAtivo;
  const tokens = useMemo(() => (cores ? calcularTokens(cores) : null), [cores]);

  const estilo = tokens ? ({ ...tokens.variaveis, colorScheme: tokens.esquemaCor, ...style } as CSSProperties) : style;

  return (
    <div {...resto} style={estilo} className={cx("bg-tema-fundo text-tema-texto font-tema", className)}>
      {children}
    </div>
  );
}
