import type { ArquivoExportacao } from "@/dominio/exportacao";
import type { CelulaCsv } from "@/lib/csv";
import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST5: o servidor monta as linhas, tira qualquer e-mail e registra EXPORTACAO_CSV na auditoria. O download (montarCsv +
// baixarCsv) é do componente. Falha não registra nada.

export type ArquivoPreparado = { nome: string; cabecalho: string[]; linhas: CelulaCsv[][] };

export function prepararExportacao(eventoId: string, arquivo: ArquivoExportacao): Promise<Resultado<ArquivoPreparado>> {
  return chamar<ArquivoPreparado>("prepararExportacao", { eventoId, arquivo });
}
