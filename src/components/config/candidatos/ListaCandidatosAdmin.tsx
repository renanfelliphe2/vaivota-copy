"use client";

import { useState } from "react";
import type { Travas } from "@/dominio/travas";
import { Select } from "@/components/ui/Campo";
import type { CandidatoAdmin, EstadoCandidatoAdmin } from "@/store/seletores/candidatosAdmin";
import { CartaoCandidatoAdmin, type AcoesCartaoAdmin } from "./CartaoCandidatoAdmin";

const FILTROS: { valor: EstadoCandidatoAdmin | "TODOS"; rotulo: string }[] = [
  { valor: "TODOS", rotulo: "Todos" },
  { valor: "NA_VOTACAO", rotulo: "Na votação" },
  { valor: "RASCUNHO", rotulo: "Rascunho" },
  { valor: "FORA_DA_DISPUTA", rotulo: "Fora da disputa" },
];

/** Etapa 6 (CP3): todos os itens na ordem de `ordem`, com filtro por estado e reordenação. */
export function ListaCandidatosAdmin({
  itens,
  travas,
  ocupado,
  acoes,
}: {
  itens: CandidatoAdmin[];
  travas: Travas;
  ocupado: boolean;
  acoes: AcoesCartaoAdmin;
}) {
  const [filtro, setFiltro] = useState<EstadoCandidatoAdmin | "TODOS">("TODOS");
  const visiveis = filtro === "TODOS" ? itens : itens.filter((i) => i.estado === filtro);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-start text-sm">
        <span className="font-semibold">Mostrar</span>
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="w-auto">
          {FILTROS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.rotulo}
            </option>
          ))}
        </Select>
      </label>
      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-6 text-center text-tema-texto-suave">Nenhum item neste filtro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((item) => {
            const indice = itens.indexOf(item);
            return (
              <li key={item.candidato.id}>
                <CartaoCandidatoAdmin
                  item={item}
                  travas={travas}
                  primeiro={indice === 0}
                  ultimo={indice === itens.length - 1}
                  ocupado={ocupado}
                  acoes={acoes}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
