import { Ban } from "lucide-react";
import type { ResultadoVisao } from "@/dominio/painel";
import { gruposDoResultado } from "@/dominio/resultado";
import { formatarNumero } from "@/lib/formatar";
import { ROTULO_GRUPO_PAINEL, votosNoGrupo } from "./ClassificacaoTable";

// Etapa 7 (5.6, D16): lista de dados.desqualificados, com votos brutos e sem posição.

export function ForaDaDisputa({ visao, titulo }: { visao: ResultadoVisao; titulo: (id: string) => string }) {
  if (visao.dados.desqualificados.length === 0) return null;
  const grupos = gruposDoResultado(visao.dados);
  return (
    <section aria-labelledby="fora-da-disputa" className="flex flex-col gap-2">
      <h3 id="fora-da-disputa" className="flex items-center gap-2 text-lg font-bold">
        <Ban aria-hidden className="size-5" /> Fora da disputa
      </h3>
      <ul className="flex flex-col gap-2">
        {visao.dados.desqualificados.map((id) => (
          <li key={id} className="rounded-xl border border-tema-borda bg-tema-fundo px-3 py-2 text-sm">
            <span className="font-semibold">{titulo(id)}</span>{" "}
            <span className="text-tema-texto-suave">
              ({grupos.map((g) => `${ROTULO_GRUPO_PAINEL[g]}: ${formatarNumero(votosNoGrupo(visao, g, id))}`).join(" · ")} votos brutos; fora da base de cálculo)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
