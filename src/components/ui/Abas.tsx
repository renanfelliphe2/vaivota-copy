"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/classes";

export type Aba = {
  id: string;
  rotulo: ReactNode;
  conteudo: ReactNode;
  /** Aba desabilitada: pulada pelas setas, com aria-disabled e a dica ligada por aria-describedby. */
  desabilitada?: boolean;
  dica?: ReactNode;
};

export type AbasProps = {
  abas: Aba[];
  /** Nome acessível da lista de abas. */
  rotulo: string;
  /** Modo controlado. */
  valor?: string;
  aoMudar?: (id: string) => void;
  /** Modo não controlado. */
  valorInicial?: string;
  className?: string;
};

/** role="tablist" com foco por tab index móvel; setas, Home e End alternam (ativação automática). */
export function Abas({ abas, rotulo, valor, aoMudar, valorInicial, className }: AbasProps) {
  const base = useId();
  const primeiraHabilitada = abas.find((a) => !a.desabilitada)?.id ?? abas[0]?.id;
  const [interno, setInterno] = useState(valorInicial ?? primeiraHabilitada);
  const ativo = valor ?? interno;
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const selecionar = (id: string) => {
    if (valor === undefined) setInterno(id);
    aoMudar?.(id);
  };

  const habilitadas = abas.filter((a) => !a.desabilitada);

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const indice = habilitadas.findIndex((a) => a.id === ativo);
    let destino: Aba | undefined;
    if (evento.key === "ArrowRight") destino = habilitadas[(indice + 1) % habilitadas.length];
    else if (evento.key === "ArrowLeft") destino = habilitadas[(indice - 1 + habilitadas.length) % habilitadas.length];
    else if (evento.key === "Home") destino = habilitadas[0];
    else if (evento.key === "End") destino = habilitadas[habilitadas.length - 1];
    if (!destino) return;
    evento.preventDefault();
    selecionar(destino.id);
    refs.current.get(destino.id)?.focus();
  };

  const idAba = (id: string) => `${base}-aba-${id}`;
  const idPainel = (id: string) => `${base}-painel-${id}`;
  const idDica = (id: string) => `${base}-dica-${id}`;
  const atual = abas.find((a) => a.id === ativo);

  return (
    <div className={cx("flex flex-col gap-4", className)}>
      <div role="tablist" aria-label={rotulo} className="flex gap-1 rounded-full bg-tema-superficie p-1">
        {abas.map((aba) => {
          const selecionada = aba.id === ativo;
          return (
            <button
              key={aba.id}
              ref={(el) => {
                if (el) refs.current.set(aba.id, el);
                else refs.current.delete(aba.id);
              }}
              type="button"
              role="tab"
              id={idAba(aba.id)}
              aria-selected={selecionada}
              aria-controls={idPainel(aba.id)}
              aria-disabled={aba.desabilitada || undefined}
              aria-describedby={aba.desabilitada && aba.dica ? idDica(aba.id) : undefined}
              tabIndex={selecionada ? 0 : -1}
              onClick={() => !aba.desabilitada && selecionar(aba.id)}
              onKeyDown={aoTeclar}
              className={cx(
                "min-h-11 flex-1 rounded-full px-4 text-sm font-semibold transition",
                selecionada ? "bg-tema-fundo text-tema-texto shadow-sm" : "text-tema-texto-suave hover:text-tema-texto",
                aba.desabilitada && "cursor-not-allowed opacity-60 hover:text-tema-texto-suave",
              )}
            >
              {aba.rotulo}
            </button>
          );
        })}
      </div>
      {abas
        .filter((a) => a.desabilitada && a.dica)
        .map((a) => (
          <p key={a.id} id={idDica(a.id)} className="-mt-2 text-sm text-tema-texto-suave">
            {a.dica}
          </p>
        ))}
      {atual && (
        <div role="tabpanel" id={idPainel(atual.id)} aria-labelledby={idAba(atual.id)}>
          {atual.conteudo}
        </div>
      )}
    </div>
  );
}
