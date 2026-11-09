"use client";

import { Expand, Heart, Shrink } from "lucide-react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState, type CSSProperties } from "react";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { rotaCategoria } from "@/dominio/categorias";
import { tokensCinema } from "@/lib/tema";
import { useOrigem } from "@/lib/useOrigem";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * QR Code de uma categoria em tela cheia (09/11/2026, organograma do Festival: "um QR Code que direcione diretamente para a
 * página de votação, exibido no telão"). Pública, sem login: o QR só leva à página pública da categoria, e o computador do
 * telão não precisa de conta. Sala escura do estilo cinema, o nome da categoria bem grande e o QR numa placa branca (módulos
 * pretos: a leitura mais segura). Os parceiros no pé, como em todas as páginas do evento.
 */
export function TelaQrCategoria() {
  const params = useParams<{ categoria?: string | string[] }>();
  const slugCategoria = typeof params?.categoria === "string" ? decodeURIComponent(params.categoria) : "";
  const ativo = useEventoAtivo();
  const origem = useOrigem();
  const [telaCheia, setTelaCheia] = useState(false);

  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", aoMudar);
    return () => document.removeEventListener("fullscreenchange", aoMudar);
  }, []);

  if (!ativo) return null;
  const { slug, evento, tema, parceiros } = ativo;
  const categoria = ativo.categorias.find((c) => c.slug === slugCategoria);
  const nome = tema.nomeExibicao ?? evento.nome;

  if (!categoria)
    return (
      <main id="conteudo" className="flex min-h-dvh items-center justify-center p-8 text-center">
        <p className="text-xl">Categoria não encontrada.</p>
      </main>
    );

  const url = origem ? `${origem}${rotaCategoria(slug, categoria.slug)}` : "";

  function alternarTelaCheia() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <main
      id="conteudo"
      style={tokensCinema(tema) as CSSProperties}
      className="cine-sala relative isolate flex min-h-dvh flex-col overflow-hidden text-white [--tema-foco:#ffffff]"
    >
      <div aria-hidden className="cine-feixe absolute inset-0 -z-10" />
      <div aria-hidden className="cine-grao absolute inset-0 -z-10" />
      <span aria-hidden className="cine-furos-h block h-[1.125rem] w-full bg-cine-pelicula" />

      <button
        type="button"
        onClick={alternarTelaCheia}
        className="absolute right-4 top-8 z-10 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white/90 ring-1 ring-white/20 transition hover:bg-white/20"
      >
        {telaCheia ? <Shrink aria-hidden className="size-4" /> : <Expand aria-hidden className="size-4" />}
        {telaCheia ? "Sair da tela cheia" : "Tela cheia"}
      </button>

      <div className="mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-6 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 md:px-12">
        <div className="flex min-w-0 flex-col items-start gap-5">
          {tema.logoUrl ? (
            <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-16 md:h-24" prioridade />
          ) : (
            <p className="text-lg font-bold uppercase tracking-[0.2em] text-cine-primaria-clara md:text-2xl">{nome}</p>
          )}
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-base font-bold uppercase tracking-[0.18em] text-cine-secundaria-clara ring-1 ring-white/15 md:text-xl">
            <Heart aria-hidden className="size-5 md:size-6" fill="currentColor" />
            Vote no seu favorito
          </p>
          <h1 className="font-cine text-[clamp(2.75rem,7vw,7rem)] font-bold leading-[0.98] tracking-tight text-balance">{categoria.nome}</h1>
          {categoria.premio && <p className="text-2xl font-semibold text-white/85 md:text-4xl">{categoria.premio}</p>}
          <p className="max-w-xl text-lg text-white/75 md:text-2xl">Aponte a câmera do celular para o código e vote.</p>
        </div>

        <figure className="flex flex-col items-center gap-4 justify-self-center">
          <div className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-black/50 md:p-7">
            {url ? (
              <QRCodeSVG
                value={url}
                level="M"
                marginSize={2}
                bgColor="#ffffff"
                fgColor="#000000"
                role="img"
                aria-label={`QR Code para votar em ${categoria.nome}`}
                className="size-[min(70vw,24rem)] md:size-[min(44vw,62vh,34rem)]"
              />
            ) : (
              <div className="size-[min(70vw,24rem)] md:size-[min(44vw,62vh,34rem)]" />
            )}
          </div>
          <figcaption className="max-w-[34rem] break-all text-center text-base font-semibold text-white/85 md:text-xl">
            {url.replace(/^https?:\/\//, "")}
          </figcaption>
        </figure>
      </div>

      {parceiros.length > 0 && (
        <footer aria-label="Parceiros" className="bg-white px-6 py-5 md:px-12">
          <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {parceiros.map((p) => (
              <li key={p.id} className="flex h-14 items-center">
                <LogoParceiro parceiro={p} className="max-h-12 max-w-36" classeNome="text-lg font-bold text-neutral-700" />
              </li>
            ))}
          </ul>
        </footer>
      )}
    </main>
  );
}
