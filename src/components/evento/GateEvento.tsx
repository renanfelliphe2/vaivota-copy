"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SimuladorVotos } from "@/components/dashboard/SimuladorVotos";
import { CabecalhoEvento } from "@/components/nav/CabecalhoEvento";
import { useEventoAtivo, useSlugAtivo } from "@/store/seletores/evento";
import { EventoNaoEncontrado } from "./EventoNaoEncontrado";

/**
 * D14: validade do slug resolvida no cliente (o slug pode ser renomeado na Etapa 6).
 * Etapa 7 (D12, ajuste mínimo do Anexo C): monta o SimuladorVotos uma única vez por evento.
 * 08/10/2026: monta o cabeçalho fixo de todas as telas do evento (ele mesmo some no totem e no palco).
 */
export function GateEvento({ children }: { children: ReactNode }) {
  const slug = useSlugAtivo();
  const ativo = useEventoAtivo();
  const pathname = usePathname();
  if (!ativo) return <EventoNaoEncontrado slug={slug} />;
  // Com as abas sincronizadas (08/10/2026), a aba do telão (palco) não simula votos: senão as duas gerariam ao mesmo tempo.
  const abaDoTelao = pathname === `/e/${ativo.slug}/admin/apresentar/palco`;
  return (
    <>
      {!abaDoTelao && <SimuladorVotos eventoId={ativo.evento.id} />}
      <CabecalhoEvento />
      {children}
    </>
  );
}
