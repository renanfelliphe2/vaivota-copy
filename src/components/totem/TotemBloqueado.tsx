import { Ban, CalendarClock, Clock, Flag, Link2Off, Lock, CirclePause, PowerOff, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SituacaoTotem } from "@/dominio/totem";
import { textoBloqueioTotem } from "@/lib/textosTotem";
import { AvisoTotem } from "./MolduraTotem";

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

export function TotemBloqueado({
  situacao,
  rotuloCandidatos,
  logo,
  children,
}: {
  situacao: Exclude<SituacaoTotem, "VOTANDO">;
  rotuloCandidatos: string;
  logo: ReactNode;
  /** Ação de adulto embaixo da mensagem (só "Parear este aparelho"). */
  children?: ReactNode;
}) {
  const { titulo, corpo } = textoBloqueioTotem(situacao, rotuloCandidatos);
  const Icone = ICONES[situacao];
  return (
    <AvisoTotem logo={logo} icone={<Icone aria-hidden strokeWidth={1.75} />} titulo={titulo} corpo={corpo}>
      {children}
    </AvisoTotem>
  );
}
