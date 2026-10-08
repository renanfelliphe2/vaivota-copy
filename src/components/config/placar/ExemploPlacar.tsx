import type { Pesos } from "@/dominio/placar";
import { calcularExemploPlacar, liderDoExemplo, VOTOS_EXEMPLO } from "@/dominio/placarExemplo";
import { formatarDecimal } from "@/lib/formatar";

/** Exemplo numérico fixo (seção 5.5), calculado ao vivo com os pesos do rascunho. Votos NÃO vêm do evento. */
export function ExemploPlacar({ pesos }: { pesos: Pesos }) {
  const linhas = calcularExemploPlacar(pesos);
  const lider = liderDoExemplo(linhas);
  const { totais } = VOTOS_EXEMPLO;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-tema-borda p-4">
      <h3 className="text-lg font-bold">Exemplo com votos fictícios</h3>
      <p className="text-sm text-tema-texto-suave">
        Cada grupo é normalizado antes do peso: pontuação = peso × (votos do item ÷ total do grupo), somando os grupos. Se um grupo ficar
        sem votos, o peso dele é redistribuído entre os outros.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="sr-only">Exemplo de pontuação com os pesos escolhidos</caption>
          <thead>
            <tr className="text-left text-tema-texto-suave">
              <th scope="col" className="py-1 pr-3 font-medium">Item</th>
              <th scope="col" className="py-1 pr-3 font-medium">Popular ({totais.POPULAR})</th>
              <th scope="col" className="py-1 pr-3 font-medium">Júri ({totais.JURI})</th>
              <th scope="col" className="py-1 pr-3 font-medium">Infantil ({totais.INFANTIL})</th>
              <th scope="col" className="py-1 font-medium">Pontuação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.candidato} className="border-t border-tema-borda">
                <th scope="row" className="py-2 pr-3 text-left font-semibold">
                  {l.candidato}
                </th>
                <td className="py-2 pr-3 tabular-nums">{l.votos.POPULAR}</td>
                <td className="py-2 pr-3 tabular-nums">{l.votos.JURI}</td>
                <td className="py-2 pr-3 tabular-nums">{l.votos.INFANTIL}</td>
                <td className="py-2 font-bold tabular-nums">
                  {formatarDecimal(l.pontuacao, 1)}
                  {l.candidato === lider && <span className="ml-2 font-medium text-tema-primaria-texto">(lidera)</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
