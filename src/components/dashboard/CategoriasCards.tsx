import { Trophy } from "lucide-react";
import type { ResultadoVisao } from "@/dominio/painel";
import type { ConfigApresentacao, Grupo } from "@/dominio/tipos";
import { contar } from "@/lib/formatar";

// Etapa 7 (5.6): uma categoria por grupo ativo, com o rótulo de ConfigApresentacao.

export function rotuloDaCategoria(config: ConfigApresentacao, grupo: Grupo): string {
  if (grupo === "POPULAR") return config.rotuloCategoriaPublico;
  if (grupo === "JURI") return config.rotuloCategoriaJuri;
  return config.rotuloCategoriaInfantil;
}

export function CategoriasCards({
  visao,
  titulo,
  config,
}: {
  visao: ResultadoVisao;
  titulo: (id: string) => string;
  config: ConfigApresentacao;
}) {
  return (
    <section aria-labelledby="categorias" className="flex flex-col gap-3">
      <h3 id="categorias" className="text-lg font-bold">
        Categorias
      </h3>
      <ul className="grid gap-3 md:grid-cols-3">
        {visao.dados.categorias.map((c) => (
          <li key={c.grupo} className="flex flex-col gap-2 rounded-xl border border-tema-borda bg-tema-fundo p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-tema-texto-suave">
              <Trophy aria-hidden className="size-4" /> {rotuloDaCategoria(config, c.grupo)}
            </p>
            {c.vencedores.length === 0 ? (
              <p className="text-sm">Sem votos neste grupo</p>
            ) : (
              <>
                {c.vencedores.length > 1 && <p className="text-xs font-semibold uppercase tracking-wide text-tema-aviso">Co-vencedores</p>}
                <ul className="flex flex-col gap-1">
                  {c.vencedores.map((v) => (
                    <li key={v.candidatoId}>
                      <span className="font-bold">{titulo(v.candidatoId)}</span>{" "}
                      <span className="text-sm tabular-nums text-tema-texto-suave">{contar(v.votos, "voto", "votos")}</span>
                    </li>
                  ))}
                </ul>
                {c.desempatadoPorPontuacao && <p className="text-xs text-tema-texto-suave">Desempatado pela pontuação final</p>}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
