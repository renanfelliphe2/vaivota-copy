"use client";

import { useEffect, useRef } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { CANDIDATOS_POR_PAGINA, DURACOES } from "@/dominio/apresentacao/duracoes";
import type { CandidatoPalco, EstadoTrailer } from "@/dominio/apresentacao/tipos";
import { usePaginaRotativa } from "../hooks";
import { CartaoCandidatoPalco } from "../Pecas";

// Etapa 8 (D11, 5.8): trailer único do evento por link/embed, com fallback gerado em CSS. Nunca armazena
// vídeo. O iframe começa sem mudo (o clique em Apresentar liberou o áudio, C19).

function TrailerGerado({ nome, logoUrl, data, candidatos }: { nome: string; logoUrl: string | null; data: string; candidatos: CandidatoPalco[] }) {
  const paginas = Math.ceil(candidatos.length / CANDIDATOS_POR_PAGINA);
  const pagina = usePaginaRotativa(paginas, DURACOES.trailerGerado / Math.max(1, paginas + 1));
  const visiveis = candidatos.slice(pagina * CANDIDATOS_POR_PAGINA, (pagina + 1) * CANDIDATOS_POR_PAGINA);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-12 bg-tema-primaria p-20 text-tema-sobre-primaria">
      <div className="palco-entrada flex flex-col items-center gap-8 text-center">
        <div className="rounded-3xl bg-tema-fundo px-10 py-6 text-tema-texto [&_span]:text-[64px] [&_img]:h-32">
          <LogoEvento nome={nome} logoUrl={logoUrl} className="h-32" />
        </div>
        <p className="text-[96px] font-black leading-tight">{nome}</p>
        <p className="text-[48px] font-semibold">{data}</p>
      </div>
      {visiveis.length > 0 && (
        <div key={pagina} className="palco-entrada grid w-full grid-cols-4 gap-6 text-tema-texto">
          {visiveis.map((c) => (
            <CartaoCandidatoPalco key={c.id} candidato={c} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CenaTrailer({
  estado,
  embedUrl,
  forcarGerado,
  nome,
  logoUrl,
  data,
  candidatos,
  aoPronto,
  aoFalhar,
}: {
  estado: EstadoTrailer;
  /** null = sem link válido (vai direto ao gerado). */
  embedUrl: string | null;
  /** usarTrailerGerado ou dev.simularTrailerFalha (o iframe nem é montado). */
  forcarGerado: boolean;
  nome: string;
  logoUrl: string | null;
  data: string;
  candidatos: CandidatoPalco[];
  aoPronto: () => void;
  aoFalhar: () => void;
}) {
  const falhar = useRef(aoFalhar);
  useEffect(() => {
    falhar.current = aoFalhar;
  });
  const usarLink = Boolean(embedUrl) && !forcarGerado;

  useEffect(() => {
    if (estado !== "CARREGANDO") return;
    const timer = setTimeout(() => falhar.current(), usarLink ? DURACOES.limiteCargaTrailer : 0);
    return () => clearTimeout(timer);
  }, [estado, usarLink]);

  if (usarLink && estado !== "GERADO") {
    return (
      <div className="relative h-full bg-tema-texto">
        <iframe
          src={embedUrl!}
          title={`Trailer: ${nome}`}
          allow="autoplay; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
          onLoad={aoPronto}
        />
      </div>
    );
  }
  return <TrailerGerado nome={nome} logoUrl={logoUrl} data={data} candidatos={candidatos} />;
}
