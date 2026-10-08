import type { EstadoApp } from "@/dominio/tipos";
import { criarEstadoNucleo } from "./criarEstadoNucleo";
import { aplicarVolumeSemanaTech } from "./volume/semanaTech";

/**
 * Estado inicial do protótipo, usado por "Resetar mock" e pelo cenário PADRAO.
 * Etapa 7 (D10): núcleo + seed de volume da Semana Tech (o PADRAO já mostra um evento cheio).
 */
export function criarEstadoInicial(): EstadoApp {
  return aplicarVolumeSemanaTech(criarEstadoNucleo());
}
