"use client";

import { useMemo, useState } from "react";
import { verificarInvariantes } from "@/dominio/invariantes";
import { useEstadoCompleto } from "@/store/seletores/dev";

// Só na toolbar (D4 não vale para a ferramenta de dev).

/** Resultado de verificarInvariantes. */
export function InspetorEstado() {
  const estado = useEstadoCompleto();
  const violacoes = useMemo(() => verificarInvariantes(estado), [estado]);

  return violacoes.length === 0 ? (
    <p className="rounded-md bg-emerald-950 px-2 py-1 text-xs text-emerald-200">✓ Invariantes: nenhuma violação</p>
  ) : (
    <ul className="flex flex-col gap-1 rounded-md bg-red-950 px-2 py-1 text-xs text-red-200" aria-label="Violações de invariantes">
      {violacoes.map((v) => (
        <li key={v}>✗ {v}</li>
      ))}
    </ul>
  );
}

/** JSON do estado inteiro, sob demanda. */
export function JsonEstado() {
  const estado = useEstadoCompleto();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="self-start rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
      >
        {aberto ? "Ocultar JSON do estado" : "Mostrar JSON do estado"}
      </button>
      {aberto && (
        <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-2 text-[11px] leading-snug text-zinc-300">
          {JSON.stringify({ sessao: estado.sessao, ui: estado.ui, dev: estado.dev, banco: estado.banco }, null, 2)}
        </pre>
      )}
    </div>
  );
}
