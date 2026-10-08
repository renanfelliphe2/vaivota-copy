import type { Pesos } from "@/dominio/placar";
import { cx } from "@/lib/classes";

const ESTILOS = {
  POPULAR: { rotulo: "Popular", classe: "bg-tema-primaria text-tema-sobre-primaria" },
  JURI: { rotulo: "Júri", classe: "bg-tema-secundaria text-tema-sobre-secundaria" },
  INFANTIL: { rotulo: "Infantil", classe: "bg-tema-texto-suave text-tema-fundo" },
} as const;

/** Barra empilhada com rótulos dentro dos segmentos (nunca só cor). Só tokens do tema. */
export function BarraPesos({ pesos }: { pesos: Pesos }) {
  const grupos = (Object.keys(ESTILOS) as (keyof typeof ESTILOS)[]).filter((g) => pesos[g] > 0);
  const soma = pesos.POPULAR + pesos.JURI + pesos.INFANTIL;
  return (
    <div aria-hidden className="flex h-10 w-full overflow-hidden rounded-xl border border-tema-borda bg-tema-superficie">
      {grupos.map((g) => (
        <div
          key={g}
          style={{ width: `${(pesos[g] / Math.max(soma, 100)) * 100}%` }}
          className={cx("flex min-w-0 items-center justify-center overflow-hidden px-1 text-xs font-semibold whitespace-nowrap", ESTILOS[g].classe)}
        >
          {ESTILOS[g].rotulo} {pesos[g]}%
        </div>
      ))}
    </div>
  );
}
