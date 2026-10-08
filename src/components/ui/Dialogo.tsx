"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/classes";

export type DialogoProps = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  children?: ReactNode;
  /** Botões de ação, alinhados ao fim. */
  rodape?: ReactNode;
  /** Fechar ao clicar fora (padrão: sim). */
  fecharNoFundo?: boolean;
  /** Para onde o foco volta ao fechar (padrão: quem abriu). Etapa 4: o "Ver detalhes" do último exibido. */
  focoAoFechar?: () => HTMLElement | null;
  className?: string;
};

/**
 * <dialog> nativo: foco preso e Esc pelo navegador; o foco volta a quem abriu.
 * Sem portal: fica dentro do TemaEvento e herda os tokens. Em tela pequena vira bottom sheet.
 */
export function Dialogo({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  fecharNoFundo = true,
  focoAoFechar,
  className,
}: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const origem = useRef<HTMLElement | null>(null);
  const tituloId = useId();
  const descricaoId = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (aberto && !dialogo.open) {
      origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialogo.showModal();
    } else if (!aberto && dialogo.open) {
      dialogo.close();
    }
  }, [aberto]);

  const aoFecharNativo = () => {
    (focoAoFechar?.() ?? origem.current)?.focus();
    origem.current = null;
    if (aberto) aoFechar();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      aria-describedby={descricao ? descricaoId : undefined}
      onClose={aoFecharNativo}
      onCancel={(e) => {
        e.preventDefault();
        aoFechar();
      }}
      onClick={(e) => {
        if (fecharNoFundo && e.target === e.currentTarget) aoFechar();
      }}
      className={cx(
        "bg-tema-fundo p-0 text-tema-texto font-tema shadow-2xl",
        // Bottom sheet no celular; centralizado a partir de sm.
        "fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-full rounded-t-2xl",
        "sm:inset-0 sm:m-auto sm:h-fit sm:max-w-lg sm:rounded-2xl",
        className,
      )}
    >
      {aberto && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-tema-borda px-5 py-4">
            <div className="flex flex-col gap-1">
              <h2 id={tituloId} className="text-lg font-bold">
                {titulo}
              </h2>
              {descricao && (
                <p id={descricaoId} className="text-sm text-tema-texto-suave">
                  {descricao}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-tema-superficie"
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {rodape && (
            <div className="flex flex-col-reverse gap-2 border-t border-tema-borda px-5 py-4 sm:flex-row sm:justify-end">
              {rodape}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
