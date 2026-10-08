import { metadadosDaTela } from "@/servicos/metadados";
import { Suspense } from "react";
import { RotaGuard } from "@/components/nav/RotaGuard";
import { Carregando } from "@/components/ui/Carregando";
import { TelaVotar } from "@/components/votacao/TelaVotar";

/** Etapas 4 e 5: o `main id="conteudo"` vem do EventoShell; useSearchParams fica dentro do Suspense. */
export default function PaginaVotar() {
  return (
    <RotaGuard exigencia={{ tipo: "EMAIL_VERIFICADO" }}>
      <Suspense fallback={<Carregando className="mx-auto py-20" />}>
        <TelaVotar />
      </Suspense>
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Votação");
