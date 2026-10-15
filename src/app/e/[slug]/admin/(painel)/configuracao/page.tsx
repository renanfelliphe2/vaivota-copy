import { metadadosDaTela } from "@/server/metadados";
import { Suspense } from "react";
import { TelaConfiguracao } from "@/components/config/TelaConfiguracao";
import { Carregando } from "@/components/ui/Carregando";

/** Etapa 6 (D1): o layout (painel) já tem RotaGuard(ADMIN) e AdminShell. */
export default function PaginaConfiguracao() {
  return (
    <main id="conteudo" className="flex-1">
      <Suspense fallback={<Carregando className="mx-auto py-20" />}>
        <TelaConfiguracao />
      </Suspense>
    </main>
  );
}

export const generateMetadata = metadadosDaTela("Configuração");
