"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Campo, Input } from "@/components/ui/Campo";

export type CampoSenhaProps = {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  aoSair?: () => void;
  erro?: string | null;
  dica?: ReactNode;
  /** "current-password" no login; "new-password" no cadastro e na recuperação. */
  autoComplete: "current-password" | "new-password";
  obrigatorio?: boolean;
};

/** Senha com botão de mostrar/ocultar (requisito §4.3: quem digita devagar confere o que escreveu). */
export function CampoSenha({ id, rotulo, valor, aoMudar, aoSair, erro, dica, autoComplete, obrigatorio }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);
  return (
    <Campo id={id} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={obrigatorio}>
      <div className="relative">
        <Input
          type={visivel ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          onBlur={aoSair}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visivel}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-lg text-tema-texto-suave hover:text-tema-texto"
        >
          {visivel ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </div>
    </Campo>
  );
}
