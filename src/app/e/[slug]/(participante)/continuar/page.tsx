import { Suspense } from "react";
import { metadadosDaTela } from "@/server/metadados";
import { ContinuarAcesso } from "@/components/auth/ContinuarAcesso";

/** Volta do login com Google: cria a participação e segue para o destino certo. Não exige login (se faltar, volta à entrada). */
export default function PaginaContinuar() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <Suspense>
        <ContinuarAcesso />
      </Suspense>
    </div>
  );
}

export const generateMetadata = metadadosDaTela("Entrando");
