import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/classes";

export type VarianteAlerta = "informacao" | "sucesso" | "aviso" | "erro";

const CONFIG: Record<VarianteAlerta, { icone: LucideIcon; cor: string; borda: string }> = {
  informacao: { icone: Info, cor: "text-tema-info", borda: "border-l-tema-info" },
  sucesso: { icone: CircleCheck, cor: "text-tema-sucesso", borda: "border-l-tema-sucesso" },
  aviso: { icone: TriangleAlert, cor: "text-tema-aviso", borda: "border-l-tema-aviso" },
  erro: { icone: CircleAlert, cor: "text-tema-erro", borda: "border-l-tema-erro" },
};

export type AlertaProps = {
  variante?: VarianteAlerta;
  titulo?: ReactNode;
  children?: ReactNode;
  /** Padrão: "alert" para erro, "status" para os demais. Passe null para não anunciar. */
  role?: "alert" | "status" | null;
  id?: string;
  className?: string;
};

export function Alerta({ variante = "informacao", titulo, children, role, id, className }: AlertaProps) {
  const { icone: Icone, cor, borda } = CONFIG[variante];
  const papel = role === undefined ? (variante === "erro" ? "alert" : "status") : (role ?? undefined);
  return (
    <div
      id={id}
      role={papel}
      className={cx("flex gap-3 rounded-xl border border-tema-borda border-l-4 bg-tema-superficie p-4", borda, className)}
    >
      <Icone aria-hidden className={cx("mt-0.5 size-5 shrink-0", cor)} />
      <div className="flex min-w-0 flex-col gap-1 text-sm">
        {titulo && <p className={cx("font-semibold", cor)}>{titulo}</p>}
        {children && <div className="text-tema-texto">{children}</div>}
      </div>
    </div>
  );
}
