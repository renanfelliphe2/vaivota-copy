import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/classes";

export type VarianteSelo = "neutro" | "primaria" | "info" | "sucesso" | "aviso" | "erro";

const ESTILOS: Record<VarianteSelo, string> = {
  neutro: "text-tema-texto-suave",
  primaria: "text-tema-primaria-texto",
  info: "text-tema-info",
  sucesso: "text-tema-sucesso",
  aviso: "text-tema-aviso",
  erro: "text-tema-erro",
};

const ICONES: Record<VarianteSelo, LucideIcon> = {
  neutro: Info,
  primaria: Info,
  info: Info,
  sucesso: CircleCheck,
  aviso: TriangleAlert,
  erro: CircleAlert,
};

export type SeloProps = {
  variante?: VarianteSelo;
  /** Ícone próprio; sem ele, o da variante. Selo é sempre ícone + texto (nunca só cor). */
  icone?: LucideIcon;
  /** Pulso discreto no ícone (desligado por prefers-reduced-motion). */
  pulsar?: boolean;
  className?: string;
  children: ReactNode;
};

export function Selo({ variante = "neutro", icone, pulsar, className, children }: SeloProps) {
  const Icone = icone ?? ICONES[variante];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border border-current bg-tema-superficie px-3 py-1 text-sm font-semibold",
        ESTILOS[variante],
        className,
      )}
    >
      <Icone aria-hidden className={cx("size-4 shrink-0", pulsar && "motion-safe:animate-pulse")} />
      <span>{children}</span>
    </span>
  );
}
