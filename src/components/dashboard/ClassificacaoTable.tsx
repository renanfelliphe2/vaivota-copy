import { Equal, Scale } from "lucide-react";
import { situacaoDeEmpate } from "@/dominio/exportacao";
import type { ResultadoVisao } from "@/dominio/painel";
import { casasDaPontuacao, gruposDoResultado } from "@/dominio/resultado";
import type { Grupo } from "@/dominio/tipos";
import { formatarDecimal, formatarNumero } from "@/lib/formatar";

// Etapa 7 (5.6, D16): classificação lida de ranking[].pontosPorGrupo, sem recalcular. Rolagem contida.

export const ROTULO_GRUPO_PAINEL: Record<Grupo, string> = { POPULAR: "Público", JURI: "Júri", INFANTIL: "Infantil" };

export function votosNoGrupo(visao: Pick<ResultadoVisao, "dados">, g: Grupo, candidatoId: string): number {
  return visao.dados.placares[g].find((p) => p.candidatoId === candidatoId)?.votos ?? 0;
}

export function IndicadorEmpate({ situacao }: { situacao: "Nao" | "Resolvido" | "Compartilhado" }) {
  if (situacao === "Nao") return null;
  return situacao === "Resolvido" ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-tema-info">
      <Scale aria-hidden className="size-3.5" /> Empate resolvido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-tema-aviso">
      <Equal aria-hidden className="size-3.5" /> Posição compartilhada
    </span>
  );
}

export function ClassificacaoTable({
  visao,
  titulo,
  rotuloCandidato,
}: {
  visao: ResultadoVisao;
  titulo: (id: string) => string;
  rotuloCandidato: string;
}) {
  const grupos = gruposDoResultado(visao.dados);
  const casas = casasDaPontuacao(visao.dados.ranking);
  return (
    <div className="overflow-x-auto rounded-xl border border-tema-borda">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <caption className="px-3 py-2 text-left text-base font-semibold">Classificação</caption>
        <thead className="bg-tema-fundo">
          <tr className="border-y border-tema-borda">
            <th scope="col" className="px-3 py-2 font-semibold">Posição</th>
            <th scope="col" className="px-3 py-2 font-semibold">{rotuloCandidato}</th>
            {grupos.map((g) => (
              <th key={g} scope="col" className="px-3 py-2 text-right font-semibold">
                {ROTULO_GRUPO_PAINEL[g]}
                <span className="block text-xs font-normal text-tema-texto-suave">votos · pontos</span>
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-right font-semibold">Pontuação final</th>
          </tr>
        </thead>
        <tbody>
          {visao.dados.ranking.map((item) => (
            <tr key={item.candidatoId} className="border-b border-tema-borda last:border-0">
              <td className="px-3 py-2 font-bold tabular-nums">{item.posicao}º</td>
              <th scope="row" className="px-3 py-2 font-normal">
                <span className="block font-semibold">{titulo(item.candidatoId)}</span>
                <IndicadorEmpate situacao={situacaoDeEmpate(visao, item.candidatoId)} />
              </th>
              {grupos.map((g) => (
                <td key={g} className="px-3 py-2 text-right tabular-nums">
                  {formatarNumero(votosNoGrupo(visao, g, item.candidatoId))} · {formatarDecimal(item.pontosPorGrupo[g], casas)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-bold tabular-nums">{formatarDecimal(item.pontuacao, casas)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
