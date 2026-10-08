"use client";

import { Hourglass, Timer } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { CANDIDATOS_POR_PAGINA, DURACOES } from "@/dominio/apresentacao/duracoes";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import { formatarNumero } from "@/lib/formatar";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { usePaginaRotativa } from "../hooks";
import { CartaoCandidatoPalco, QrPlaca } from "../Pecas";

// Etapa 8 (5.7, 5.9): cenas das fases fora da revelação. Só desenham o que recebem.

export function Cabecalho({ nome, logoUrl, rotulo }: { nome: string; logoUrl: string | null; rotulo?: string }) {
  return (
    <header className="flex items-center justify-between gap-8">
      <div className="[&_span]:text-[56px] [&_img]:h-28">
        <LogoEvento nome={nome} logoUrl={logoUrl} className="h-28" />
      </div>
      {rotulo && <p className="text-[40px] font-semibold text-tema-texto-suave">{rotulo}</p>}
    </header>
  );
}

function Grade({ candidatos, votos }: { candidatos: CandidatoPalco[]; votos?: Map<string, number> | null }) {
  const paginas = Math.max(1, Math.ceil(candidatos.length / CANDIDATOS_POR_PAGINA));
  const pagina = usePaginaRotativa(paginas, DURACOES.paginaCandidatos);
  const visiveis = candidatos.slice(pagina * CANDIDATOS_POR_PAGINA, (pagina + 1) * CANDIDATOS_POR_PAGINA);
  return (
    <div className="flex flex-col gap-4">
      <div key={pagina} className="palco-entrada grid grid-cols-4 gap-6">
        {visiveis.map((c) => (
          <CartaoCandidatoPalco key={c.id} candidato={c} votos={votos ? (votos.get(c.id) ?? 0) : undefined} />
        ))}
      </div>
      {paginas > 1 && (
        <p className="text-right text-[36px] text-tema-texto-suave">
          Página {pagina + 1} de {paginas}
        </p>
      )}
    </div>
  );
}

export function CenaPreVotacao({
  nome,
  logoUrl,
  candidatos,
  chamada,
  contagem,
}: {
  nome: string;
  logoUrl: string | null;
  candidatos: CandidatoPalco[];
  /** "Em breve", "Aguardando a abertura…" ou "Data de abertura a definir". */
  chamada: string;
  contagem: ReactNode | null;
}) {
  return (
    <div className="flex h-full flex-col gap-10 p-20">
      <Cabecalho nome={nome} logoUrl={logoUrl} />
      <div className="flex items-end justify-between gap-10">
        <p className="text-[72px] font-black leading-tight">{chamada}</p>
        {contagem && (
          <div className="text-right">
            <p className="text-[40px] text-tema-texto-suave">{TEXTOS_PALCO.comecaEm}</p>
            <div className="text-[80px] font-bold tabular-nums">{contagem}</div>
          </div>
        )}
      </div>
      <Grade candidatos={candidatos} />
    </div>
  );
}

export type SubestadoAoVivo = "ABERTURA" | "RETA_FINAL" | "TEMPO_ESGOTADO" | null;

export function CenaAoVivo({
  nome,
  logoUrl,
  candidatos,
  urlQr,
  contagem,
  totalGeral,
  parcial,
  subestado,
  encerrada = false,
}: {
  nome: string;
  logoUrl: string | null;
  candidatos: CandidatoPalco[];
  urlQr: string;
  contagem: ReactNode | null;
  totalGeral: number | null;
  parcial: { candidatoId: string; votos: number }[] | null;
  subestado: SubestadoAoVivo;
  /** 08/10/2026: votação encerrada na própria tela dos candidatos: sem QR nem temporizador; o aviso fica no lugar do QR. */
  encerrada?: boolean;
}) {
  const votos = parcial ? new Map(parcial.map((p) => [p.candidatoId, p.votos])) : null;
  if (encerrada)
    return (
      <div className="grid h-full grid-cols-[1fr_520px] gap-12 p-20">
        <div className="flex min-w-0 flex-col gap-8">
          <Cabecalho nome={nome} logoUrl={logoUrl} />
          <Grade candidatos={candidatos} votos={votos} />
        </div>
        <aside className="flex flex-col items-center justify-center gap-8 text-center">
          <p className="palco-entrada rounded-[48px] border-8 border-tema-primaria px-10 py-16 text-[88px] font-black leading-tight text-tema-primaria-texto">
            {TEXTOS_PALCO.votacaoEncerrada}
          </p>
          {totalGeral !== null && (
            <p className="text-[40px]">
              <span className="text-[72px] font-black tabular-nums">{formatarNumero(totalGeral)}</span> {TEXTOS_PALCO.totalVotos}
            </p>
          )}
        </aside>
      </div>
    );
  return (
    <div className="grid h-full grid-cols-[1fr_520px] gap-12 p-20">
      <div className="flex min-w-0 flex-col gap-8">
        <Cabecalho nome={nome} logoUrl={logoUrl} />
        {subestado === "ABERTURA" && <p className="palco-entrada text-[72px] font-black text-tema-primaria-texto">{TEXTOS_PALCO.votacaoComecou}</p>}
        {subestado === "TEMPO_ESGOTADO" && (
          <div className="flex items-center gap-4 text-[56px] font-bold text-tema-aviso">
            <Hourglass aria-hidden className="size-14" />
            <span>
              {TEXTOS_PALCO.tempoEsgotado}. {TEXTOS_PALCO.aguardandoEncerramento}
            </span>
          </div>
        )}
        <Grade candidatos={candidatos} votos={votos} />
      </div>
      <aside className="flex flex-col items-center justify-between gap-8">
        <QrPlaca url={urlQr} />
        <div className="flex flex-col items-center gap-2 text-center">
          {subestado === "RETA_FINAL" && (
            <p className="inline-flex items-center gap-3 rounded-full border-4 border-tema-aviso px-6 py-2 text-[40px] font-bold text-tema-aviso">
              <Timer aria-hidden className="size-10" /> {TEXTOS_PALCO.retaFinal}
            </p>
          )}
          {subestado !== "TEMPO_ESGOTADO" &&
            (contagem ? (
              <div className={subestado === "RETA_FINAL" ? "text-[96px] font-black tabular-nums" : "text-[72px] font-bold tabular-nums"}>{contagem}</div>
            ) : (
              <p className="text-[48px] font-bold">{TEXTOS_PALCO.votacaoAberta}</p>
            ))}
          {totalGeral !== null && (
            <p className="text-[40px]">
              <span className="text-[72px] font-black tabular-nums">{formatarNumero(totalGeral)}</span> {TEXTOS_PALCO.totalVotos}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

export function CenaMensagem({ nome, logoUrl, texto }: { nome: string; logoUrl: string | null; texto: string }) {
  return (
    <div className="flex h-full flex-col gap-10 p-20">
      <Cabecalho nome={nome} logoUrl={logoUrl} />
      <div className="flex flex-1 items-center justify-center">
        <p className="palco-entrada text-center text-[120px] font-black leading-tight">{texto}</p>
      </div>
    </div>
  );
}

/**
 * Tela inicial da revelação (08/10/2026; substitui a tela só com "Votação encerrada"): os candidatos, sem QR nem
 * temporizador, com o aviso no lugar do QR. Ao entrar, o aviso aparece grande no meio da tela por alguns segundos.
 * Fica parada até alguém avançar.
 */
export function CenaEncerrada({ nome, logoUrl, candidatos }: { nome: string; logoUrl: string | null; candidatos: CandidatoPalco[] }) {
  const [aviso, setAviso] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setAviso(false), DURACOES.avisoEncerrada);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative h-full">
      <CenaAoVivo nome={nome} logoUrl={logoUrl} candidatos={candidatos} urlQr="" contagem={null} totalGeral={null} parcial={null} subestado={null} encerrada />
      {aviso && (
        <div className="absolute inset-0 flex items-center justify-center bg-tema-fundo/80">
          <p className="palco-entrada rounded-[64px] bg-tema-primaria px-24 py-16 text-[160px] font-black leading-none text-tema-sobre-primaria shadow-2xl">
            {TEXTOS_PALCO.votacaoEncerrada}
          </p>
        </div>
      )}
    </div>
  );
}
