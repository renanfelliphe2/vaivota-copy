"use client";

import { CircleAlert } from "lucide-react";
import {
  createContext,
  useContext,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cx } from "@/lib/classes";

type ContextoCampo = { id: string; descricaoId?: string; invalido: boolean; obrigatorio: boolean };

const CampoContext = createContext<ContextoCampo | null>(null);

export type CampoProps = {
  id: string;
  rotulo: ReactNode;
  dica?: ReactNode;
  erro?: string | null;
  obrigatorio?: boolean;
  className?: string;
  children: ReactNode;
};

/** Rótulo, dica e erro ligados ao controle por htmlFor e aria-describedby. */
export function Campo({ id, rotulo, dica, erro, obrigatorio = false, className, children }: CampoProps) {
  const dicaId = dica ? `${id}-dica` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  const descricaoId = [erroId, dicaId].filter(Boolean).join(" ") || undefined;

  return (
    <CampoContext.Provider value={{ id, descricaoId, invalido: Boolean(erro), obrigatorio }}>
      <div className={cx("flex flex-col gap-1.5", className)}>
        <label htmlFor={id} className="text-sm font-semibold">
          {rotulo}
          {obrigatorio && <span aria-hidden> *</span>}
        </label>
        {children}
        {erro && (
          <p id={erroId} className="flex items-start gap-1.5 text-sm font-medium text-tema-erro">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>{erro}</span>
          </p>
        )}
        {dica && (
          <p id={dicaId} className="text-sm text-tema-texto-suave">
            {dica}
          </p>
        )}
      </div>
    </CampoContext.Provider>
  );
}

const CLASSE_CONTROLE =
  "w-full rounded-lg border bg-tema-fundo px-3 text-base text-tema-texto placeholder:text-tema-texto-suave " +
  "disabled:cursor-not-allowed disabled:bg-tema-superficie disabled:opacity-70";

function useAtributosCampo() {
  const ctx = useContext(CampoContext);
  const invalido = ctx?.invalido ?? false;
  return {
    atributos: {
      id: ctx?.id,
      "aria-describedby": ctx?.descricaoId,
      "aria-invalid": invalido || undefined,
      required: ctx?.obrigatorio || undefined,
    },
    borda: invalido ? "border-tema-erro border-2" : "border-tema-texto-suave",
  };
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const { atributos, borda } = useAtributosCampo();
  return <input {...atributos} {...props} className={cx(CLASSE_CONTROLE, "min-h-11", borda, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { atributos, borda } = useAtributosCampo();
  return <textarea {...atributos} {...props} className={cx(CLASSE_CONTROLE, "min-h-24 py-2", borda, className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const { atributos, borda } = useAtributosCampo();
  return (
    <select {...atributos} {...props} className={cx(CLASSE_CONTROLE, "min-h-11", borda, className)}>
      {children}
    </select>
  );
}

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  rotulo: ReactNode;
  erro?: string | null;
};

/** Checkbox com rótulo ao lado (alvo de toque ≥ 44 px). */
export function Checkbox({ id, rotulo, erro, className, ...props }: CheckboxProps) {
  const erroId = erro && id ? `${id}-erro` : undefined;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm">
        <input
          {...props}
          id={id}
          type="checkbox"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erroId}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-tema-primaria"
        />
        <span>{rotulo}</span>
      </label>
      {erro && (
        <p id={erroId} className="flex items-start gap-1.5 text-sm font-medium text-tema-erro">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{erro}</span>
        </p>
      )}
    </div>
  );
}
