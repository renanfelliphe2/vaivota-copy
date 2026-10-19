import { metadadosDaTela } from "@/server/metadados";
import { TelaApresentar } from "@/components/apresentacao/TelaApresentar";
import { RotaGuard } from "@/components/nav/RotaGuard";
import { notFound } from "next/navigation";
import { MODULOS_FESTIVAL } from "@/lib/modulos";

/** Etapa 8: fora do AdminShell (tela própria do telão), com RotaGuard próprio; a sala é o <main>. */
export default function PaginaApresentar() {
  // Fora do MVP da Maratona Tech Tivit (ver src/lib/modulos.ts).
  if (!MODULOS_FESTIVAL) notFound();
  return (
    <RotaGuard exigencia={{ tipo: "PAPEL", papeis: ["ADMIN"] }} comoMain>
      <TelaApresentar />
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Apresentação");
