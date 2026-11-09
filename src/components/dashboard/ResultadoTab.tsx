"use client";

import { Eye, FileText, Monitor, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { BarChart } from "@/components/charts/BarChart";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { Selo } from "@/components/ui/Selo";
import { arquivosDisponiveis, MOTIVO_SEM_RESULTADO } from "@/dominio/exportacao";
import { visaoDaCategoria, type ResultadoVisao } from "@/dominio/painel";
import { casasDaPontuacao } from "@/dominio/resultado";
import type { FaseConfig } from "@/dominio/travas";
import type { ConfigApresentacao, Grupo } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { formatarDecimal, formatarNumero } from "@/lib/formatar";
import { MODULOS_FESTIVAL } from "@/lib/modulos";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { mostrarResultado } from "@/store/acoesDashboard";
import { useUi } from "@/store/seletores/dev";
import { CategoriasCards } from "./CategoriasCards";
import { ClassificacaoTable, ROTULO_GRUPO_PAINEL } from "./ClassificacaoTable";
import { ExportPanel } from "./ExportPanel";
import { ForaDaDisputa } from "./ForaDaDisputa";
import { HistoricoVersoes, ROTULO_MOTIVO } from "./HistoricoVersoes";
import { PainelEmpates } from "./PainelEmpates";
import { useTitulos } from "./useTitulos";
import { VotosJuriTable } from "./VotosJuriTable";
import { VotosPorMinuto } from "./VotosPorMinuto";

// Etapa 7 (5.6, D7, C17): o aviso de tela espelhada vem primeiro, ao lado de "Mostrar resultado". Antes do
// clique, nenhum número nem nome; exportação e relatório não dependem dele. Nova versão volta a ocultar.

const CRITERIO = { JURI: "maior votação do júri", PUBLICO: "maior votação do público" } as const;

export function chaveResultado(eventoId: string, versao: number): string {
  return `${eventoId}:${versao}`;
}

function Atalhos({ base }: { base: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODULOS_FESTIVAL && (
        <Botao href={`${base}/apresentar`} variante="contorno" tamanho="pequeno" icone={<Monitor aria-hidden className="size-4" />}>
          Abrir apresentação
        </Botao>
      )}
      <Botao href={`${base}/relatorio`} variante="contorno" tamanho="pequeno" icone={<FileText aria-hidden className="size-4" />}>
        Ver relatório
      </Botao>
    </div>
  );
}

export function ResultadoTab({
  visao,
  fase,
  fuso,
  base,
  config,
  rotuloCandidato,
  modulos,
  aoExportar,
}: {
  visao: ResultadoVisao | null;
  fase: FaseConfig;
  fuso: string;
  base: string;
  config: ConfigApresentacao;
  rotuloCandidato: string;
  modulos: { juri: boolean; infantil: boolean };
  aoExportar: () => void;
}) {
  const ui = useUi();
  const titulo = useTitulos();
  // Evento com categorias (09/11/2026): classificação, empates e vencedores são por categoria; escolhe-se qual ver.
  const porCategoria = visao?.dados.porCategoria ?? [];
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<string | null>(null);
  const categoriaId = porCategoria.some((c) => c.categoriaId === categoriaEscolhida) ? categoriaEscolhida : (porCategoria[0]?.categoriaId ?? null);
  const escopo = visao && categoriaId ? (visaoDaCategoria(visao, categoriaId) ?? visao) : visao;
  const exportacao = (
    <ExportPanel eventoId={config.eventoId} disponibilidade={arquivosDisponiveis(fase, visao !== null, modulos)} aoExportar={aoExportar} />
  );

  if (!visao || !escopo) {
    return (
      <div className="flex flex-col gap-6">
        <Alerta variante="informacao" titulo={MOTIVO_SEM_RESULTADO}>
          O resultado é calculado no encerramento da urna. Esta combinação só aparece se o estado do evento foi alterado fora do fluxo normal.
        </Alerta>
        {exportacao}
      </div>
    );
  }

  const chave = chaveResultado(visao.eventoId, visao.versao);
  const visivel = ui.dashboard.resultadoVisivel === chave;
  const grupos: Grupo[] = visao.dados.categorias.map((c) => c.grupo);
  const casas = casasDaPontuacao(escopo.dados.ranking);
  const { derivados } = escopo;
  const todosSemVotos = grupos.every((g) => escopo.dados.pesosEfetivos[g] === 0);
  const nomeCategoria = porCategoria.find((c) => c.categoriaId === categoriaId)?.nome ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Cartao className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-start gap-2 text-sm font-semibold text-tema-aviso">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          Resultado: não exibir em tela espelhada antes da revelação.
        </p>
        {!visivel && (
          <Botao icone={<Eye aria-hidden className="size-4" />} onClick={() => mostrarResultado(chave)}>
            Mostrar resultado
          </Botao>
        )}
      </Cartao>

      {visivel && (
        <>
          <Cartao className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">Resultado oficial</h2>
              <Selo variante="primaria">Versão {visao.versao}</Selo>
              {fase === "CONCLUIDO" && <Selo>Somente leitura</Selo>}
            </div>
            <p className="text-sm">
              {ROTULO_MOTIVO[visao.motivo]} · calculado em {formatarDataHora(paraMs(visao.calculadoEm), fuso)}
            </p>
            <p className="text-sm">
              Pesos: {grupos.map((g) => `${ROTULO_GRUPO_PAINEL[g]} ${visao.pesos[g]}%`).join(" · ")}. Critério de desempate:{" "}
              {CRITERIO[visao.dados.criterioDesempate]}.
            </p>
            {derivados.criterioEfetivo !== visao.dados.criterioDesempate && (
              <p className="text-sm text-tema-aviso">Critério JURI indisponível: júri desligado. Aplicado PUBLICO.</p>
            )}
          </Cartao>

          {porCategoria.length > 0 && (
            <Cartao className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="font-bold">Categoria</h3>
                <p className="text-sm text-tema-texto-suave">
                  Cada categoria tem a sua classificação e o seu vencedor. Os totais de votos, o período e a série são do evento inteiro.
                </p>
              </div>
              <div role="group" aria-label="Categoria do resultado" className="flex flex-wrap gap-2">
                {porCategoria.map((c) => {
                  const atual = c.categoriaId === categoriaId;
                  return (
                    <button
                      key={c.categoriaId}
                      type="button"
                      aria-pressed={atual}
                      onClick={() => setCategoriaEscolhida(c.categoriaId)}
                      className={cx(
                        "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ring-1",
                        atual ? "bg-tema-primaria text-tema-sobre-primaria ring-tema-primaria" : "ring-tema-borda hover:bg-tema-superficie",
                      )}
                    >
                      {c.nome}
                    </button>
                  );
                })}
              </div>
              {nomeCategoria && <p className="sr-only" aria-live="polite">Mostrando {nomeCategoria}.</p>}
            </Cartao>
          )}

          {(todosSemVotos || derivados.gruposSemBase.length > 0 || derivados.foraDaDisputa.length > 0) && (
            <div className="flex flex-col gap-2">
              {todosSemVotos ? (
                <Alerta variante="aviso">Nenhum grupo recebeu votos: todas as pontuações são 0.</Alerta>
              ) : (
                derivados.gruposSemBase.map((g) => (
                  <Alerta key={g} variante="aviso">
                    Grupo {ROTULO_GRUPO_PAINEL[g]} sem votos: peso redistribuído. Pesos efetivos:{" "}
                    {grupos.map((x) => `${ROTULO_GRUPO_PAINEL[x]} ${formatarDecimal(escopo.dados.pesosEfetivos[x], 2)}%`).join(" · ")}.
                  </Alerta>
                ))
              )}
              {derivados.foraDaDisputa.length > 0 && (
                <Alerta variante="informacao">
                  {derivados.foraDaDisputa.length === 1 ? "1 item fora da disputa" : `${derivados.foraDaDisputa.length} itens fora da disputa`}: os
                  votos ficam nos totais, mas não entram na base de cálculo.
                </Alerta>
              )}
            </div>
          )}

          <Cartao className="flex flex-col gap-6">
            <ClassificacaoTable visao={escopo} titulo={titulo} rotuloCandidato={rotuloCandidato} />
            <ForaDaDisputa visao={escopo} titulo={titulo} />
            <BarChart
              titulo="Pontuação final"
              itens={escopo.dados.ranking.map((r) => ({ rotulo: `${r.posicao}º ${titulo(r.candidatoId)}`, valor: r.pontuacao }))}
              formato={(v) => formatarDecimal(v, casas)}
              alt={escopo.dados.ranking.map((r) => `${titulo(r.candidatoId)}: ${formatarDecimal(r.pontuacao, casas)}`).join("; ")}
            />
          </Cartao>

          <Cartao className="flex flex-col gap-6">
            <PainelEmpates visao={escopo} titulo={titulo} />
            <CategoriasCards visao={escopo} titulo={titulo} config={config} />
          </Cartao>

          <Cartao className="flex flex-col gap-4">
            <VotosPorMinuto serie={visao.serie} modulos={modulos} fuso={fuso} />
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="inline font-semibold">Período: </dt>
                <dd className="inline">
                  {visao.evento.inicio ? formatarDataHora(paraMs(visao.evento.inicio), fuso) : "—"} até{" "}
                  {visao.evento.fim ? formatarDataHora(paraMs(visao.evento.fim), fuso) : "—"}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold">Na disputa: </dt>
                <dd className="inline tabular-nums">{visao.evento.candidatosNaDisputa}</dd>
              </div>
              {grupos.map((g) => (
                <div key={g}>
                  <dt className="inline font-semibold">Votos {ROTULO_GRUPO_PAINEL[g].toLocaleLowerCase("pt-BR")}: </dt>
                  <dd className="inline tabular-nums">{formatarNumero(visao.dados.totais[g])}</dd>
                </div>
              ))}
            </dl>
          </Cartao>

          {grupos.includes("JURI") && (
            <Cartao>
              <VotosJuriTable eventoId={visao.eventoId} versao={visao.versao} titulo={titulo} fuso={fuso} />
            </Cartao>
          )}
        </>
      )}

      <Cartao className="flex flex-col gap-3">
        <HistoricoVersoes versoes={visao.versoes} fuso={fuso} />
        <Atalhos base={base} />
      </Cartao>
      {exportacao}
    </div>
  );
}
