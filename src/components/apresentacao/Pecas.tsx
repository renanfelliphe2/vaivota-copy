"use client";

import { FlaskConical } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import { cx } from "@/lib/classes";

// Etapa 8 (5.7, 5.9): peças do palco. Texto mínimo de 36 px no canvas (1920×1080 lógicos).

/** Degraus de fonte do título (96 a 48 px), corte em 3 linhas; `inteiro` nunca corta (passo de nome). */
export function TituloCandidato({ titulo, inteiro, className }: { titulo: string; inteiro?: boolean; className?: string }) {
  const tamanho = titulo.length > 90 ? "text-[48px]" : titulo.length > 50 ? "text-[60px]" : titulo.length > 24 ? "text-[76px]" : "text-[96px]";
  return (
    <p className={cx("font-bold leading-tight", tamanho, !inteiro && "line-clamp-3", className)} title={titulo}>
      {titulo}
    </p>
  );
}

export function CartaoCandidatoPalco({ candidato, votos }: { candidato: CandidatoPalco; votos?: number | null }) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-tema-borda bg-tema-superficie p-4">
      <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="16/9" className="rounded-2xl" sizes="440px" />
      <p className="line-clamp-2 text-[36px] font-semibold leading-tight">{candidato.titulo}</p>
      {votos !== undefined && votos !== null && <p className="text-[36px] font-bold tabular-nums text-tema-primaria-texto">{votos} votos</p>}
    </div>
  );
}

/** D17: placa clara fixa, módulos escuros (currentColor), margem de 4 módulos. */
export function QrPlaca({ url }: { url: string }) {
  return (
    <figure className="flex flex-col items-center gap-4">
      <div className="rounded-3xl p-6" style={{ background: "var(--qr-claro)", color: "var(--qr-escuro)" }}>
        <QRCodeSVG value={url} size={360} level="M" marginSize={4} bgColor="transparent" fgColor="currentColor" aria-label="QR Code para votar" role="img" />
      </div>
      <figcaption className="max-w-[640px] break-all text-center text-[36px] font-semibold">{url.replace(/^https?:\/\//, "")}</figcaption>
    </figure>
  );
}

/** D5: o selo ENSAIO é parte do canvas e não pode ser ocultado. */
export function SeloEnsaio() {
  return (
    <div className="absolute right-10 top-10 z-10 inline-flex items-center gap-3 rounded-full border-4 border-tema-aviso bg-tema-fundo px-8 py-3 text-[40px] font-black uppercase tracking-widest text-tema-aviso">
      <FlaskConical aria-hidden className="size-10" /> Ensaio
    </div>
  );
}

/** Nomes até o limite visual, com "+N" (D12). */
export function MaisNomes({ mais }: { mais: number }) {
  if (mais <= 0) return null;
  return <p className="text-[40px] font-semibold text-tema-texto-suave">+{mais}</p>;
}
