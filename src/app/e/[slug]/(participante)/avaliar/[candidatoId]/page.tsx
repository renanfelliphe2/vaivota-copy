import { metadadosDaTela } from "@/servicos/metadados";
import { TelaAvaliacaoJuri } from "@/components/avaliacao/TelaAvaliacaoJuri";
import { RotaGuard } from "@/components/nav/RotaGuard";

/** Avaliação por critério de um candidato (08/10/2026): logado com e-mail verificado; a tela confere papel e modo. */
export default async function PaginaAvaliar({ params }: PageProps<"/e/[slug]/avaliar/[candidatoId]">) {
  const { candidatoId } = await params;
  return (
    <RotaGuard exigencia={{ tipo: "EMAIL_VERIFICADO" }}>
      <TelaAvaliacaoJuri candidatoId={decodeURIComponent(candidatoId)} />
    </RotaGuard>
  );
}

export const generateMetadata = metadadosDaTela("Avaliação do júri");
