"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/classes";

/**
 * Busca dos itens de uma categoria pelo título (demanda B1, 25/11/2026): um botão de pesquisar abre a barra; fechar limpa o termo
 * e devolve o foco ao botão. Na landing, o botão só aparece quando os itens não cabem na tela.
 */
export function BotaoPesquisar({ aberta, idBarra, nome, aoAlternar, className }: { aberta: boolean; idBarra: string; nome: string; aoAlternar: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-expanded={aberta}
      aria-controls={idBarra}
      data-busca-botao={idBarra}
      className={cx(
        "inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-5 font-semibold shadow-sm ring-1 transition",
        aberta ? "bg-tema-primaria-texto text-tema-fundo ring-tema-primaria-texto" : "bg-tema-fundo text-tema-texto ring-tema-borda hover:ring-tema-primaria",
        className,
      )}
    >
      <Search aria-hidden className="size-4" />
      Pesquisar<span className="sr-only"> em {nome}</span>
    </button>
  );
}

export function BarraPesquisa({
  id,
  termo,
  aoMudar,
  aoFechar,
  rotulo,
  encontrados,
  total,
}: {
  id: string;
  termo: string;
  aoMudar: (termo: string) => void;
  aoFechar: () => void;
  /** "Pesquisar filmes de Mostra Infantil". */
  rotulo: string;
  encontrados: number;
  total: number;
}) {
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => {
    campo.current?.focus();
  }, []);

  function fechar() {
    aoFechar();
    document.querySelector<HTMLElement>(`[data-busca-botao="${id}"]`)?.focus();
  }

  return (
    <div id={id} role="search" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-full bg-tema-fundo pl-4 pr-1 shadow-sm ring-1 ring-tema-borda focus-within:ring-2 focus-within:ring-tema-primaria">
        <Search aria-hidden className="size-4 shrink-0 text-tema-texto-suave" />
        <input
          ref={campo}
          type="search"
          value={termo}
          onChange={(e) => aoMudar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              fechar();
            }
          }}
          aria-label={rotulo}
          placeholder="Pesquisar pelo título"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-tema-texto outline-none placeholder:text-tema-texto-suave [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar a pesquisa"
          className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-tema-texto-suave hover:bg-tema-superficie hover:text-tema-texto"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <p role="status" className="px-4 text-sm text-tema-texto-suave">
        {termo.trim() ? (encontrados === 0 ? `Nada encontrado com "${termo.trim()}".` : `${encontrados} de ${total}`) : ""}
      </p>
    </div>
  );
}
