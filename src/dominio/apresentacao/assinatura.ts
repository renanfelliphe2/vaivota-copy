import { hashDeTexto } from "@/lib/aleatorio";
import type { ResultadoOficial } from "../tipos";

// Etapa 8 (D4, rev. 3 D14): assinatura da versão do resultado. Inclui `calculadoEm`: todo congelamento
// novo (mesmo com os mesmos dados) invalida o progresso da revelação.

/** JSON com chaves em ordem estável. */
function estavel(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(estavel).join(",")}]`;
  if (valor && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estavel(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(valor) ?? "null";
}

export function assinaturaDoResultado(
  r: Pick<ResultadoOficial, "versao" | "motivo" | "calculadoEm" | "pesoPopular" | "pesoJuri" | "pesoInfantil" | "dados">,
): string {
  const texto = estavel({
    versao: r.versao,
    motivo: r.motivo,
    calculadoEm: r.calculadoEm,
    pesos: [r.pesoPopular, r.pesoJuri, r.pesoInfantil],
    dados: r.dados,
  });
  return `${hashDeTexto(texto).toString(16)}-${hashDeTexto(texto, 0x9e3779b9).toString(16)}`;
}
