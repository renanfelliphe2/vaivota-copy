"use client";

import { Eye, Trash2 } from "lucide-react";
import type { CodigoPendente } from "@/dominio/totem";
import type { Categoria } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { formatarDataHora, paraMs } from "@/lib/tempo";

/**
 * Códigos esperando o tablet (25/11/2026): o código não vence, então o admin pode gerar antes, vê-lo de novo quando for parear e
 * descartar o que não vai usar. Some da lista quando o tablet o usa.
 */
export function CodigosPendentes({
  codigos,
  categorias,
  fuso,
  podeDescartar,
  aoVer,
  aoDescartar,
}: {
  codigos: CodigoPendente[];
  categorias: readonly Pick<Categoria, "id" | "nome">[];
  fuso: string;
  podeDescartar: boolean;
  aoVer: (c: CodigoPendente & { codigo: string }) => void;
  aoDescartar: (c: CodigoPendente) => void;
}) {
  if (codigos.length === 0) return null;
  const nomesDas = (ids: string[]) =>
    ids
      .map((id) => categorias.find((c) => c.id === id)?.nome)
      .filter(Boolean)
      .join(", ");
  return (
    <section aria-labelledby="titulo-codigos-pendentes" className="flex flex-col gap-3">
      <h3 id="titulo-codigos-pendentes" className="text-lg font-bold">
        Códigos esperando o tablet
      </h3>
      <ul className="flex flex-col divide-y divide-tema-borda rounded-2xl border border-tema-borda">
        {codigos.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-semibold">{c.nome}</p>
              <p className="text-sm text-tema-texto-suave">
                {nomesDas(c.categoriaIds) || "Sem categoria"} · gerado em {formatarDataHora(paraMs(c.criadoEm), fuso)}
                {c.validadeAte ? ` · vale até ${formatarDataHora(paraMs(c.validadeAte), fuso)}` : ""}
              </p>
              {c.codigo === null && <p className="text-sm text-tema-texto-suave">Gerado antes de o código ficar guardado: descarte e gere outro, se precisar vê-lo.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {c.codigo !== null && (
                <Botao variante="contorno" tamanho="pequeno" icone={<Eye aria-hidden className="size-4" />} onClick={() => aoVer({ ...c, codigo: c.codigo as string })}>
                  Ver código
                </Botao>
              )}
              <Botao variante="contorno" tamanho="pequeno" disabled={!podeDescartar} icone={<Trash2 aria-hidden className="size-4" />} onClick={() => aoDescartar(c)}>
                Descartar
              </Botao>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
