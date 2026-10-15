import { chamar } from "./rpc";
import type { Resultado } from "./resultado";

// ST5: imprimir o relatório registra RELATORIO_GERADO com a versão; Ctrl+P direto não passa por aqui.

export function registrarRelatorioGerado(eventoId: string): Promise<Resultado<{ versao: number }>> {
  return chamar<{ versao: number }>("registrarRelatorioGerado", { eventoId });
}
