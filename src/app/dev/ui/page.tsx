import { notFound } from "next/navigation";
import { GaleriaUi } from "@/components/dev/GaleriaUi";

export const metadata = { title: "Galeria de componentes | VaiVota" };

/** Só existe com a flag da toolbar ligada. */
export default function PaginaGaleria() {
  if (process.env.NEXT_PUBLIC_DEV_TOOLBAR === "false") notFound();
  return <GaleriaUi />;
}
