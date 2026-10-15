"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { Carregando } from "@/components/ui/Carregando";
import { ehRotaInterna } from "@/dominio/acesso";
import { destinoAposAcesso, garantirParticipacao } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";

/**
 * Volta do Google (ST1): a sessão já veio no cookie e o estado do servidor já a traz. Cria a participação (PUBLICO, ou
 * ADMIN se o e-mail foi convidado) e segue para o destino pós-acesso. Sem sessão (consentimento negado), volta à entrada.
 */
export function ContinuarAcesso() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const router = useRouter();
  const de = useSearchParams().get("de");
  const iniciou = useRef(false);
  const eventoId = ativo?.evento.id;
  const slug = ativo?.slug;
  const logado = sessao.logado;

  useEffect(() => {
    if (!eventoId || !slug || iniciou.current) return;
    iniciou.current = true;
    if (!logado) {
      router.replace(`/e/${slug}?acesso=entrar`);
      return;
    }
    void garantirParticipacao(eventoId).then(() => router.replace(destinoAposAcesso(eventoId, ehRotaInterna(de) ? de : undefined)));
  }, [eventoId, slug, logado, de, router]);

  return <Carregando texto="Entrando…" className="justify-center py-12" />;
}
