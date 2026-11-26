/**
 * Local do evento (26/11/2026). O campo é um texto só, com as partes separadas por " · ": a primeira é o lugar (vai à pílula do
 * topo, curta) e o resto é o endereço (vai ao rodapé do "Sobre o evento", com o link do mapa). Ex.:
 * "Anfiteatro Ivan Muller Botelho · Av. Astolfo Dutra, 41 – Centro · Cataguases (MG)".
 */
export type PartesDoLocal = {
  /** A primeira parte: o nome do lugar. */
  lugar: string;
  /** O resto, ainda separado por " · "; null quando o local tem uma parte só. */
  endereco: string | null;
  /** Tudo, para leitores de tela e para a busca do mapa. */
  completo: string;
  /** Busca do endereço completo no Google Maps (abre o app no celular). */
  mapaUrl: string;
};

const SEPARADOR = /\s+·\s+/;

export function partesDoLocal(local: string | null | undefined): PartesDoLocal | null {
  const partes = (local ?? "")
    .split(SEPARADOR)
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length === 0) return null;
  const [lugar, ...resto] = partes;
  return {
    lugar,
    endereco: resto.length ? resto.join(" · ") : null,
    completo: partes.join(" · "),
    mapaUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(", "))}`,
  };
}
