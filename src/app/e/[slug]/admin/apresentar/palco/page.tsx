import { Suspense } from "react";
import { metadadosDaTela } from "@/server/metadados";
import { TelaPalco } from "@/components/apresentacao/TelaPalco";
import { RotaGuard } from "@/components/nav/RotaGuard";
import { notFound } from "next/navigation";
import { MODULOS_FESTIVAL } from "@/lib/modulos";

/** 08/10/2026: o palco na aba do telão, aberto pelo "Apresentar" da sala. Mesma guarda da sala (só ADMIN). */
export default function PaginaPalco() {
  // Fora do MVP da Semana Tech (ver src/lib/modulos.ts).
  if (!MODULOS_FESTIVAL) notFound();
  return (
    <RotaGuard exigencia={{ tipo: "PAPEL", papeis: ["ADMIN"] }} comoMain>
      <Suspense>
        <TelaPalco />
      </Suspense>
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Telão");
