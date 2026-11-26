import { Suspense } from "react";
import { TelaTelaoPareado } from "@/components/telao/TelaTelaoPareado";
import { metadadosDaTela } from "@/server/metadados";

/**
 * Telão em outro aparelho (25/11/2026): fora do EventoShell e sem RotaGuard, como o totem (não tem login; a identidade é o aparelho
 * pareado pelo código do palco do admin, em /telao/parear).
 */
export default function PaginaTelao() {
  return (
    <Suspense>
      <TelaTelaoPareado />
    </Suspense>
  );
}

export const generateMetadata = metadadosDaTela("Telão");
