"use client";

import { votaveis } from "@/dominio/candidatos";
import { chamadaDaSituacao } from "@/dominio/situacaoEvento";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSituacaoEvento } from "@/store/seletores/situacao";

const LIMITE = 6;

/** D8: vitrine curta — só votáveis, até 6, por `ordem`, sem links e sem nenhum dado de resultado. */
export function CandidatosPrevia() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  if (!ativo || !situacao) return null;
  const lista = votaveis(ativo.candidatos);
  if (lista.length < 2 || !chamadaDaSituacao(situacao).previa) return null;
  const visiveis = lista.slice(0, LIMITE);
  const resto = lista.length - visiveis.length;

  return (
    <section aria-labelledby="previa-candidatos" className="w-full border-t border-tema-borda bg-tema-superficie">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="previa-candidatos" className="text-2xl font-bold sm:text-3xl">
            {ativo.tema.rotuloCandidatos}
          </h2>
          <p className="text-sm text-tema-texto-suave">
            {lista.length} no total{resto > 0 && ` · e mais ${resto}`}
          </p>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {visiveis.map((c) => (
            <li key={c.id} className="overflow-hidden rounded-xl border border-tema-borda bg-tema-fundo">
              <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} />
              <p className="line-clamp-2 p-3 text-sm font-semibold" title={c.titulo}>
                {c.titulo}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
