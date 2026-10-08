import { LoaderCircle } from "lucide-react";
import { cx } from "@/lib/classes";

export function Carregando({ texto = "Carregando…", className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cx("flex items-center gap-2 text-tema-texto-suave", className)}>
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span>{texto}</span>
    </div>
  );
}

/** Bloco de espera com a forma do conteúdo. */
export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lg bg-tema-borda", className)} />;
}
