import { cx } from "@/lib/classes";

// Etapa 7 (D14, seção 5.8): barras horizontais com o valor escrito ao lado (nunca só cor). Sem store nem
// serviços. A lista é a própria alternativa textual (cada linha traz rótulo e valor).

export type ItemBarra = { rotulo: string; valor: number; destaque?: boolean };

export type BarChartProps = {
  titulo: string;
  itens: ItemBarra[];
  formato: (valor: number) => string;
  /** Resumo para leitor de tela. */
  alt: string;
  className?: string;
};

export function BarChart({ titulo, itens, formato, alt, className }: BarChartProps) {
  const maximo = Math.max(0, ...itens.map((i) => i.valor));
  return (
    <figure className={cx("flex flex-col gap-3", className)}>
      <figcaption className="text-base font-semibold">{titulo}</figcaption>
      <p className="sr-only">{alt}</p>
      <ol className="flex flex-col gap-2">
        {itens.map((item, i) => {
          const largura = maximo > 0 ? Math.max(1, (item.valor / maximo) * 100) : 0;
          return (
            <li key={`${item.rotulo}-${i}`} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center sm:gap-3">
              <span className={cx("truncate text-sm", item.destaque && "font-semibold")} title={item.rotulo}>
                {item.rotulo}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-4 flex-1 overflow-hidden rounded-full bg-tema-superficie ring-1 ring-tema-borda">
                  <span
                    aria-hidden
                    className="block h-full rounded-full bg-tema-primaria-texto motion-safe:transition-[width] motion-safe:duration-500"
                    style={{ width: `${largura}%` }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">{formato(item.valor)}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
