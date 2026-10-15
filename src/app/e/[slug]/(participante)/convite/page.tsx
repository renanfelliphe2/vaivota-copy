import { metadadosDaTela } from "@/server/metadados";
import { FormularioConvite } from "@/components/auth/FormularioConvite";
import { RotaGuard } from "@/components/nav/RotaGuard";
import { notFound } from "next/navigation";
import { MODULOS_FESTIVAL } from "@/lib/modulos";

/** "Tenho um código de convite": logado com e-mail verificado (guarda da Etapa 0). */
export default function PaginaConvite() {
  // Fora do MVP da Semana Tech (ver src/lib/modulos.ts).
  if (!MODULOS_FESTIVAL) notFound();
  return (
    <RotaGuard exigencia={{ tipo: "EMAIL_VERIFICADO" }}>
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
        <FormularioConvite />
      </div>
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Convite de jurado");
