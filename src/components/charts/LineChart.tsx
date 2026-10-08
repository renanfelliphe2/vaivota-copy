"use client";

import { useId, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cx } from "@/lib/classes";
import { formatarNumero } from "@/lib/formatar";

// Etapa 7 (D14, seção 5.8): gráfico de linha em SVG próprio, só com tokens do tema. Não importa store nem
// serviços (a Etapa 8 reaproveita). Alternativa textual em <details>; tooltip por foco (setas) e por hover.

export type PontoLinha = {
  /** Rótulo curto do eixo X (ex.: "13:40"). */
  rotulo: string;
  valor: number;
};

export type TabelaAlternativa = { legenda: string; cabecalho: string[]; linhas: (string | number)[][] };

export type LineChartProps = {
  titulo: string;
  pontos: PontoLinha[];
  /** Índice destacado (pico). */
  destaque?: number | null;
  /** Resumo para o leitor de tela ("Votos por minuto. Pico de 14 votos às 13:41"). */
  alt: string;
  rotuloY: string;
  tabela: TabelaAlternativa;
  /** Texto do estado vazio (sem eixo quebrado). */
  vazio?: string;
  className?: string;
};

const LARGURA = 640;
const ALTURA = 220;
const MARGEM = { topo: 16, direita: 12, base: 28, esquerda: 36 };
const MARCAS_X = 5;

function teto(n: number): number {
  if (n <= 5) return 5;
  const ordem = 10 ** Math.floor(Math.log10(n));
  return Math.ceil(n / ordem) * ordem;
}

export function LineChart({ titulo, pontos, destaque = null, alt, rotuloY, tabela, vazio = "Ainda não há dados.", className }: LineChartProps) {
  const id = useId();
  const [ativo, setAtivo] = useState<number | null>(null);
  const semDados = pontos.length === 0 || pontos.every((p) => p.valor === 0);

  const maximo = teto(Math.max(0, ...pontos.map((p) => p.valor)));
  const largura = LARGURA - MARGEM.esquerda - MARGEM.direita;
  const altura = ALTURA - MARGEM.topo - MARGEM.base;
  const x = (i: number) => MARGEM.esquerda + (pontos.length <= 1 ? largura / 2 : (i * largura) / (pontos.length - 1));
  const y = (v: number) => MARGEM.topo + altura - (v / maximo) * altura;
  const caminho = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const passoMarca = Math.max(1, Math.ceil(pontos.length / MARCAS_X));
  const marcasX = pontos.map((p, i) => ({ i, rotulo: p.rotulo })).filter(({ i }) => i % passoMarca === 0 || i === pontos.length - 1);
  const foco = ativo ?? destaque;

  const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
    if (pontos.length === 0) return;
    const atual = ativo ?? destaque ?? 0;
    let proximo: number | null = null;
    if (e.key === "ArrowRight") proximo = Math.min(pontos.length - 1, atual + 1);
    else if (e.key === "ArrowLeft") proximo = Math.max(0, atual - 1);
    else if (e.key === "Home") proximo = 0;
    else if (e.key === "End") proximo = pontos.length - 1;
    else if (e.key === "Escape") return setAtivo(null);
    if (proximo === null) return;
    e.preventDefault();
    setAtivo(proximo);
  };

  const aoMover = (e: MouseEvent<SVGSVGElement>) => {
    const caixa = e.currentTarget.getBoundingClientRect();
    const relativo = ((e.clientX - caixa.left) / caixa.width) * LARGURA;
    const i = Math.round(((relativo - MARGEM.esquerda) / largura) * (pontos.length - 1));
    setAtivo(Math.min(pontos.length - 1, Math.max(0, i)));
  };

  return (
    <figure className={cx("flex flex-col gap-3", className)}>
      <figcaption className="text-base font-semibold">{titulo}</figcaption>
      {semDados ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-6 text-center text-sm text-tema-texto-suave">{vazio}</p>
      ) : (
        <div
          tabIndex={0}
          role="group"
          aria-label={`${alt}. Use as setas para percorrer os pontos.`}
          aria-describedby={`${id}-dica`}
          onKeyDown={aoTeclar}
          onBlur={() => setAtivo(null)}
          className="relative rounded-xl"
        >
          <svg
            role="img"
            aria-label={alt}
            viewBox={`0 0 ${LARGURA} ${ALTURA}`}
            className="h-auto w-full text-tema-texto-suave"
            onMouseMove={aoMover}
            onMouseLeave={() => setAtivo(null)}
          >
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line
                  x1={MARGEM.esquerda}
                  x2={LARGURA - MARGEM.direita}
                  y1={y(maximo * f)}
                  y2={y(maximo * f)}
                  stroke="currentColor"
                  strokeOpacity={0.25}
                  strokeDasharray={f === 0 ? undefined : "4 4"}
                />
                <text x={MARGEM.esquerda - 6} y={y(maximo * f) + 4} textAnchor="end" fontSize={12} fill="currentColor">
                  {formatarNumero(Math.round(maximo * f))}
                </text>
              </g>
            ))}
            {marcasX.map(({ i, rotulo }) => (
              <text key={i} x={x(i)} y={ALTURA - 8} textAnchor="middle" fontSize={12} fill="currentColor">
                {rotulo}
              </text>
            ))}
            <path d={caminho} fill="none" stroke="var(--tema-primaria-texto)" strokeWidth={2.5} strokeLinejoin="round" />
            {foco !== null && pontos[foco] && (
              <g>
                <line x1={x(foco)} x2={x(foco)} y1={MARGEM.topo} y2={MARGEM.topo + altura} stroke="currentColor" strokeOpacity={0.4} />
                <circle cx={x(foco)} cy={y(pontos[foco].valor)} r={6} fill="var(--tema-fundo)" stroke="var(--tema-primaria-texto)" strokeWidth={3} />
              </g>
            )}
            <text x={MARGEM.esquerda} y={11} fontSize={11} fill="currentColor">
              {rotuloY}
            </text>
          </svg>
          {foco !== null && pontos[foco] && (
            <p
              aria-live="polite"
              className="pointer-events-none absolute right-2 top-2 rounded-lg border border-tema-borda bg-tema-fundo px-3 py-1.5 text-sm shadow-sm"
            >
              <span className="font-semibold tabular-nums">{pontos[foco].rotulo}</span>: {formatarNumero(pontos[foco].valor)}
              {foco === destaque && ativo === null ? " (pico)" : ""}
            </p>
          )}
          <p id={`${id}-dica`} className="sr-only">
            A tabela com os dados está logo abaixo, em Ver dados.
          </p>
        </div>
      )}
      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-tema-primaria-texto">Ver dados</summary>
        <div className="mt-2 max-h-80 overflow-auto rounded-xl border border-tema-borda">
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="sr-only">{tabela.legenda}</caption>
            <thead className="sticky top-0 bg-tema-superficie">
              <tr>
                {tabela.cabecalho.map((c) => (
                  <th key={c} scope="col" className="px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabela.linhas.map((linha, i) => (
                <tr key={i} className="border-t border-tema-borda">
                  {linha.map((celula, j) =>
                    j === 0 ? (
                      <th key={j} scope="row" className="px-3 py-1.5 font-normal">
                        {celula}
                      </th>
                    ) : (
                      <td key={j} className="px-3 py-1.5">
                        {celula}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
