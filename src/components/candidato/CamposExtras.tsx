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

/**
 * Etapa 4 (seção 5.5): só os que têm valor. 19/10/2026: no resumo, a descrição vira um parágrafo de até 2 linhas, sem o
 * rótulo (é o texto que apresenta o candidato), e os demais seguem "Rótulo: valor"; no completo, rótulo acima do valor.
 */
export function CamposExtras({ candidato, campos, modo, className }: CamposExtrasProps) {
  const lista = camposComValor(candidato, campos);
  const visiveis = modo === "resumo" ? lista.slice(0, 2) : lista;
  if (visiveis.length === 0) return null;

  if (modo === "resumo") {
    const descricao = visiveis.find(({ campo }) => campo.chave === "descricao");
    const rotulados = visiveis.filter((c) => c !== descricao);
    return (
      <div className={cx("flex flex-col gap-1 text-sm", className)}>
        {descricao && <p className="line-clamp-2 text-tema-texto-suave">{descricao.valor}</p>}
        {rotulados.length > 0 && (
          <dl className="flex flex-col gap-0.5">
            {rotulados.map(({ campo, valor }) => (
              <div key={campo.id} className="flex min-w-0 gap-1">
                <dt className="shrink-0 text-tema-texto-suave">{campo.rotulo}:</dt>
                <dd className="truncate font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    );
  }

  return (
    <dl className={cx("flex flex-col gap-4 text-base", className)}>
      {visiveis.map(({ campo, valor }) => (
        <div key={campo.id} className="flex flex-col gap-1">
          <dt className="text-xs font-bold uppercase tracking-wider text-tema-primaria-texto">{campo.rotulo}</dt>
          <dd className={cx("leading-relaxed", campo.chave === "descricao" && "whitespace-pre-line")}>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
