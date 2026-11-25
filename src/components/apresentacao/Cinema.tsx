"use client";

import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { cx } from "@/lib/classes";

// 08/10/2026: peças de cena da revelação cinematográfica (palco escuro, holofotes, poeira de luz, raios, flash e
// confete). Tudo em CSS (globals.css, .cinema-*); posições "aleatórias" vêm de um ruído determinístico, para o
// render ser puro. Com prefers-reduced-motion as animações param no estado final (regra global).

/** Ruído determinístico em [0, 1). */
export function ruido(i: number, semente = 1): number {
  const x = Math.sin(i * 12.9898 + semente * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Estilo com variáveis CSS (--atraso, --dur…). */
export function vars(v: Record<string, string | number>): CSSProperties {
  return v as CSSProperties;
}

export function atraso(ms: number, extra: Record<string, string | number> = {}): CSSProperties {
  return vars({ "--atraso": `${ms}ms`, ...extra });
}

/** Feixes que varrem o palco, vindos de cima. Também no fundo de todas as cenas do telão (FundoSala, 25/11/2026). */
export function Holofotes({ rapidos }: { rapidos?: boolean }) {
  const feixes = [
    { left: "18%", de: "-32deg", ate: "18deg", dur: rapidos ? "2.4s" : "7s", atraso: "0ms" },
    { left: "82%", de: "30deg", ate: "-16deg", dur: rapidos ? "2.1s" : "8s", atraso: "-2s" },
  ];
  return (
    <>
      {feixes.map((f) => (
        <div
          key={f.left}
          className="cinema-holofote absolute -top-24 h-[1500px] w-[560px] -translate-x-1/2"
          style={vars({ left: f.left, "--de": f.de, "--ate": f.ate, "--dur": f.dur, "--atraso": f.atraso })}
        >
          <div
            className="size-full opacity-40 mix-blend-screen"
            style={{
              background: "linear-gradient(180deg, var(--cinema-luz) 0%, transparent 78%)",
              clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
              filter: "blur(18px)",
            }}
          />
        </div>
      ))}
    </>
  );
}

/** Partículas de luz subindo devagar. */
function Poeira({ quantidade = 28 }: { quantidade?: number }) {
  return (
    <>
      {Array.from({ length: quantidade }, (_, i) => {
        const tamanho = 3 + ruido(i, 2) * 7;
        return (
          <span
            key={i}
            className="cinema-poeira absolute rounded-full bg-cinema-luz"
            style={vars({
              left: `${ruido(i, 3) * 100}%`,
              top: `${45 + ruido(i, 4) * 60}%`,
              width: tamanho,
              height: tamanho,
              filter: `blur(${tamanho > 7 ? 2 : 0.5}px)`,
              "--dur": `${9 + ruido(i, 5) * 10}s`,
              "--atraso": `${-ruido(i, 6) * 18}s`,
              "--deriva": `${(ruido(i, 7) - 0.5) * 160}px`,
              "--brilho": 0.25 + ruido(i, 8) * 0.5,
            })}
          />
        );
      })}
    </>
  );
}

/** Fundo da cena: vinheta, holofotes e poeira. `tensao` acelera os holofotes (suspense). */
export function FundoCinema({ holofotes = true, poeira = true, tensao = false }: { holofotes?: boolean; poeira?: boolean; tensao?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {holofotes && <Holofotes rapidos={tensao} />}
      {poeira && <Poeira />}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, rgb(0 0 0 / 0.65) 100%)" }} />
    </div>
  );
}

/** Palco escuro de uma cena da revelação. */
export function PalcoCinema({ children, className, fundo }: { children: ReactNode; className?: string; fundo?: ReactNode }) {
  return (
    <div className={cx("palco-cinema relative h-full overflow-hidden", className)}>
      {fundo ?? <FundoCinema />}
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/** Papel de uma camada na passagem pelo preto: em cena, saindo (escurece) ou entrando por baixo (ainda escondida). */
export type PapelNaPassagem = "EM_CENA" | "SAINDO" | "ENTRANDO";

const PassagemContext = createContext<PapelNaPassagem>("EM_CENA");

/** Papel da cena na passagem: o trailer baixa o som ao sair e só clareia depois de entrar de fato. */
export function usePapelNaPassagem(): PapelNaPassagem {
  return useContext(PassagemContext);
}

/**
 * O papel vem da Transicao do telão (telao/Transicao.tsx, 25/11/2026), que substituiu a passagem pelo preto: a cena que sai continua
 * montada (o vídeo segue rodando) enquanto a nova entra pelo corte escolhido.
 */
export const ProvedorPapel = PassagemContext.Provider;

/** Abertura da cena: sai do preto. */
export function Cortina() {
  return <div aria-hidden className="cinema-cortina pointer-events-none absolute inset-0 z-40 bg-black" />;
}

/** Reticências que piscam em sequência ("E o vencedor é…"). */
export function Reticencias() {
  return (
    <span aria-hidden className="cinema-reticencias">
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );
}

