"use client";

import { CalendarClock, CircleCheck, Clock, Flag, Hourglass, Lock, PencilRuler, Timer } from "lucide-react";
import type { SituacaoEvento } from "@/dominio/situacaoEvento";
import { chaveTextoDaVisao } from "@/dominio/visaoEvento";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo, type SeloProps } from "@/components/ui/Selo";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSituacaoEvento } from "@/store/seletores/situacao";
import { useVisaoEvento } from "@/store/seletores/visao";

const SELOS: Record<SituacaoEvento, Pick<SeloProps, "variante" | "icone"> & { texto: string }> = {
  CONCLUIDO: { variante: "neutro", icone: Flag, texto: "Evento concluído" },
  EM_PREPARACAO: { variante: "aviso", icone: PencilRuler, texto: "Evento em preparação" },
  ENCERRADA: { variante: "neutro", icone: Lock, texto: "Votação encerrada" },
  TEMPO_ESGOTADO: { variante: "aviso", icone: Hourglass, texto: "Tempo esgotado" },
  RETA_FINAL: { variante: "aviso", icone: Timer, texto: "Reta final" },
  ABERTA: { variante: "sucesso", icone: CircleCheck, texto: "Votação aberta" },
  ABERTURA_PENDENTE: { variante: "info", icone: Clock, texto: "Aguardando a abertura" },
  NAO_INICIADA: { variante: "info", icone: CalendarClock, texto: "Votação não iniciada" },
};

/**
 * Faixa de status (Etapa 1, tabela 5.1), presa no cabeçalho da página do evento. Leva também os selos de voto e o
 * texto de estado do tema. Estado em role="status"; contagem fora dela (D10).
 */
export function StatusUrna() {
  const ativo = useEventoAtivo();
  const situacao = useSituacaoEvento();
  const visao = useVisaoEvento();
  if (!ativo || !situacao) return null;
  const { evento } = ativo;
  const selo = SELOS[situacao];
  const fimMs = evento.janelaFim ? paraMs(evento.janelaFim) : null;
  const inicioMs = evento.janelaInicio ? paraMs(evento.janelaInicio) : null;

  let texto: string | null = null;
  let contagem: { alvoMs: number; rotulo: string; zerado: string } | null = null;

  switch (situacao) {
    case "TEMPO_ESGOTADO":
      texto = "Aguardando a organização encerrar a votação";
      break;
    case "RETA_FINAL":
    case "ABERTA":
      if (fimMs) contagem = { alvoMs: fimMs, rotulo: "Termina em", zerado: "Tempo esgotado" };
      break;
    case "ABERTURA_PENDENTE":
      texto = "Aguardando a abertura pela organização";
      break;
    case "NAO_INICIADA":
      if (inicioMs) {
        texto = `A votação abre em ${formatarDataHora(inicioMs, evento.fusoHorario)}`;
        contagem = { alvoMs: inicioMs, rotulo: "Abre em", zerado: "Aguardando a abertura pela organização" };
      } else {
        texto = "Data de abertura a definir";
      }
      break;
  }

  // Texto do estado com override do tema (o que era o cartão da urna na entrada): título na linha dos selos,
  // corpo numa segunda linha só a partir do sm, para a faixa presa no cabeçalho não crescer no celular.
  const estado = visao ? textoDoEstado(chaveTextoDaVisao(visao), ativo.tema) : null;

  return (
    <div className="w-full border-t border-tema-borda bg-tema-superficie">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-1 px-4 py-2.5 text-center text-sm sm:px-6">
        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4">
          <div role="status" className="flex flex-wrap items-center justify-center gap-2">
            <Selo variante={selo.variante} icone={selo.icone} pulsar={situacao === "ABERTA" && !visao?.seloVoto}>
              {selo.texto}
            </Selo>
            {visao?.seloVoto && (
              <Selo variante="sucesso" icone={CircleCheck}>
                Seu voto foi registrado
              </Selo>
            )}
            {visao?.agradecer && (
              <Selo variante="sucesso" icone={CircleCheck}>
                Obrigado por votar
              </Selo>
            )}
            {estado && <span className="font-semibold">{estado.titulo}</span>}
            {texto && <span>{texto}</span>}
          </div>
          {contagem && (
            <span className="flex items-center gap-1.5">
              <span>{contagem.rotulo}</span>
              <ContagemRegressiva
                alvoMs={contagem.alvoMs}
                rotulo={contagem.rotulo}
                textoZerado={contagem.zerado}
                className={situacao === "RETA_FINAL" ? "text-tema-aviso" : undefined}
              />
            </span>
          )}
        </div>
        {estado && <p className="hidden max-w-3xl text-xs text-tema-texto-suave sm:block">{estado.corpo}</p>}
      </div>
    </div>
  );
}
