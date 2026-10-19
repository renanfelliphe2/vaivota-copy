import { useId } from "react";
import { cx } from "@/lib/classes";

// Desenhos decorativos da página do evento (19/10/2026), tirados das artes da Maratona Tech Tivit: a rede de nós do
// logo do Rio Pomba Valley e das placas, e a onda que separa o degradê da faixa clara nos crachás.

/** [x, y, raio, destaque]: destaque pinta o nó com a secundária; raio ≥ 12 vira anel. */
const NOS: [number, number, number, boolean?][] = [
  [598, 42, 7],
  [486, 96, 5],
  [566, 178, 14, true],
  [392, 58, 4],
  [452, 216, 6],
  [612, 300, 5],
  [338, 160, 5],
  [512, 336, 8, true],
  [400, 318, 4],
  [588, 428, 13],
  [270, 84, 3],
  [300, 262, 4],
  [458, 446, 4],
];

const LIGACOES: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 3],
  [1, 4],
  [3, 10],
  [3, 6],
  [6, 4],
  [4, 2],
  [2, 5],
  [4, 7],
  [5, 7],
  [7, 9],
  [7, 8],
  [8, 11],
  [6, 11],
  [8, 12],
  [12, 9],
  [10, 6],
  [5, 9],
];

/** Rede de nós em traço claro, mais densa à direita. Cor pelo `text-*` do className. */
export function Constelacao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 480" preserveAspectRatio="xMaxYMin meet" aria-hidden className={cx("pointer-events-none", className)}>
      <g stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5">
        {LIGACOES.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={NOS[a][0]} y1={NOS[a][1]} x2={NOS[b][0]} y2={NOS[b][1]} />
        ))}
      </g>
      {NOS.map(([x, y, r, destaque], i) =>
        r >= 12 ? (
          <g key={i}>
            <circle cx={x} cy={y} r={r} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="2" />
            <circle cx={x} cy={y} r={4} className={destaque ? "fill-tema-secundaria" : undefined} fill={destaque ? undefined : "currentColor"} />
          </g>
        ) : (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={r}
            className={destaque ? "fill-tema-secundaria" : undefined}
            fill={destaque ? undefined : "currentColor"}
            fillOpacity={destaque ? undefined : 0.6}
          />
        ),
      )}
    </svg>
  );
}

/**
 * Onda na base do hero, pintada com o mesmo degradê água → menta (claros) da seção seguinte. As duas ocupam a largura
 * toda, então os degradês coincidem e a passagem não tem emenda.
 */
export function Onda({ className }: { className?: string }) {
  const id = `onda-${useId()}`;
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden className={cx("pointer-events-none", className)}>
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--marca-agua-clara)" }} />
          <stop offset="1" style={{ stopColor: "var(--marca-menta-clara)" }} />
        </linearGradient>
      </defs>
      <path d="M0,92 C210,124 380,38 640,40 C900,42 1050,112 1270,86 C1350,76 1405,54 1440,40 L1440,120 L0,120 Z" fill={`url(#${id})`} />
    </svg>
  );
}
