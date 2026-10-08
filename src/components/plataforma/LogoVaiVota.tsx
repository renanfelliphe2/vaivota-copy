import Image from "next/image";
import { cx } from "@/lib/classes";

/** Logo do VaiVota (08/10/2026; recorte de public/Logo1.png). Altura pelas classes, largura automática. */
export function LogoVaiVota({ className = "h-10", prioridade }: { className?: string; prioridade?: boolean }) {
  return <Image src="/vaivota-logo.png" alt="VaiVota" width={800} height={235} priority={prioridade} className={cx("w-auto", className)} />;
}
