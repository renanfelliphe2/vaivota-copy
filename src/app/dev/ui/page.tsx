import { notFound } from "next/navigation";
import { GaleriaUi } from "@/components/dev/GaleriaUi";

export const metadata = { title: "Galeria de componentes | VaiVota" };

/** Galeria de componentes: ferramenta de desenvolvimento, fora do ar em produção. */
export default function PaginaGaleria() {
  if (process.env.NODE_ENV === "production") notFound();
  return <GaleriaUi />;
}
