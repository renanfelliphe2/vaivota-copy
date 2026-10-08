import { metadadosDaTela } from "@/servicos/metadados";
import { TelaApresentar } from "@/components/apresentacao/TelaApresentar";
import { RotaGuard } from "@/components/nav/RotaGuard";

/** Etapa 8: fora do AdminShell (tela própria do telão), com RotaGuard próprio; a sala é o <main>. */
export default function PaginaApresentar() {
  return (
    <RotaGuard exigencia={{ tipo: "PAPEL", papeis: ["ADMIN"] }} comoMain>
      <TelaApresentar />
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Apresentação");
