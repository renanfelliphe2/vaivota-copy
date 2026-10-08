import { Check } from "lucide-react";
import { cx } from "@/lib/classes";

type Passo = { id: string; rotulo: string };

function Trilha({ titulo, passos, atual }: { titulo: string; passos: Passo[]; atual: string }) {
  const indiceAtual = passos.findIndex((p) => p.id === atual);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-tema-texto-suave">{titulo}</h3>
      <ol className="flex flex-wrap items-center gap-2">
        {passos.map((p, i) => {
          const feito = i < indiceAtual;
          const corrente = i === indiceAtual;
          return (
            <li key={p.id} aria-current={corrente ? "step" : undefined} className="flex items-center gap-2">
              <span
                className={cx(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold",
                  corrente ? "border-tema-primaria bg-tema-primaria text-tema-sobre-primaria" : "border-tema-borda",
                  feito && "text-tema-texto-suave",
                )}
              >
                {feito && <Check aria-hidden className="size-4" />}
                {p.rotulo}
                {corrente && <span className="sr-only"> (atual)</span>}
              </span>
              {i < passos.length - 1 && <span aria-hidden className="text-tema-texto-suave">→</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** As duas trilhas (evento e urna), com aria-current="step" na posição atual (seção 5.7). */
export function LinhaDoTempoEstado({ estado, estadoUrna }: { estado: string; estadoUrna: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-tema-borda p-4">
      <Trilha
        titulo="Evento"
        atual={estado}
        passos={[
          { id: "RASCUNHO", rotulo: "Rascunho" },
          { id: "ATIVO", rotulo: "Ativo" },
          { id: "CONCLUIDO", rotulo: "Concluído" },
        ]}
      />
      <Trilha
        titulo="Urna"
        atual={estadoUrna}
        passos={[
          { id: "NAO_INICIADA", rotulo: "Não iniciada" },
          { id: "ABERTA", rotulo: "Aberta" },
          { id: "ENCERRADA", rotulo: "Encerrada" },
        ]}
      />
    </div>
  );
}
