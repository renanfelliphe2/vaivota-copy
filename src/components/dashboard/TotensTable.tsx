import { CircleCheck, CirclePause, CircleSlash } from "lucide-react";
import { Cartao } from "@/components/ui/Cartao";
import type { OperacaoDados } from "@/dominio/painel";
import type { EstadoDispositivo } from "@/dominio/tipos";
import { formatarNumero } from "@/lib/formatar";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { TituloBloco } from "./KpiCard";

const ESTADOS: Record<EstadoDispositivo, { texto: string; icone: typeof CircleCheck; cor: string }> = {
  ATIVO: { texto: "Ativo", icone: CircleCheck, cor: "text-tema-sucesso" },
  PAUSADO: { texto: "Pausado", icone: CirclePause, cor: "text-tema-aviso" },
  REVOGADO: { texto: "Revogado", icone: CircleSlash, cor: "text-tema-erro" },
};

export function TotensTable({ totens, fuso }: { totens: OperacaoDados["totens"]; fuso: string }) {
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloBloco>Totens</TituloBloco>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <caption className="sr-only">Totens do voto infantil: estado, último uso e votos</caption>
          <thead>
            <tr className="border-b border-tema-borda">
              <th scope="col" className="py-2 pr-3 font-semibold">Totem</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Estado</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Último uso</th>
              <th scope="col" className="py-2 text-right font-semibold">Votos</th>
            </tr>
          </thead>
          <tbody>
            {totens.map((t) => {
              const e = ESTADOS[t.estado];
              return (
                <tr key={t.nome} className="border-b border-tema-borda last:border-0">
                  <th scope="row" className="py-2 pr-3 font-normal">{t.nome}</th>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex items-center gap-1 font-semibold ${e.cor}`}>
                      <e.icone aria-hidden className="size-4" /> {e.texto}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{t.ultimoUso ? formatarDataHora(paraMs(t.ultimoUso), fuso) : "Nunca usado"}</td>
                  <td className="py-2 text-right tabular-nums">{formatarNumero(t.votos)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-tema-texto-suave">
        Votos de totens pausados ou revogados continuam contando: foram registrados antes da pausa ou da revogação.
      </p>
    </Cartao>
  );
}
