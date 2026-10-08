import { Ban, CalendarClock, Clock, Flag, Link2Off, Lock, CirclePause, PowerOff, Sparkles, type LucideIcon } from "lucide-react";
import type { SituacaoTotem } from "@/dominio/totem";
import { textoBloqueioTotem } from "@/lib/textosTotem";

// Totem: telas neutras de bloqueio (§6). Nenhuma ação para a criança; a saída é pelo PIN.

const ICONES: Record<Exclude<SituacaoTotem, "VOTANDO">, LucideIcon> = {
  NAO_PAREADO: Link2Off,
  DISPOSITIVO_REVOGADO: Ban,
  DISPOSITIVO_PAUSADO: CirclePause,
  MODULO_DESLIGADO: PowerOff,
  EVENTO_INDISPONIVEL: CalendarClock,
  EVENTO_CONCLUIDO: Flag,
  URNA_NAO_INICIADA: Clock,
  URNA_ENCERRADA: Lock,
  SEM_CANDIDATOS: Sparkles,
};

export function TotemBloqueado({ situacao, rotuloCandidatos }: { situacao: Exclude<SituacaoTotem, "VOTANDO">; rotuloCandidatos: string }) {
  const { titulo, corpo } = textoBloqueioTotem(situacao, rotuloCandidatos);
  const Icone = ICONES[situacao];
  return (
    <div role="status" className="palco-entrada flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
      <span className="flex size-28 items-center justify-center rounded-full bg-tema-superficie text-tema-primaria-texto">
        <Icone aria-hidden className="size-14" strokeWidth={1.75} />
      </span>
      <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{titulo}</h1>
      <p className="max-w-2xl text-xl text-tema-texto-suave sm:text-2xl">{corpo}</p>
    </div>
  );
}
