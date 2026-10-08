"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Campo";
import { DialogoMotivo } from "../DialogoMotivo";

/** Etapa 6 (seção 5.4): revogar com a opção "Gerar um convite substituto". */
export function RevogarConviteDialog({
  rotulo,
  aberto,
  carregando,
  aoFechar,
  aoConfirmar,
}: {
  rotulo: string | null;
  aberto: boolean;
  carregando: boolean;
  aoFechar: () => void;
  aoConfirmar: (opcoes: { gerarSubstituto: boolean; motivo: string }) => void;
}) {
  const [substituto, setSubstituto] = useState(true);
  return (
    <DialogoMotivo
      key={`${aberto}`}
      aberto={aberto}
      titulo={`Revogar: ${rotulo ?? "convite sem rótulo"}`}
      consequencia="O código deixa de funcionar na hora. Um convite já usado não pode ser revogado."
      rotuloConfirmar="Revogar"
      perigo
      carregando={carregando}
      aoFechar={aoFechar}
      aoConfirmar={(motivo) => aoConfirmar({ gerarSubstituto: substituto, motivo })}
    >
      <Checkbox id="revogar-substituto" rotulo="Gerar um convite substituto" checked={substituto} onChange={(e) => setSubstituto(e.target.checked)} />
    </DialogoMotivo>
  );
}
