import { Equal, Scale } from "lucide-react";
import type { ResultadoVisao } from "@/dominio/painel";
import { formatarNumero } from "@/lib/formatar";
import { votosNoGrupo } from "./ClassificacaoTable";

// Etapa 7 (5.6): trecho, quem empatou, critério efetivo, valores que decidiram e desfecho.

export function PainelEmpates({ visao, titulo }: { visao: ResultadoVisao; titulo: (id: string) => string }) {
  const { empates } = visao.dados;
  return (
    <section aria-labelledby="empates" className="flex flex-col gap-3">
      <h3 id="empates" className="text-lg font-bold">
        Empates
      </h3>
      {empates.length === 0 ? (
        <p className="text-sm text-tema-texto-suave">Nenhum empate na pontuação final.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {empates.map((e, i) => {
            const grupo = e.criterioAplicado === "JURI" ? "JURI" : "POPULAR";
            const posicoes = e.posicoes.length > 2 ? `${e.posicoes[0]}º ao ${e.posicoes[e.posicoes.length - 1]}º` : e.posicoes.map((p) => `${p}º`).join(" e ");
            return (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-tema-borda bg-tema-fundo p-3 text-sm">
                <p className="font-semibold">Disputa pelas posições {posicoes}</p>
                <p>
                  Critério aplicado: maior votação {e.criterioAplicado === "JURI" ? "do júri" : "do público"}
                  {e.criterioAplicado !== visao.dados.criterioDesempate && " (o júri estava desligado)"}.
                </p>
                <ul className="flex flex-col gap-1">
                  {e.candidatoIds.map((id) => (
                    <li key={id} className={id === e.vencedorId ? "font-semibold" : undefined}>
                      {titulo(id)}: {formatarNumero(votosNoGrupo(visao, grupo, id))} {e.criterioAplicado === "JURI" ? "votos do júri" : "votos do público"}
                    </li>
                  ))}
                </ul>
                {e.resolvido ? (
                  <p className="inline-flex items-center gap-1 font-semibold text-tema-info">
                    <Scale aria-hidden className="size-4" /> Decidido pela maior votação {e.criterioAplicado === "JURI" ? "do júri" : "do público"}
                  </p>
                ) : (
                  <p className="inline-flex items-center gap-1 font-semibold text-tema-aviso">
                    <Equal aria-hidden className="size-4" /> Posição compartilhada, sem decisão automática
                    {e.vencedorId && ` (critério isolou só ${titulo(e.vencedorId)})`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
