"use client";

import { useState } from "react";
import type { Categoria } from "@/dominio/tipos";
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

/** Filtro de categoria: todas, uma delas ou os itens ainda sem categoria. */
type FiltroCategoria = "TODAS" | "SEM_CATEGORIA" | string;

/**
 * Etapa 6 (CP3): todos os itens na ordem de cadastro, com filtro por estado (a ordem na votação é escolhida na seção).
 * 09/11/2026: em evento com categorias, também filtra por categoria.
 */
export function ListaCandidatosAdmin({
  itens,
  categorias = [],
  travas,
  ocupado,
  acoes,
}: {
  itens: CandidatoAdmin[];
  categorias?: readonly Categoria[];
  travas: Travas;
  ocupado: boolean;
  acoes: AcoesCartaoAdmin;
}) {
  const [filtro, setFiltro] = useState<EstadoCandidatoAdmin | "TODOS">("TODOS");
  const [categoria, setCategoria] = useState<FiltroCategoria>("TODAS");
  const visiveis = itens
    .filter((i) => filtro === "TODOS" || i.estado === filtro)
    .filter((i) => categoria === "TODAS" || (categoria === "SEM_CATEGORIA" ? i.categoria === null : i.categoria?.id === categoria));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Mostrar</span>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="w-auto">
            {FILTROS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </Select>
        </label>
        {categorias.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Categoria</span>
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-auto">
              <option value="TODAS">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
              <option value="SEM_CATEGORIA">Sem categoria</option>
            </Select>
          </label>
        )}
      </div>
      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-6 text-center text-tema-texto-suave">Nenhum item neste filtro.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visiveis.map((item) => (
            <li key={item.candidato.id}>
              <CartaoCandidatoAdmin item={item} travas={travas} ocupado={ocupado} acoes={acoes} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
