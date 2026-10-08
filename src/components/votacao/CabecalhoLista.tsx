"use client";

import { Hourglass, Timer } from "lucide-react";
import type { EstadoVotar } from "@/dominio/estadoVotar";
import { Alerta } from "@/components/ui/Alerta";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo } from "@/components/ui/Selo";
import { paraMs } from "@/lib/tempo";
import { textoContador } from "@/lib/textosEstado";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Cabeçalho da lista (Etapa 4, seção 5.6): h1, instrução, contador de candidatos e tempo. */
export function CabecalhoLista({ estado, total }: { estado: EstadoVotar; total: number }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const { evento, tema } = ativo;
  const situacao = estado.visao.situacao;
  const mostrarTempo = (situacao === "ABERTA" || situacao === "RETA_FINAL") && evento.janelaFim !== null;

  return (
    <header className="flex flex-col gap-3">
      <h1 tabIndex={-1} className="text-3xl font-bold tracking-tight sm:text-4xl">
        {tema.rotuloCandidatos}
      </h1>
      <p className="text-tema-texto-suave">Use &quot;Ver detalhes&quot; para conhecer melhor antes de decidir.</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <p className="font-semibold text-tema-primaria-texto">{textoContador(total, tema)}</p>
        {mostrarTempo && evento.janelaFim && (
          <p className="flex items-center gap-1.5">
            <span className="text-tema-texto-suave">Encerra em</span>
            <ContagemRegressiva alvoMs={paraMs(evento.janelaFim)} rotulo="Encerra em" textoZerado="Tempo esgotado." />
          </p>
        )}
        {situacao === "RETA_FINAL" && (
          <Selo variante="aviso" icone={Timer}>
            Reta final
          </Selo>
        )}
      </div>
      {estado.avisoTempoEsgotado && (
        <Alerta variante="aviso">
          <span className="inline-flex items-center gap-1.5">
            <Hourglass aria-hidden className="size-4" />
            Tempo esgotado. Aguardando a organização encerrar a votação.
          </span>
        </Alerta>
      )}
    </header>
  );
}
