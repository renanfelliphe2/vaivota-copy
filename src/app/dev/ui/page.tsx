import { notFound } from "next/navigation";
import { GaleriaUi } from "@/components/dev/GaleriaUi";
import { MODULOS_FESTIVAL } from "@/lib/modulos";

export const metadata = { title: "Galeria de componentes | VaiVota" };

/** Só existe com a flag da toolbar ligada. */
export default function PaginaGaleria() {
  // Fora do MVP da Semana Tech (ver src/lib/modulos.ts).
  if (!MODULOS_FESTIVAL) notFound();
  return <GaleriaUi />;
}
