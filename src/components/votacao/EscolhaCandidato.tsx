"use client";

import type { Candidato } from "@/dominio/tipos";

export type EscolhaCandidatoProps = {
  candidato: Pick<Candidato, "id" | "titulo">;
  selecionado: boolean;
  aoEscolher: (candidatoId: string) => void;
};

/**
 * Etapa 5 (D3): `radio` nativo dentro de um `<label>` "Escolher". Setas e Tab funcionam sem ARIA
 * improvisada; tocar no selecionado não desmarca (a barra tem "Limpar").
 */
export function EscolhaCandidato({ candidato, selecionado, aoEscolher }: EscolhaCandidatoProps) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold transition hover:bg-tema-fundo has-checked:border-tema-primaria has-checked:bg-tema-primaria has-checked:text-tema-sobre-primaria has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-tema-foco">
      <input
        type="radio"
        name="escolha-voto"
        value={candidato.id}
        checked={selecionado}
        onChange={() => aoEscolher(candidato.id)}
        aria-label={`Escolher: ${candidato.titulo}`}
        className="size-4 accent-current focus-visible:outline-none"
      />
      Escolher
    </label>
  );
}
