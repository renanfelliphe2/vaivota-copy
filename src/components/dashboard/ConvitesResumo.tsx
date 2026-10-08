import Link from "next/link";
import { Cartao } from "@/components/ui/Cartao";
import type { OperacaoDados } from "@/dominio/painel";
import { TituloBloco } from "./KpiCard";

// Etapa 7 (5.5): mesmos números da seção Júri da Etapa 6 (resumirConvites).

export function ConvitesResumo({ convites, base }: { convites: OperacaoDados["convites"]; base: string }) {
  const itens = [
    ["Disponíveis", convites.disponiveis],
    ["Usados", convites.usados],
    ["Revogados", convites.revogados],
    ["Expirados", convites.expirados],
  ] as const;
  return (
    <Cartao className="flex flex-col gap-3">
      <TituloBloco
        acao={
          <Link href={`${base}/configuracao?secao=juri`} className="inline-flex min-h-11 items-center text-sm font-semibold text-tema-primaria-texto underline">
            Gerenciar convites
          </Link>
        }
      >
        Convites
      </TituloBloco>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {itens.map(([rotulo, n]) => (
          <div key={rotulo} className="rounded-xl border border-tema-borda bg-tema-fundo p-3">
            <dt className="text-sm text-tema-texto-suave">{rotulo}</dt>
            <dd className="text-2xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
    </Cartao>
  );
}
