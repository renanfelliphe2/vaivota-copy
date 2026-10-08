import type { EstadoApp } from "@/dominio/tipos";
import { criarEstadoNucleo } from "./criarEstadoNucleo";

/**
 * Estado inicial do protótipo, usado por "Resetar mock" e pelo cenário PADRAO.
 * Só o núcleo do Festival, sem votos: a demonstração mostra o primeiro voto de cada conta.
 * Volume e resultados vêm dos cenários do grupo RESULTADO.
 */
export function criarEstadoInicial(): EstadoApp {
  return criarEstadoNucleo();
}
