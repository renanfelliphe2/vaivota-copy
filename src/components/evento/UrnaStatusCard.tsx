"use client";

import { CalendarClock, CircleCheck, Clock, Flag, Hourglass, Inbox, Lock, PencilRuler, Timer } from "lucide-react";
import type { SaidaVisao, VarianteEntrada } from "@/dominio/visaoEvento";
import type { ChaveTextoEstado } from "@/dominio/tipos";
import { Cartao } from "@/components/ui/Cartao";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo, type SeloProps } from "@/components/ui/Selo";
import { cx } from "@/lib/classes";
import { paraMs } from "@/lib/tempo";
import { textoDoEstado } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

const SELOS: Record<VarianteEntrada, Pick<SeloProps, "variante" | "icone"> & { texto: string }> = {
  NAO_INICIADA: { variante: "info", icone: CalendarClock, texto: "Votação não iniciada" },
  ABERTA: { variante: "sucesso", icone: CircleCheck, texto: "Votação aberta" },
  ENCERRADA: { variante: "neutro", icone: Lock, texto: "Votação encerrada" },
  CONCLUIDO: { variante: "neutro", icone: Flag, texto: "Evento concluído" },
  SEM_CANDIDATOS: { variante: "aviso", icone: Inbox, texto: "Sem opções para votar" },
  INDISPONIVEL: { variante: "aviso", icone: PencilRuler, texto: "Indisponível" },
};

function chaveDoTexto(visao: SaidaVisao): ChaveTextoEstado {
  if (visao.variante === "ABERTA" && visao.seloVoto === "REGISTRADO") return "JA_VOTOU";
  if (visao.variante === "ABERTA" && visao.seloVoto === "REGISTRADO_JURADO") return "JURADO_JA_VOTOU";
  return visao.variante;
}

/**
 * Painel de estado da urna (Etapa 2, CP4). Título e corpo vêm de textoDoEstado (com override do tema);
 * o estado fica em role="status" e a contagem fora dele.
 */
export function UrnaStatusCard({ visao, tituloComoH1 = false }: { visao: SaidaVisao; tituloComoH1?: boolean }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, tema } = ativo;
  const { variante, situacao } = visao;
  const texto = textoDoEstado(chaveDoTexto(visao), tema);
  const selo = SELOS[variante];
  const Titulo = tituloComoH1 ? "h1" : "h2";

  let contagem: { alvoMs: number; rotulo: string; zerado: string } | null = null;
  let aviso: { icone: typeof Clock; texto: string } | null = null;

  if (variante === "NAO_INICIADA") {
    if (situacao === "ABERTURA_PENDENTE") aviso = { icone: Clock, texto: "Aguardando a abertura pela organização." };
    else if (evento.janelaInicio)
      contagem = { alvoMs: paraMs(evento.janelaInicio), rotulo: "Abre em", zerado: "Aguardando a abertura pela organização." };
    else aviso = { icone: CalendarClock, texto: "A data de abertura será anunciada." };
  }
  if (variante === "ABERTA") {
    if (situacao === "TEMPO_ESGOTADO")
      aviso = { icone: Hourglass, texto: "Tempo esgotado. Aguardando a organização encerrar a votação." };
    else if (evento.janelaFim)
      contagem = { alvoMs: paraMs(evento.janelaFim), rotulo: "Encerra em", zerado: "Tempo esgotado." };
  }
  const retaFinal = situacao === "RETA_FINAL";

  return (
    <Cartao className="flex flex-col gap-4">
      <div role="status" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Selo variante={selo.variante} icone={selo.icone} pulsar={variante === "ABERTA" && !visao.seloVoto}>
            {selo.texto}
          </Selo>
          {visao.seloVoto && (
            <Selo variante="sucesso" icone={CircleCheck}>
              Seu voto foi registrado
            </Selo>
          )}
          {visao.agradecer && (
            <Selo variante="sucesso" icone={CircleCheck}>
              Obrigado por votar
            </Selo>
          )}
          {retaFinal && (
            <Selo variante="aviso" icone={Timer}>
              Reta final
            </Selo>
          )}
        </div>
        <Titulo className="text-xl font-bold">{texto.titulo}</Titulo>
        <p className="text-tema-texto-suave">{texto.corpo}</p>
        {aviso && (
          <p className="flex items-center gap-2 text-sm font-medium">
            <aviso.icone aria-hidden className="size-4 shrink-0 text-tema-primaria-texto" />
            {aviso.texto}
          </p>
        )}
      </div>
      {contagem && (
        <p
          className={cx(
            "flex flex-wrap items-baseline gap-2 rounded-xl border bg-tema-fundo px-4 py-3",
            retaFinal ? "border-2 border-tema-aviso" : "border-tema-borda",
          )}
        >
          <span className="text-sm text-tema-texto-suave">{contagem.rotulo}</span>
          <ContagemRegressiva
            alvoMs={contagem.alvoMs}
            rotulo={contagem.rotulo}
            textoZerado={contagem.zerado}
            className={cx("text-2xl", retaFinal && "text-tema-aviso")}
          />
        </p>
      )}
    </Cartao>
  );
}
