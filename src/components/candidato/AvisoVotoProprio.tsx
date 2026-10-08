import { UserRound } from "lucide-react";
import { Selo } from "@/components/ui/Selo";

/** Etapa 4 (D6): selo e dica de voto próprio, no cartão e no detalhe. */
export function AvisoVotoProprio({ dicaId }: { dicaId: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Selo variante="info" icone={UserRound}>
        Você faz parte da equipe
      </Selo>
      <p id={dicaId} className="text-sm text-tema-texto-suave">
        Quem faz parte da equipe não vota na própria candidatura.
      </p>
    </div>
  );
}
