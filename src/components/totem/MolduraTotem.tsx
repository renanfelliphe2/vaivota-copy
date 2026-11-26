import type { CSSProperties, MouseEventHandler, ReactNode, Ref } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Rosacea } from "@/components/landing/cinema/DecoracoesCinema";
import { cx } from "@/lib/classes";

// Moldura do totem (26/11/2026), no estilo cinema do Festival em versão clara, para crianças: o papel do cinema com a luz do
// projetor (globals.css, .totem-palco), a granulação de filme bem leve, as rosáceas do logo nos cantos e uma borda de
// película em cima (primária) e embaixo (secundária). Usada pelo quiosque e pelo preview do admin, para os dois serem iguais.
// A moldura é um contêiner de tamanho: as telas de dentro medem tudo em cqh/cqw/cqmin e cabem sem rolagem.

export function MolduraTotem({
  children,
  className,
  ref,
  onContextMenu,
}: {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      onContextMenu={onContextMenu}
      className={cx(
        "totem-palco isolate flex touch-manipulation select-none flex-col overflow-hidden overscroll-none text-tema-texto font-tema",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {BOLHAS.map((b, i) => (
          <span
            key={i}
            className="totem-bolha absolute rounded-full"
            style={
              {
                left: `${b.x}%`,
                top: `${b.y}%`,
                width: `${b.tam}cqmin`,
                height: `${b.tam}cqmin`,
                background: `radial-gradient(circle, color-mix(in srgb, var(--tema-${b.cor}) 22%, transparent), transparent 68%)`,
                "--dx": b.dx,
                "--dy": b.dy,
                "--dur": `${b.dur}s`,
                "--atraso": `${b.atraso}s`,
              } as CSSProperties
            }
          />
        ))}
        <div className="cine-grao absolute inset-0" />
        <Rosacea className="totem-girar absolute -left-[14cqmin] -top-[12cqmin] size-[50cqmin] text-tema-primaria opacity-10" />
        <Rosacea
          className="totem-girar absolute -bottom-[16cqmin] -right-[12cqmin] size-[56cqmin] text-tema-secundaria opacity-15 [--dur:180s] [--sentido:reverse]"
        />
      </div>
      <span aria-hidden className="cine-furos-h totem-furos-correm block h-[1.125rem] shrink-0 bg-tema-primaria" />
      <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      <span aria-hidden className="cine-furos-h totem-furos-correm-inverso block h-[1.125rem] shrink-0 bg-tema-secundaria" />
    </div>
  );
}

/** Manchas de luz do fundo: posição (%), tamanho (cqmin), cor do tema e o passeio de cada uma, em tempos diferentes. */
const BOLHAS = [
  { x: 4, y: 52, tam: 46, cor: "primaria", dx: "8cqw", dy: "-6cqh", dur: 19, atraso: 0 },
  { x: 62, y: 4, tam: 40, cor: "secundaria", dx: "-7cqw", dy: "7cqh", dur: 23, atraso: -6 },
  { x: 72, y: 58, tam: 50, cor: "primaria", dx: "-6cqw", dy: "-8cqh", dur: 27, atraso: -12 },
  { x: 24, y: 6, tam: 34, cor: "secundaria", dx: "6cqw", dy: "6cqh", dur: 21, atraso: -3 },
  { x: 38, y: 66, tam: 36, cor: "secundaria", dx: "5cqw", dy: "-5cqh", dur: 25, atraso: -9 },
] as const;

/** Logo do evento no totem: grande na abertura e nas telas de aviso, pequeno no cabeçalho da escolha. */
export function LogoTotem({ nome, logoUrl, pequeno, prioridade }: { nome: string; logoUrl: string | null; pequeno?: boolean; prioridade?: boolean }) {
  return (
    <LogoEvento
      nome={nome}
      logoUrl={logoUrl}
      prioridade={prioridade}
      className={cx("max-w-[60cqw] object-contain", pequeno ? "h-[clamp(2rem,8cqh,3.5rem)]" : "h-[clamp(2.5rem,12cqh,6rem)]")}
    />
  );
}

/** Tela de aviso do totem (bloqueio, sem conexão): o logo em cima e a mensagem no meio, com o ícone num círculo de papel. */
export function AvisoTotem({
  logo,
  icone,
  titulo,
  corpo,
  papel = "status",
  tom = "primaria",
  children,
}: {
  logo?: ReactNode;
  icone: ReactNode;
  titulo: string;
  corpo: string;
  papel?: "status" | "alert";
  tom?: "primaria" | "erro";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center px-[6cqw] py-[4cqh] text-center">
      {logo && <div className="flex shrink-0 justify-center">{logo}</div>}
      <div role={papel} className="palco-entrada flex flex-1 flex-col items-center justify-center gap-[3cqh]">
        <span
          className={cx(
            "flex size-[clamp(4.5rem,20cqmin,9rem)] items-center justify-center rounded-full bg-tema-fundo shadow-lg shadow-black/10 ring-4 [&>svg]:size-1/2",
            tom === "erro" ? "text-tema-erro ring-tema-erro/20" : "text-tema-primaria-texto ring-tema-primaria/20",
          )}
        >
          {icone}
        </span>
        <h1 className="max-w-[24ch] text-balance font-cine text-[clamp(1.6rem,6.5cqmin,4rem)] font-bold leading-tight">{titulo}</h1>
        <p className="max-w-[38ch] text-balance text-[clamp(1.05rem,3.4cqmin,2rem)] text-tema-texto-suave">{corpo}</p>
        {children}
      </div>
    </div>
  );
}
