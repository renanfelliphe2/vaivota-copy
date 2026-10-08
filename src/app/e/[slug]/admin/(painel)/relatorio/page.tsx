import { metadadosDaTela } from "@/servicos/metadados";
import { RelatorioView } from "@/components/relatorio/RelatorioView";

/** Etapa 7 (D17): herda RotaGuard(ADMIN) e AdminShell do layout (painel); a impressão esconde o shell. */
export default function PaginaRelatorio() {
  return (
    <main id="conteudo" className="flex-1">
      <RelatorioView />
    </main>
  );
}

export const generateMetadata = metadadosDaTela("Relatório");
