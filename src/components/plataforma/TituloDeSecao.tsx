import type { ReactNode } from "react";
import { cx } from "@/lib/classes";

type Props = {
  id: string;
  rotulo: string;
  titulo: ReactNode;
  texto?: ReactNode;
  /** Sobre o palco escuro dos resultados. */
  sobreEscuro?: boolean;
};

/** Cabeçalho das seções da landing: rótulo com traço, título e um parágrafo de apoio. */
export function TituloDeSecao({ id, rotulo, titulo, texto, sobreEscuro }: Props) {
  return (
    <div className="vv-surgir flex max-w-2xl flex-col gap-4">
      <p
        className={cx(
          "inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em]",
          sobreEscuro ? "text-vv-destaque-claro" : "text-vv-destaque-texto",
        )}
      >
        <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
        {rotulo}
      </p>
      <h2 id={id} className="text-balance text-3xl font-bold tracking-tight sm:text-[2.625rem] sm:leading-[1.1]">
        {titulo}
      </h2>
      {texto && <p className={cx("text-pretty text-lg leading-relaxed", sobreEscuro ? "text-white/80" : "text-tema-texto-suave")}>{texto}</p>}
    </div>
  );
}
