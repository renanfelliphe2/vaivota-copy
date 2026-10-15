import { metadadosDaTela } from "@/server/metadados";
import { Suspense } from "react";
import { TelaCodigo } from "./TelaCodigo";

/** Tela de código (rev. 4, A5). Não exige LOGADO: no login por código ainda não há sessão. */
export default function PaginaVerificarEmail() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <Suspense>
        <TelaCodigo />
      </Suspense>
    </div>
  );
}

export const generateMetadata = metadadosDaTela("Código de acesso");
