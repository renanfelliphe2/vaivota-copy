import { PencilRuler } from "lucide-react";

/** Só para o admin deste evento, com o evento em rascunho (Etapa 2, D2). */
export function BannerRascunho() {
  return (
    <div role="note" className="w-full border-b-2 border-tema-aviso bg-tema-superficie">
      <p className="mx-auto flex max-w-3xl items-start gap-2 px-4 py-3 text-sm sm:px-6">
        <PencilRuler aria-hidden className="mt-0.5 size-4 shrink-0 text-tema-aviso" />
        <span>
          <strong className="text-tema-aviso">Rascunho</strong> — Só administradores deste evento veem esta página.
        </span>
      </p>
    </div>
  );
}
