import { TelaTotens } from "@/components/totens/TelaTotens";
import { metadadosDaTela } from "@/server/metadados";

/** Página Totens (24/11/2026): herda RotaGuard(ADMIN) e AdminShell do layout (painel). */
export default function PaginaTotens() {
  return (
    <main id="conteudo" className="flex-1">
      <TelaTotens />
    </main>
  );
}

export const generateMetadata = metadadosDaTela("Totens");
