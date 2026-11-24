"use client";

import type { CampoCandidato, Candidato } from "@/dominio/tipos";
import type { Travas } from "@/dominio/travas";
import { Dialogo } from "@/components/ui/Dialogo";
import { useFormularioSujo } from "../FormularioSujoProvider";
import { FormCandidato } from "./FormCandidato";

export type PainelCandidatoProps = {
  /** "novo", id existente ou null (fechado). */
  editar: string | null;
  eventoId: string;
  candidato: Candidato | null;
  campos: CampoCandidato[];
  rotuloCandidato: string;
  travas: Travas;
  aoFechar: () => void;
};

/** Etapa 6 (CP4): Dialogo controlado por ?editar=<id|novo>; fechar com alteração pendente pergunta antes. */
export function PainelCandidato({ editar, eventoId, candidato, campos, rotuloCandidato, travas, aoFechar }: PainelCandidatoProps) {
  const { confirmarSaida, marcarSujo } = useFormularioSujo();
  const aberto = editar === "novo" || (editar !== null && candidato !== null);
  const fechar = () => confirmarSaida(aoFechar);

  return (
    <Dialogo
      aberto={aberto}
      aoFechar={fechar}
      titulo={editar === "novo" ? `Adicionar: ${rotuloCandidato}` : `Editar: ${candidato?.titulo ?? ""}`}
      className="sm:max-w-2xl!"
    >
      {aberto && (
        <FormCandidato
          key={editar ?? ""}
          eventoId={eventoId}
          candidato={editar === "novo" ? null : candidato}
          campos={campos}
          travas={travas}
          aoSalvar={aoFechar}
          aoCancelar={() => {
            marcarSujo(false);
            aoFechar();
          }}
        />
      )}
    </Dialogo>
  );
}
