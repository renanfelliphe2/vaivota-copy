import Image from "next/image";
import { cx } from "@/lib/classes";

/** Logo do VaiVota (08/10/2026; recorte de public/Logo1.png). Altura pelas classes, largura automática. */
export function LogoVaiVota({ className = "h-10", prioridade }: { className?: string; prioridade?: boolean }) {
  // Next 16: `priority` está obsoleto. Logo no topo da página: carrega já, com prioridade alta.
  return (
    <Image
      src="/vaivota-logo.png"
      alt="VaiVota"
      width={800}
      height={235}
      loading={prioridade ? "eager" : undefined}
      fetchPriority={prioridade ? "high" : undefined}
      className={cx("w-auto", className)}
    />
  );
}
