import type { FaseConfig } from "../travas";
import type { FasePalco } from "./tipos";

// Etapa 8 (D3, seção 5.1): a fase do palco é derivada; componentes nunca comparam estado nem estadoUrna.

export type EntradaFasePalco = {
  fase: FaseConfig;
  /** Existe versão do resultado. */
  resultadoExiste: boolean;
  /** Revelação válida lida (lerRevelacao), ou null. */
  revelacao: { situacao: "EM_ANDAMENTO" | "CONCLUIDA" } | null;
};

export function resolverFasePalco({ fase, resultadoExiste, revelacao }: EntradaFasePalco): FasePalco {
  switch (fase) {
    case "RASCUNHO":
    case "ATIVO_NAO_INICIADA":
      return "PRE_VOTACAO";
    case "URNA_ABERTA":
      return "AO_VIVO";
    case "URNA_ENCERRADA":
      if (!resultadoExiste || !revelacao) return "ENCERRADA_AGUARDANDO";
      return revelacao.situacao === "CONCLUIDA" ? "FINAL_ESTATICO" : "REVELACAO";
    case "CONCLUIDO":
      return resultadoExiste ? "FINAL_ESTATICO" : "SEM_RESULTADO";
  }
}

export const ROTULO_FASE_PALCO: Record<FasePalco, string> = {
  PRE_VOTACAO: "Pré-votação",
  AO_VIVO: "Votação ao vivo",
  ENCERRADA_AGUARDANDO: "Votação encerrada (aguardando a revelação)",
  REVELACAO: "Revelação em andamento",
  FINAL_ESTATICO: "Resultado final",
  SEM_RESULTADO: "Sem resultado",
};
