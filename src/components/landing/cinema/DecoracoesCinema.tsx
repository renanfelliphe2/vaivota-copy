import { cx } from "@/lib/classes";

// Desenhos decorativos do estilo cinema da página do evento (07/11/2026, Festival Ver e Fazer Filmes).

/** Centros dos oito círculos da rosácea (raio 34, de 45° em 45°), fixos para o servidor e o navegador baterem. */
const CENTROS: [number, number][] = [
  [34, 0],
  [24.04, 24.04],
  [0, 34],
  [-24.04, 24.04],
  [-34, 0],
  [-24.04, -24.04],
  [0, -34],
  [24.04, -24.04],
];

/** Rosácea de oito círculos, como a flor do logo do Festival. Traço na cor do `text-*` do className. */
export function Rosacea({ className }: { className?: string }) {
  return (
    <svg viewBox="-72 -72 144 144" aria-hidden className={cx("pointer-events-none", className)}>
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        {CENTROS.map(([x, y]) => (
          <circle key={`${x},${y}`} cx={x} cy={y} r="34" />
        ))}
      </g>
    </svg>
  );
}

/**
 * Quadro da contagem regressiva do começo de um filme (o "leader": círculos, mira e o número). Ocupa as casas da
 * película enquanto não há cartaz. Proporção 5:7, como o cartaz.
 */
export function QuadroContagem({ numero, className }: { numero: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 140" aria-hidden className={cx("block h-auto w-full", className)}>
      <rect width="100" height="140" fill="#2b2522" />
      <circle cx="50" cy="70" r="40" fill="#3a322e" />
      <g fill="none" stroke="#fff4e0">
        <circle cx="50" cy="70" r="40" strokeOpacity="0.75" strokeWidth="2.5" />
        <circle cx="50" cy="70" r="31" strokeOpacity="0.35" strokeWidth="1.5" />
        <line x1="50" y1="14" x2="50" y2="126" strokeOpacity="0.3" strokeWidth="1.5" />
        <line x1="4" y1="70" x2="96" y2="70" strokeOpacity="0.3" strokeWidth="1.5" />
      </g>
      <text
        x="50"
        y="72"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fff4e0"
        fontSize="46"
        fontWeight="700"
        style={{ fontFamily: "var(--fonte-arvo), var(--tema-fonte)" }}
      >
        {numero}
      </text>
    </svg>
  );
}
