import { Suspense } from "react";
import { metadadosDaTela } from "@/servicos/metadados";
import { TelaPalco } from "@/components/apresentacao/TelaPalco";
import { RotaGuard } from "@/components/nav/RotaGuard";

/** 08/10/2026: o palco na aba do telão, aberto pelo "Apresentar" da sala. Mesma guarda da sala (só ADMIN). */
export default function PaginaPalco() {
  return (
    <RotaGuard exigencia={{ tipo: "PAPEL", papeis: ["ADMIN"] }} comoMain>
      <Suspense>
        <TelaPalco />
      </Suspense>
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Telão");
