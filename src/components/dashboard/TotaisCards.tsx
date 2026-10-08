import { Baby, Gavel, Users } from "lucide-react";
import type { OperacaoDados } from "@/dominio/painel";
import { formatarNumero } from "@/lib/formatar";
import { KpiCard } from "./KpiCard";

// Etapa 7 (5.5): só o total de cada grupo, nunca por candidato. Módulo desligado some.

function dica(n: number) {
  return n === 0 ? "Nenhum voto ainda" : undefined;
}

export function TotaisCards({ dados }: { dados: OperacaoDados }) {
  const { totais, modulos } = dados;
  return (
    <section aria-label="Totais por grupo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard titulo="Votos do público" valor={formatarNumero(totais.POPULAR)} dica={dica(totais.POPULAR)} icone={Users} />
      {modulos.juri && <KpiCard titulo="Votos do júri" valor={formatarNumero(totais.JURI)} dica={dica(totais.JURI)} icone={Gavel} />}
      {modulos.infantil && (
        <KpiCard titulo="Votos infantis" valor={formatarNumero(totais.INFANTIL)} dica={dica(totais.INFANTIL)} icone={Baby} />
      )}
    </section>
  );
}
