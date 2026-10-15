import Image from "next/image";
import { cx } from "@/lib/classes";

export type ImagemCandidatoProps = {
  titulo: string;
  imagemUrl: string | null;
  /** Proporção fixa para não dar salto de layout. */
  proporcao?: "4/3" | "16/9" | "1/1";
  className?: string;
  /** Repassado ao next/image. */
  sizes?: string;
};

const PROPORCOES = { "4/3": "aspect-[4/3]", "16/9": "aspect-video", "1/1": "aspect-square" };

function inicial(titulo: string): string {
  return titulo.trim().charAt(0).toLocaleUpperCase("pt-BR") || "?";
}

/** Cartaz desenhado com os tokens do tema (D16). Varia o fundo e o desenho pelo número. */
function Cartaz({ n, titulo }: { n: number; titulo: string }) {
  const secundaria = n % 2 === 0;
  const fundo = secundaria ? "var(--tema-secundaria)" : "var(--tema-primaria)";
  const tinta = secundaria ? "var(--tema-sobre-secundaria)" : "var(--tema-sobre-primaria)";
  const desenho = n % 4;
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="size-full" aria-hidden>
      <rect width="400" height="300" fill={fundo} />
      <g fill={tinta} fillOpacity="0.14">
        {desenho === 0 && (
          <>
            <circle cx="320" cy="60" r="120" />
            <circle cx="60" cy="280" r="80" />
          </>
        )}
        {desenho === 1 &&
          [0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 80 - 40} y="-20" width="36" height="360" transform="rotate(20 200 150)" />)}
        {desenho === 2 && (
          <>
            <rect x="230" y="30" width="200" height="200" rx="40" transform="rotate(15 330 130)" />
            <rect x="-40" y="200" width="160" height="160" rx="30" />
          </>
        )}
        {desenho === 3 &&
          [0, 1, 2, 3, 4].map((i) => <circle key={i} cx="200" cy="150" r={40 + i * 45} fill="none" stroke={tinta} strokeOpacity="0.2" strokeWidth="14" />)}
      </g>
      <text
        x="40"
        y="250"
        fill={tinta}
        fontSize="150"
        fontWeight="700"
        style={{ fontFamily: "var(--tema-fonte)" }}
      >
        {inicial(titulo)}
      </text>
    </svg>
  );
}

/**
 * Imagem de candidato: endereço `https://` do Supabase Storage ou caminho local `/uploads/` (next/image; o domínio do
 * Storage está liberado em next.config.ts), `placeholder:<n>` (cartaz do tema, só nos dados de exemplo do protótipo),
 * `blob:` (prévia local) ou null (bloco de cor + inicial; só em rascunho).
 */
export function ImagemCandidato({ titulo, imagemUrl, proporcao = "4/3", className, sizes }: ImagemCandidatoProps) {
  const moldura = cx("relative overflow-hidden bg-tema-superficie", PROPORCOES[proporcao], className);

  if (imagemUrl?.startsWith("placeholder:")) {
    const n = Number(imagemUrl.slice("placeholder:".length)) || 1;
    return (
      <div role="img" aria-label={titulo} className={moldura}>
        <Cartaz n={n} titulo={titulo} />
      </div>
    );
  }

  if (imagemUrl?.startsWith("blob:")) {
    return (
      <div className={moldura}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: não passa pelo next/image */}
        <img src={imagemUrl} alt={titulo} className="size-full object-cover" />
      </div>
    );
  }

  if (imagemUrl?.startsWith("/") || imagemUrl?.startsWith("https://")) {
    return (
      <div className={moldura}>
        <Image src={imagemUrl} alt={titulo} fill sizes={sizes ?? "(min-width: 768px) 33vw, 50vw"} className="object-cover" />
      </div>
    );
  }

  return (
    <div role="img" aria-label={titulo} className={cx(moldura, "flex items-center justify-center bg-tema-primaria")}>
      <span aria-hidden className="text-5xl font-bold text-tema-sobre-primaria">
        {inicial(titulo)}
      </span>
    </div>
  );
}
