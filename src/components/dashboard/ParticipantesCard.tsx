import { Cartao } from "@/components/ui/Cartao";
import type { OperacaoDados } from "@/dominio/painel";
import { formatarNumero, formatarPercentual } from "@/lib/formatar";
import { TituloBloco } from "./KpiCard";

function Linha({ papel, cadastrados, votaram }: { papel: string; cadastrados: number; votaram: number }) {
  const pct = cadastrados > 0 ? (votaram / cadastrados) * 100 : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold">{papel}</span>
        <span className="tabular-nums">
          {formatarNumero(votaram)} de {formatarNumero(cadastrados)} votaram ({formatarPercentual(pct)})
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-tema-fundo ring-1 ring-tema-borda" aria-hidden>
        <div className="h-full rounded-full bg-tema-primaria-texto" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ParticipantesCard({ dados }: { dados: OperacaoDados }) {
  const { publico, jurado } = dados.participantes;
  return (
    <Cartao className="flex flex-col gap-4">
      <TituloBloco>Participantes</TituloBloco>
      <Linha papel="Público" cadastrados={publico.cadastrados} votaram={publico.votaram} />
      {dados.modulos.juri && <Linha papel="Jurados" cadastrados={jurado.cadastrados} votaram={jurado.votaram} />}
    </Cartao>
  );
}
