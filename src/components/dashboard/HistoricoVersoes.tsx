import type { VersaoResumo } from "@/dominio/painel";
import type { MotivoResultado } from "@/dominio/tipos";
import { formatarDataHora, paraMs } from "@/lib/tempo";

export const ROTULO_MOTIVO: Record<MotivoResultado, string> = {
  ENCERRAMENTO: "Encerramento",
  DESQUALIFICACAO: "Desqualificação",
  CORRECAO: "Correção",
};

// Etapa 7 (D19): a versão 2 por desqualificação não apaga a 1.
export function HistoricoVersoes({ versoes, fuso }: { versoes: VersaoResumo[]; fuso: string }) {
  return (
    <details className="rounded-xl border border-tema-borda bg-tema-fundo p-3 text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">Histórico de versões ({versoes.length})</summary>
      <ol className="mt-2 flex flex-col gap-1">
        {versoes.map((v) => (
          <li key={v.versao}>
            Versão {v.versao} · {ROTULO_MOTIVO[v.motivo]} · {formatarDataHora(paraMs(v.calculadoEm), fuso)}
          </li>
        ))}
      </ol>
    </details>
  );
}
