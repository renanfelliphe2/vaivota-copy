"use client";

import { CircleCheck, CircleDashed, CircleMinus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { EstadoItemChecklist, ItemChecklist } from "@/dominio/checklistAtivacao";
import { cx } from "@/lib/classes";

const ESTADOS: Record<EstadoItemChecklist, { rotulo: string; icone: typeof CircleCheck; cor: string }> = {
  OK: { rotulo: "Ok", icone: CircleCheck, cor: "text-tema-sucesso" },
  PENDENTE: { rotulo: "Pendente", icone: CircleDashed, cor: "text-tema-erro" },
  AVISO: { rotulo: "Aviso", icone: TriangleAlert, cor: "text-tema-aviso" },
  NAO_SE_APLICA: { rotulo: "Não se aplica", icone: CircleMinus, cor: "text-tema-texto-suave" },
};

/** Etapa 6 (seção 5.7): ícone e texto por item; pendência leva à seção que resolve. */
export function ChecklistAtivacao({ itens, base, completo = false }: { itens: ItemChecklist[]; base: string; completo?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {itens.map((item) => {
        const { rotulo, icone: Icone, cor } = ESTADOS[item.estado];
        const precisaAgir = item.estado === "PENDENTE" || item.estado === "AVISO";
        return (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <Icone aria-hidden className={cx("mt-0.5 size-4 shrink-0", cor)} />
            <div className="flex min-w-0 flex-col">
              <p>
                <span className="font-semibold">{item.titulo}</span>{" "}
                <span className={cx("font-medium", cor)}>· {rotulo}</span>
                {item.severidade === "AVISO" && item.estado !== "NAO_SE_APLICA" && (
                  <span className="text-tema-texto-suave"> (não bloqueia)</span>
                )}
              </p>
              {(completo || precisaAgir) && <p className="text-tema-texto-suave">{item.detalhe}</p>}
              {item.estado === "PENDENTE" && item.secao && (
                <Link href={`${base}?secao=${item.secao}`} scroll={false} className="inline-flex min-h-11 items-center font-medium text-tema-primaria-texto underline underline-offset-4">
                  Resolver
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
