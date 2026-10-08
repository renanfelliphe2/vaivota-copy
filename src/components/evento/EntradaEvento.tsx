"use client";

import { useSearchParams } from "next/navigation";
import { ehRotaInterna } from "@/dominio/acesso";
import { useVisaoEvento } from "@/store/seletores/visao";
import { AcessoEvento } from "./AcessoEvento";
import { BannerRascunho } from "./BannerRascunho";
import { EventoHero } from "./EventoHero";
import { UrnaStatusCard } from "./UrnaStatusCard";

/**
 * Entrada do evento /e/[slug] (Etapa 2). Variante e ação só de resolverVisaoEvento; nunca lista
 * candidatos nem mostra resultado. `?de=` vem da guarda (volta de login).
 */
export function EntradaEvento() {
  const visao = useVisaoEvento();
  const de = useSearchParams().get("de");
  if (!visao) return null;
  const deInterno = ehRotaInterna(de) ? de : undefined;

  if (visao.variante === "INDISPONIVEL") {
    // Casca mínima (D2): sem hero.
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <UrnaStatusCard visao={visao} tituloComoH1 />
      </div>
    );
  }

  return (
    <>
      {visao.bannerRascunho && <BannerRascunho />}
      <EventoHero />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <UrnaStatusCard visao={visao} />
        <AcessoEvento visao={visao} de={deInterno} />
      </div>
    </>
  );
}
