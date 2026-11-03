import { notFound } from "next/navigation";
import { TelaPareamento } from "@/components/totem/TelaPareamento";
import { MODULOS_FESTIVAL } from "@/lib/modulos";
import { metadadosDaTela } from "@/server/metadados";

/**
 * Pareamento do totem (Base/VotoInfantil.md §4): fora do EventoShell e sem RotaGuard, como o quiosque. O adulto digita o código
 * gerado pelo admin; o servidor grava o token do aparelho num cookie HttpOnly.
 */
export default function PaginaPareamentoTotem() {
  // Fora do MVP da Maratona Tech Tivit (ver src/lib/modulos.ts).
  if (!MODULOS_FESTIVAL) notFound();
  return (
    <div className="min-h-dvh bg-tema-fundo text-tema-texto font-tema">
      <TelaPareamento />
    </div>
  );
}

export const generateMetadata = metadadosDaTela("Parear totem");
