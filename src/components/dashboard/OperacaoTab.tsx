"use client";

import { Cartao } from "@/components/ui/Cartao";
import { arquivosDisponiveis } from "@/dominio/exportacao";
import type { OperacaoDados } from "@/dominio/painel";
import { minusculas } from "@/lib/rotulos";
import { AuditoriaPainel } from "./AuditoriaPainel";
import { ConvitesResumo } from "./ConvitesResumo";
import { EstadoUrnaCard } from "./EstadoUrnaCard";
import { ExportPanel } from "./ExportPanel";
import { JuradosCard } from "./JuradosCard";
import { ParcialPorCandidato } from "./ParcialPorCandidato";
import { ParticipantesCard } from "./ParticipantesCard";
import { TotaisCards } from "./TotaisCards";
import { TotensTable } from "./TotensTable";
import { useTitulos } from "./useTitulos";
import { VotosPorMinuto } from "./VotosPorMinuto";

// Etapa 7 (5.5): blocos do mais importante ao mais detalhado. Módulo desligado some do painel.

export function OperacaoTab({
  dados,
  fuso,
  base,
  rotuloCandidatos,
  aoExportar,
}: {
  dados: OperacaoDados;
  fuso: string;
  base: string;
  rotuloCandidatos: string;
  aoExportar: () => void;
}) {
  const titulo = useTitulos();
  const exportacao = <ExportPanel eventoId={dados.eventoId} disponibilidade={arquivosDisponiveis(dados.fase, dados.resultadoDisponivel, dados.modulos)} aoExportar={aoExportar} />;

  // RASCUNHO: só o estado vazio (o aviso vem do BannerPainel) e a exportação da auditoria (C11).
  if (dados.fase === "RASCUNHO") return exportacao;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <EstadoUrnaCard dados={dados} fuso={fuso} base={base} />
        <ParticipantesCard dados={dados} />
      </div>
      <TotaisCards dados={dados} />
      {dados.fase === "URNA_ABERTA" && (
        <ParcialPorCandidato parcial={dados.parcial} rotuloCandidatos={minusculas(rotuloCandidatos)} titulo={titulo} />
      )}
      <Cartao>
        <VotosPorMinuto serie={dados.serie} modulos={dados.modulos} fuso={fuso} />
      </Cartao>
      {dados.modulos.juri && (
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <JuradosCard dados={dados} />
          <ConvitesResumo convites={dados.convites} base={base} />
        </div>
      )}
      {dados.modulos.infantil && <TotensTable totens={dados.totens} fuso={fuso} />}
      <AuditoriaPainel dados={dados} fuso={fuso} />
      {exportacao}
    </div>
  );
}
