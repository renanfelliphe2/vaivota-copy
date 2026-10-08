import type { Parceiro } from "@/dominio/tipos";
import { cx } from "@/lib/classes";

/**
 * Logo de parceiro (08/10/2026) com altura fixa e largura livre; sem logo, o nome em texto. Sempre <img> simples:
 * o logo pode ser data: (enviado na Configuração) ou um arquivo de /public, de proporção desconhecida.
 */
export function LogoParceiro({
  parceiro,
  className = "h-12",
  classeNome = "text-base font-semibold",
}: {
  parceiro: Pick<Parceiro, "nome" | "logoUrl">;
  /** Classes de altura (e, se preciso, de largura máxima) do logo. */
  className?: string;
  /** Classes do nome quando não há logo. */
  classeNome?: string;
}) {
  if (!parceiro.logoUrl) return <span className={cx("whitespace-nowrap leading-tight", classeNome)}>{parceiro.nome}</span>;
  // eslint-disable-next-line @next/next/no-img-element -- data: ou arquivo local de proporção livre
  return <img src={parceiro.logoUrl} alt={parceiro.nome} className={cx("w-auto object-contain", className)} />;
}
