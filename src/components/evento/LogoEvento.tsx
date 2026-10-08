import Image from "next/image";
import { cx } from "@/lib/classes";

export type LogoEventoProps = {
  nome: string;
  logoUrl: string | null;
  /** Classes de altura (largura automática). */
  className?: string;
  prioridade?: boolean;
};

/** Logo do evento com altura fixa; sem logoUrl, o nome em texto. `blob:` usa <img> simples. */
export function LogoEvento({ nome, logoUrl, className = "h-10 sm:h-12", prioridade }: LogoEventoProps) {
  if (!logoUrl) {
    return <span className="text-lg font-bold leading-tight sm:text-xl">{nome}</span>;
  }
  if (logoUrl.startsWith("blob:")) {
    // eslint-disable-next-line @next/next/no-img-element -- blob: não passa pelo next/image
    return <img src={logoUrl} alt={nome} className={cx("w-auto", className)} />;
  }
  return (
    <Image src={logoUrl} alt={nome} width={220} height={64} priority={prioridade} className={cx("w-auto", className)} />
  );
}
