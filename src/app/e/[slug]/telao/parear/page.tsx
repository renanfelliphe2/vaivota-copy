import { TelaPareamentoTelao } from "@/components/telao/TelaPareamentoTelao";
import { metadadosDaTela } from "@/server/metadados";

/** Pareamento do telão (25/11/2026), como o do totem: o código mostrado no palco do admin; o servidor grava o token num cookie HttpOnly. */
export default function PaginaPareamentoTelao() {
  return (
    <div className="min-h-dvh bg-tema-fundo text-tema-texto font-tema">
      <TelaPareamentoTelao />
    </div>
  );
}

export const generateMetadata = metadadosDaTela("Abrir o telão");
