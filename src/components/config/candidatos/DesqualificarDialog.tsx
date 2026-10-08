"use client";

import { DialogoMotivo } from "../DialogoMotivo";

/** Etapa 6 (D14): excepcional, irreversível, motivo obrigatório (≥ 10 caracteres). Texto final [Usuário]. */
export function DesqualificarDialog({
  titulo,
  aberto,
  carregando,
  aoFechar,
  aoConfirmar,
}: {
  titulo: string;
  aberto: boolean;
  carregando: boolean;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  return (
    <DialogoMotivo
      key={`${aberto}:${titulo}`}
      aberto={aberto}
      titulo={`Tirar da disputa: ${titulo}`}
      obrigatorio
      perigo
      consequencia={
        <div className="flex flex-col gap-2">
          <p>Sai da votação na hora e não volta (ação irreversível nesta fase).</p>
          <p>
            Os votos já recebidos permanecem registrados, mas deixam de contar na pontuação. O resultado será refeito em nova
            versão.
          </p>
        </div>
      }
      rotuloConfirmar="Tirar da disputa"
      carregando={carregando}
      aoFechar={aoFechar}
      aoConfirmar={aoConfirmar}
    />
  );
}
