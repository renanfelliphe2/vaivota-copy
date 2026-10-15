import { metadadosDaTela } from "@/server/metadados";
import { Suspense } from "react";
import { TelaDashboard } from "@/components/dashboard/TelaDashboard";
import { Carregando } from "@/components/ui/Carregando";

/** Etapa 7: o layout (painel) já tem RotaGuard(ADMIN) e AdminShell. */
export default function PaginaDashboard() {
  return (
    <main id="conteudo" className="flex-1">
      <Suspense fallback={<Carregando className="mx-auto py-20" />}>
        <TelaDashboard />
      </Suspense>
    </main>
  );
}

export const generateMetadata = metadadosDaTela("Painel");
