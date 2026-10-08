import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";

/** Campos com valor, na ordem de `CampoCandidato.ordem` (os campos já chegam ordenados). */
export function camposComValor(candidato: Candidato, campos: readonly CampoCandidato[]) {
  return campos
    .map((campo) => ({ campo, valor: candidato.camposExtras?.[campo.chave]?.trim() ?? "" }))
    .filter((c) => c.valor !== "");
}

export type CamposExtrasProps = {
  candidato: Candidato;
  campos: readonly CampoCandidato[];
  /** "resumo": até 2, no cartão; "completo": todos, no detalhe. */
  modo: "resumo" | "completo";
  className?: string;
};

/** Etapa 4 (seção 5.5): "Rótulo: valor", só os que têm valor. */
export function CamposExtras({ candidato, campos, modo, className }: CamposExtrasProps) {
  const lista = camposComValor(candidato, campos);
  const visiveis = modo === "resumo" ? lista.slice(0, 2) : lista;
  if (visiveis.length === 0) return null;

  return (
    <dl
      className={cx(
        modo === "resumo" ? "flex flex-col gap-0.5 text-sm" : "grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-base",
        className,
      )}
    >
      {visiveis.map(({ campo, valor }) =>
        modo === "resumo" ? (
          <div key={campo.id} className="flex min-w-0 gap-1">
            <dt className="shrink-0 text-tema-texto-suave">{campo.rotulo}:</dt>
            <dd className="truncate font-medium">{valor}</dd>
          </div>
        ) : (
          <div key={campo.id} className="contents">
            <dt className="text-tema-texto-suave">{campo.rotulo}</dt>
            <dd className="font-medium">{valor}</dd>
          </div>
        ),
      )}
    </dl>
  );
}
