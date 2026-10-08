"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { cx } from "@/lib/classes";

type TipoToast = "informacao" | "sucesso" | "erro";
type ItemToast = { id: number; mensagem: string; tipo: TipoToast };
type MostrarToast = (mensagem: string, tipo?: TipoToast) => void;

const ToastContext = createContext<MostrarToast>(() => {});

const ICONES = { informacao: Info, sucesso: CircleCheck, erro: CircleAlert };
const CORES = { informacao: "text-tema-info", sucesso: "text-tema-sucesso", erro: "text-tema-erro" };
const DURACAO_MS = 5000;

let proximoId = 1;

/** Avisos curtos no canto da tela; o texto também vai para a LiveRegion. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemToast[]>([]);
  const anunciar = useAnunciar();

  const remover = useCallback((id: number) => setItens((lista) => lista.filter((t) => t.id !== id)), []);

  const mostrar = useCallback<MostrarToast>(
    (mensagem, tipo = "informacao") => {
      const id = proximoId++;
      setItens((lista) => [...lista.slice(-2), { id, mensagem, tipo }]);
      anunciar(mensagem, tipo === "erro" ? "assertive" : "polite");
      setTimeout(() => remover(id), DURACAO_MS);
    },
    [anunciar, remover],
  );

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div
        data-print="ocultar"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4"
      >
        {itens.map((t) => {
          const Icone = ICONES[t.tipo];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-tema-borda bg-tema-fundo px-4 py-3 text-sm text-tema-texto shadow-lg"
            >
              <Icone aria-hidden className={cx("size-5 shrink-0", CORES[t.tipo])} />
              <p className="flex-1">{t.mensagem}</p>
              <button
                type="button"
                onClick={() => remover(t.id)}
                aria-label="Fechar aviso"
                className="-mr-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-tema-superficie"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): MostrarToast {
  return useContext(ToastContext);
}
