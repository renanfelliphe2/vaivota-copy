import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import type { ParContraste } from "@/dominio/contrasteTema";
import { formatarDecimal } from "@/lib/formatar";
import { cx } from "@/lib/classes";

/** Razão, veredito em texto e ícone e o par (nunca só cor). */
export function ContrasteBadge({ par }: { par: ParContraste }) {
  const veredito = par.aprovado ? "Aprovado" : par.bloqueante ? "Reprovado" : "Atenção";
  const Icone = par.aprovado ? CircleCheck : par.bloqueante ? CircleX : TriangleAlert;
  const cor = par.aprovado ? "text-tema-sucesso" : par.bloqueante ? "text-tema-erro" : "text-tema-aviso";
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span>{par.par}</span>
      <span className={cx("inline-flex shrink-0 items-center gap-1.5 font-semibold", cor)}>
        <Icone aria-hidden className="size-4" />
        {formatarDecimal(par.razao, 1)}:1 · {veredito}
        <span className="sr-only"> (mínimo {formatarDecimal(par.minimo, 1)}:1)</span>
      </span>
    </li>
  );
}
