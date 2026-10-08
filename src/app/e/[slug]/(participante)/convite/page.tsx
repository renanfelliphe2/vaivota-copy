import { metadadosDaTela } from "@/servicos/metadados";
import { FormularioConvite } from "@/components/auth/FormularioConvite";
import { RotaGuard } from "@/components/nav/RotaGuard";

/** "Tenho um código de convite": logado com e-mail verificado (guarda da Etapa 0). */
export default function PaginaConvite() {
  return (
    <RotaGuard exigencia={{ tipo: "EMAIL_VERIFICADO" }}>
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <FormularioConvite />
      </div>
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Convite de jurado");
