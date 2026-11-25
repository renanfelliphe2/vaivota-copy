"use client";

import { BadgeCheck, CalendarClock, CircleCheck, Clock, Lock, Vote } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMovimentoReduzido } from "@/components/apresentacao/hooks";
import { resolverFaixaStatus, type SeloFaixa } from "@/dominio/faixaStatus";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo, type SeloProps } from "@/components/ui/Selo";
import { paraMs } from "@/lib/tempo";
import { useEventoAtivo, useVotosRegistrados } from "@/store/seletores/evento";
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
 * 25/11/2026: Status · Tempo · Votos registrados (todas as categorias, online e totem), atualizados a cada consulta ao servidor.
 */
export function StatusUrna() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const sessao = useSessao();
  const votos = useVotosRegistrados(ativo?.evento.id ?? null);
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
        {/* Antes da abertura não há o que contar. */}
        {votos !== null && selo !== "NAO_INICIADA" && <ChipVotos total={votos} />}
      </div>
    </div>
  );
}

const NUMERO = new Intl.NumberFormat("pt-BR");

/**
 * Votos registrados. Quando chega um número novo, ele sobe do anterior até o novo (sem animação com "reduzir movimento").
 * Fora de região viva: o número muda sozinho e anunciar cada mudança atrapalharia o leitor de tela.
 */
function ChipVotos({ total }: { total: number }) {
  const exibido = useNumeroQueSobe(total);
  const rotulo = total === 1 ? "voto" : "votos";
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-tema-fundo px-3 py-1 shadow-sm ring-1 ring-tema-borda/80">
      <span className="sr-only">{`${NUMERO.format(total)} ${rotulo} registrados`}</span>
      <Vote aria-hidden className="size-4 shrink-0 text-tema-primaria-texto" />
      <span aria-hidden className="font-semibold tabular-nums text-tema-primaria-texto">
        {NUMERO.format(exibido)}
      </span>
      <span aria-hidden className="text-tema-texto-suave">
        {rotulo}
        <span className="hidden sm:inline"> registrados</span>
      </span>
    </span>
  );
}

function useNumeroQueSobe(alvo: number, duracaoMs = 900): number {
  const reduzido = useMovimentoReduzido();
  const [valor, setValor] = useState(alvo);
  // Escrito só no efeito: de onde a próxima animação parte.
  const atual = useRef(alvo);
  useEffect(() => {
    const de = atual.current;
    // Sem animação, quem mostra o número é o retorno (abaixo), sem estado.
    if (reduzido || de === alvo) {
      atual.current = alvo;
      return;
    }
    let quadro = 0;
    let inicio: number | null = null;
    const passo = (t: number) => {
      inicio ??= t;
      const f = Math.min(1, (t - inicio) / duracaoMs);
      const v = Math.round(de + (alvo - de) * (1 - (1 - f) ** 3));
      atual.current = v;
      setValor(v);
      if (f < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracaoMs, reduzido]);
  return reduzido ? alvo : valor;
}
