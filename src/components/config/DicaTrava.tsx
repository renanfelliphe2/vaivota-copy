import { Lock } from "lucide-react";
import { cx } from "@/lib/classes";

/** Motivo visível ao lado de um controle travado (estado nunca só por cor). */
export function DicaTrava({ id, motivo, className }: { id?: string; motivo: string | null; className?: string }) {
  if (!motivo) return null;
  return (
    <span id={id} className={cx("flex items-start gap-1.5 text-sm text-tema-texto-suave", className)}>
      <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{motivo}</span>
    </span>
  );
}
