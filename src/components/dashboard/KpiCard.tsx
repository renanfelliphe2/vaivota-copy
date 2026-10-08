import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Cartao } from "@/components/ui/Cartao";
import { cx } from "@/lib/classes";

export function KpiCard({
  titulo,
  valor,
  dica,
  icone: Icone,
  className,
}: {
  titulo: string;
  valor: ReactNode;
  dica?: ReactNode;
  icone?: LucideIcon;
  className?: string;
}) {
  return (
    <Cartao className={cx("flex flex-col gap-1", className)}>
      <p className="flex items-center gap-2 text-sm font-semibold text-tema-texto-suave">
        {Icone && <Icone aria-hidden className="size-4" />}
        {titulo}
      </p>
      <p className="text-3xl font-bold tabular-nums">{valor}</p>
      {dica && <p className="text-sm text-tema-texto-suave">{dica}</p>}
    </Cartao>
  );
}

/** Título de bloco do painel (h2) com ação opcional à direita. */
export function TituloBloco({ children, acao, id }: { children: ReactNode; acao?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="text-xl font-bold">
        {children}
      </h2>
      {acao}
    </div>
  );
}
