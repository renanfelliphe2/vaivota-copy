"use client";

import { descreverContagem, formatarContagem, restanteAte } from "@/lib/tempo";
import { cx } from "@/lib/classes";
import { useAgora } from "@/store/seletores/relogio";

export type ContagemRegressivaProps = {
  /** Instante alvo em ms (relógio simulado). */
  alvoMs: number;
  /** Prefixo do nome acessível, ex.: "Encerra em". */
  rotulo: string;
  /** Exibido quando a contagem chega a zero. A contagem nunca muda estado por conta própria (D7). */
  textoZerado: string;
  className?: string;
};

/**
 * role="timer" sem anúncio a cada segundo (aria-live="off"); o nome acessível muda só a cada minuto.
 * Usa useAgora, que vale T0 no servidor: sem aviso de hidratação.
 */
export function ContagemRegressiva({ alvoMs, rotulo, textoZerado, className }: ContagemRegressivaProps) {
  const agora = useAgora();
  const restante = restanteAte(alvoMs, agora);
  const zerada = restante === 0;

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={zerada ? textoZerado : `${rotulo} ${descreverContagem(restante)}`}
      className={cx("font-semibold tabular-nums", className)}
    >
      {zerada ? textoZerado : formatarContagem(restante)}
    </span>
  );
}
