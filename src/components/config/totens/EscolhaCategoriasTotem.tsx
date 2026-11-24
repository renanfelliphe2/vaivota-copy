"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import type { Categoria } from "@/dominio/tipos";
import { cx } from "@/lib/classes";

/**
 * As categorias que o totem exibe (25/11/2026): só as votadas no totem. Marcar ao menos uma é obrigatório (quem chama valida).
 * Sem nenhuma categoria do totem, aponta para a seção Categorias.
 */
export function EscolhaCategoriasTotem({
  categorias,
  marcadas,
  aoMudar,
  erro,
  desabilitado = false,
}: {
  /** Só as categorias TOTEM do evento, na ordem. */
  categorias: readonly Categoria[];
  marcadas: readonly string[];
  aoMudar: (ids: string[]) => void;
  erro?: string | null;
  desabilitado?: boolean;
}) {
  if (categorias.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-tema-borda p-4 text-sm text-tema-texto-suave">
        Nenhuma categoria é votada no totem. Em{" "}
        <Link href="?secao=categorias" scroll={false} className="font-semibold underline underline-offset-4">
          Categorias
        </Link>
        , edite uma categoria e escolha &ldquo;Totem&rdquo; em &ldquo;Onde é votada&rdquo;.
      </p>
    );

  function alternar(id: string) {
    aoMudar(marcadas.includes(id) ? marcadas.filter((m) => m !== id) : [...marcadas, id]);
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={desabilitado} aria-describedby={erro ? "erro-categorias-totem" : undefined}>
      <legend className="mb-1 font-semibold">Categorias deste totem</legend>
      <ul className="flex flex-wrap gap-2">
        {categorias.map((c) => {
          const marcada = marcadas.includes(c.id);
          return (
            <li key={c.id}>
              <label
                className={cx(
                  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
                  marcada ? "border-tema-primaria bg-tema-primaria text-tema-sobre-primaria" : "border-tema-borda hover:bg-tema-superficie",
                  desabilitado && "cursor-not-allowed opacity-60",
                )}
              >
                <input type="checkbox" className="sr-only" checked={marcada} onChange={() => alternar(c.id)} />
                {marcada && <Check aria-hidden className="size-4" />}
                {c.nome}
              </label>
            </li>
          );
        })}
      </ul>
      {erro ? (
        <p id="erro-categorias-totem" className="text-sm font-semibold text-tema-erro">
          {erro}
        </p>
      ) : (
        <p className="text-sm text-tema-texto-suave">O totem mostra só os itens destas categorias. Escolha ao menos uma.</p>
      )}
    </fieldset>
  );
}
