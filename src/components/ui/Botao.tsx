import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/classes";

export type VarianteBotao = "primaria" | "secundaria" | "contorno" | "fantasma" | "perigo";
export type TamanhoBotao = "pequeno" | "medio" | "grande";

const VARIANTES: Record<VarianteBotao, string> = {
  primaria: "bg-tema-primaria text-tema-sobre-primaria hover:opacity-90",
  secundaria: "bg-tema-secundaria text-tema-sobre-secundaria hover:opacity-90",
  contorno: "border border-tema-texto-suave text-tema-texto hover:bg-tema-superficie",
  fantasma: "text-tema-primaria-texto hover:bg-tema-superficie",
  perigo: "bg-tema-erro text-tema-fundo hover:opacity-90",
};

const TAMANHOS: Record<TamanhoBotao, string> = {
  pequeno: "min-h-11 px-4 text-sm",
  medio: "min-h-11 px-6 text-base",
  grande: "min-h-12 px-8 text-base",
};

type Comum = {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
  /** Mostra o spinner, define aria-busy e impede novo clique. */
  carregando?: boolean;
  larguraTotal?: boolean;
  icone?: ReactNode;
  className?: string;
  children: ReactNode;
};

type ComoBotao = Comum & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };
type ComoLink = Comum & {
  /** Rota interna: renderiza next/link (preserva o estado em memória). */
  href: string;
  disabled?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
  onClick?: () => void;
};

export type BotaoProps = ComoBotao | ComoLink;

export function classesBotao({
  variante = "primaria",
  tamanho = "medio",
  larguraTotal,
  className,
}: Pick<Comum, "variante" | "tamanho" | "larguraTotal" | "className">) {
  return cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition select-none",
    "disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    VARIANTES[variante],
    TAMANHOS[tamanho],
    larguraTotal && "w-full",
    className,
  );
}

export function Botao(props: BotaoProps) {
  const { variante, tamanho, carregando, larguraTotal, icone, className, children } = props;
  const classes = classesBotao({ variante, tamanho, larguraTotal, className });
  const conteudo = (
    <>
      {carregando ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : icone}
      <span>{children}</span>
    </>
  );

  if (props.href !== undefined && !props.disabled) {
    return (
      <Link
        href={props.href}
        className={classes}
        onClick={props.onClick}
        aria-describedby={props["aria-describedby"]}
        aria-label={props["aria-label"]}
      >
        {conteudo}
      </Link>
    );
  }

  const {
    variante: _v,
    tamanho: _t,
    carregando: _c,
    larguraTotal: _l,
    icone: _i,
    className: _cn,
    children: _ch,
    href: _h,
    type,
    disabled,
    onClick,
    ...resto
  } = props as ComoBotao;
  void [_v, _t, _c, _l, _i, _cn, _ch, _h];

  return (
    <button
      {...resto}
      type={type ?? "button"}
      className={classes}
      disabled={disabled}
      aria-busy={carregando || undefined}
      onClick={carregando ? undefined : onClick}
    >
      {conteudo}
    </button>
  );
}
