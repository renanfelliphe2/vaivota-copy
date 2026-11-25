"use client";

import type { CSSProperties, ReactNode } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { LogoEvento } from "@/components/evento/LogoEvento";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import { cx } from "@/lib/classes";
import { TEXTOS_PALCO } from "@/lib/textosPalco";

// Telão (cerimônia, 25/11/2026; protótipo aprovado "Telão do Festival"): as peças da sala de cinema, comuns a todas as cenas. Tudo no
// canvas lógico de 1920×1080 (telao.css). Decorações são aria-hidden.

/** `--tc-atraso` para as animações de entrada (telao.css). */
export function atrasoTc(ms: number): CSSProperties {
  return { "--tc-atraso": `${ms}ms` } as CSSProperties;
}

/** Granulação e feixe do projetor (fundo de toda cena). */
export function FundoSala({ feixe = true }: { feixe?: boolean }) {
  return (
    <>
      {feixe && <div aria-hidden className="tc-feixe" />}
      <div aria-hidden className="tc-grao" />
    </>
  );
}

/** Uma fileira de furos da película, de ponta a ponta. */
export function Furos({ quantidade, className, furo = "h-3 w-[18px]" }: { quantidade: number; className?: string; furo?: string }) {
  return (
    <div aria-hidden className={cx("flex items-center justify-between", className)}>
      {Array.from({ length: quantidade }, (_, i) => (
        <span key={i} className={cx("rounded-[3px] bg-tc-luz/80", furo)} />
      ))}
    </div>
  );
}

/** As bordas de película no alto e no pé da tela. */
export function BordasPelicula({ alto = true, pe = true }: { alto?: boolean; pe?: boolean }) {
  return (
    <>
      {alto && <Furos quantidade={54} className="absolute inset-x-0 top-0 h-[34px] bg-tc-pelicula px-2.5" />}
      {pe && <Furos quantidade={54} className="absolute inset-x-0 bottom-0 h-[34px] bg-tc-pelicula px-2.5" />}
    </>
  );
}

/** "Apuração por VaiVota", discreta (na vertical numa borda ou na horizontal no pé). */
export function MarcaVaiVota({ vertical = false, className }: { vertical?: boolean; className?: string }) {
  return (
    <p
      className={cx("absolute m-0 text-[20px] font-semibold tracking-[0.06em] text-tc-apagado", className)}
      style={vertical ? { writingMode: "vertical-rl", transform: "rotate(180deg)" } : undefined}
    >
      {TEXTOS_PALCO.marca}
    </p>
  );
}

/** As cores do tema numa faixa curta (como na landing). */
export function FaixaCores({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cx("flex h-2 w-[132px] overflow-hidden rounded", className)}>
      <span className="flex-1 bg-tema-primaria" />
      <span className="flex-1 bg-tema-secundaria" />
    </span>
  );
}

/** Rótulo de seção: Arvo, caixa alta, espaçado. */
export function Sobretitulo({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <p className={cx("m-0 font-cine text-[26px] font-bold uppercase tracking-[0.2em] text-tc-primaria-clara", className)} style={style}>
      {children}
    </p>
  );
}

export function LogoTelao({ nome, logoUrl, className = "h-[88px]" }: { nome: string; logoUrl: string | null; className?: string }) {
  return (
    <div className={cx("[&_span]:font-cine [&_span]:text-[48px]", className)}>
      <LogoEvento nome={nome} logoUrl={logoUrl} className={className} />
    </div>
  );
}

// ─── Louros de festival ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Um ramo (o da esquerda; o outro é o espelho). O caule vai sem preenchimento: preenchido, ele recortava uma faixa no meio. */
function ramo(): { caule: string; folhas: string } {
  const cx0 = 100;
  const cy0 = 100;
  const r = 80;
  const rad = (d: number) => (d * Math.PI) / 180;
  const ponto = (t: number) => [cx0 + r * Math.cos(rad(t)), cy0 + r * Math.sin(rad(t))];
  const f = (n: number) => n.toFixed(1);
  const folha = (b: number[], d: number[], L: number, w: number) => {
    const ponta = [b[0] + d[0] * L, b[1] + d[1] * L];
    const meio = [b[0] + d[0] * L * 0.5, b[1] + d[1] * L * 0.5];
    const q = [-d[1], d[0]];
    const c1 = [meio[0] + q[0] * w, meio[1] + q[1] * w];
    const c2 = [meio[0] - q[0] * w, meio[1] - q[1] * w];
    return `M${f(b[0])} ${f(b[1])}Q${f(c1[0])} ${f(c1[1])} ${f(ponta[0])} ${f(ponta[1])}Q${f(c2[0])} ${f(c2[1])} ${f(b[0])} ${f(b[1])}Z`;
  };
  const a = ponto(98);
  const z = ponto(256);
  const folhas: string[] = [];
  for (let k = 0; k < 9; k++) {
    const t = 108 + k * 17;
    const s = Math.sin(rad(35));
    const c = Math.cos(rad(35));
    const T = [-Math.sin(rad(t)), Math.cos(rad(t))];
    const N = [Math.cos(rad(t)), Math.sin(rad(t))];
    const L = 25 - k * 0.9;
    const w = L * 0.36;
    const b = ponto(t);
    folhas.push(folha(b, [T[0] * c + N[0] * s, T[1] * c + N[1] * s], L, w));
    folhas.push(folha(b, [T[0] * c - N[0] * s, T[1] * c - N[1] * s], L * 0.82, w * 0.85));
  }
  folhas.push(folha(z, [-Math.sin(rad(256)), Math.cos(rad(256))], 16, 5.5));
  return { caule: `M${f(a[0])} ${f(a[1])}A${r} ${r} 0 0 1 ${f(z[0])} ${f(z[1])}`, folhas: folhas.join("") };
}

const RAMO = ramo();

/** Louros de festival de cinema com o texto no meio. */
export function Louros({ tamanho, children, className, style }: { tamanho: number; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={cx("relative shrink-0", className)} style={{ width: tamanho, height: tamanho, ...style }}>
      <svg aria-hidden viewBox="0 0 200 200" width={tamanho} height={tamanho} className="absolute inset-0">
        <g fill="color-mix(in srgb, var(--tc-luz) 8%, transparent)" stroke="var(--tc-luz)" strokeWidth={1.8} strokeLinejoin="round">
          <path d={RAMO.caule} fill="none" />
          <path d={RAMO.folhas} />
          <g transform="translate(200 0) scale(-1 1)">
            <path d={RAMO.caule} fill="none" />
            <path d={RAMO.folhas} />
          </g>
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ─── Contagem de início de filme ──────────────────────────────────────────────────────────────────────────────────────────────

/** O quadro da contagem (círculos, mira e o número), com o ponteiro girando. */
export function QuadroContagem({ numero, tamanho, className }: { numero: number | string; tamanho: number; className?: string }) {
  const circulo = Math.round(tamanho * 0.725);
  return (
    <div aria-hidden className={cx("relative overflow-hidden bg-tc-quadro", className)} style={{ width: tamanho, height: tamanho }}>
      <div className="absolute inset-x-0 top-1/2 h-0.5 bg-tc-luz/20" />
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-tc-luz/20" />
      <div
        className="absolute rounded-full shadow-[inset_0_0_0_4px_color-mix(in_srgb,var(--tc-luz)_60%,transparent)]"
        style={{ width: circulo, height: circulo, left: (tamanho - circulo) / 2, top: (tamanho - circulo) / 2 }}
      >
        <div className="tc-varredura" />
        <div className="absolute inset-[8%] rounded-full shadow-[inset_0_0_0_4px_color-mix(in_srgb,var(--tc-luz)_40%,transparent)]" />
        <p className="absolute inset-0 m-0 flex items-center justify-center font-cine font-bold leading-none text-tc-luz" style={{ fontSize: Math.round(circulo * 0.52) }}>
          {numero}
        </p>
      </div>
    </div>
  );
}

// ─── Cartaz ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** O cartaz do item no formato de cartaz (3:4). */
export function CartazTelao({ candidato, className, sizes = "600px" }: { candidato: CandidatoPalco; className?: string; sizes?: string }) {
  return <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="5/7" sizes={sizes} className={cx("aspect-[3/4]! rounded-[2px]", className)} />;
}
