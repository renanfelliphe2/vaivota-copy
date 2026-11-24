"use client";

import { BadgeCheck, CalendarClock, CircleCheck, Clock, Lock } from "lucide-react";
import { resolverFaixaStatus, type SeloFaixa } from "@/dominio/faixaStatus";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo, type SeloProps } from "@/components/ui/Selo";
import { paraMs } from "@/lib/tempo";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useSituacaoEvento } from "@/store/seletores/situacao";

const SELOS: Record<SeloFaixa, Pick<SeloProps, "variante" | "icone"> & { texto: string }> = {
  NAO_INICIADA: { variante: "info", icone: CalendarClock, texto: "Não iniciada" },
  ABERTA: { variante: "sucesso", icone: CircleCheck, texto: "Aberta" },
  VOTADO: { variante: "sucesso", icone: BadgeCheck, texto: "Votado" },
  ENCERRADA: { variante: "neutro", icone: Lock, texto: "Encerrada" },
};

const ZERADO = { "Abre em": "Aguardando a abertura", "Termina em": "Tempo esgotado" } as const;

/**
 * Faixa de status presa no cabeçalho da página do evento. 25/11/2026 (demanda A2): só um selo de estado (Não iniciada, Aberta,
 * Votado, Encerrada; a regra em dominio/faixaStatus.ts) e o tempo. Selo em role="status"; contagem fora dela (D10).
 */
export function StatusUrna() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const sessao = useSessao();
  if (!ativo || !situacao) return null;
  const { evento } = ativo;
  const { selo, contagem } = resolverFaixaStatus({
    situacao,
    // Já votou em todas as categorias da página (sessao.jaVotou do público não conta as do totem).
    votouTudo: sessao.papel === "PUBLICO" && sessao.jaVotou,
    janelaInicioMs: evento.janelaInicio ? paraMs(evento.janelaInicio) : null,
    janelaFimMs: evento.janelaFim ? paraMs(evento.janelaFim) : null,
  });
  const estilo = SELOS[selo];

  return (
    <div className="w-full border-t border-tema-borda/70 bg-tema-superficie/70">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-2 px-4 py-2 text-sm sm:gap-x-4 sm:px-6 sm:py-2.5">
        <div role="status">
          <Selo variante={estilo.variante} icone={estilo.icone} pulsar={selo === "ABERTA"}>
            {estilo.texto}
          </Selo>
        </div>
        {contagem && (
          <span className="flex items-center gap-1.5 rounded-full bg-tema-fundo px-3 py-1 shadow-sm ring-1 ring-tema-borda/80">
            <Clock aria-hidden className="size-4 shrink-0 text-tema-primaria-texto sm:hidden" />
            <span className="hidden text-tema-texto-suave sm:inline">{contagem.rotulo}</span>
            <ContagemRegressiva
              alvoMs={contagem.alvoMs}
              rotulo={contagem.rotulo}
              textoZerado={ZERADO[contagem.rotulo]}
              className={situacao === "RETA_FINAL" ? "text-tema-aviso" : "text-tema-primaria-texto"}
            />
          </span>
        )}
      </div>
    </div>
  );
}
