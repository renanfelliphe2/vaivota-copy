"use client";

import Link from "next/link";
import { BarChart } from "@/components/charts/BarChart";
import { CategoriasCards } from "@/components/dashboard/CategoriasCards";
import { ClassificacaoTable, ROTULO_GRUPO_PAINEL } from "@/components/dashboard/ClassificacaoTable";
import { ForaDaDisputa } from "@/components/dashboard/ForaDaDisputa";
import { ROTULO_MOTIVO } from "@/components/dashboard/HistoricoVersoes";
import { PainelEmpates } from "@/components/dashboard/PainelEmpates";
import { useTitulos } from "@/components/dashboard/useTitulos";
import { VotosPorMinuto } from "@/components/dashboard/VotosPorMinuto";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Alerta } from "@/components/ui/Alerta";
import { Carregando } from "@/components/ui/Carregando";
import { casasDaPontuacao, gruposDoResultado } from "@/dominio/resultado";
import { formatarDecimal, formatarNumero } from "@/lib/formatar";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { useConsulta } from "@/lib/useConsulta";
import { obterResultado } from "@/servicos/dashboard";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { useVersaoResultado } from "@/store/seletores/resultado";
import { BarraAcoesRelatorio } from "./BarraAcoesRelatorio";
import "./relatorio.print.css";

// Etapa 7 (5.11, D17): relatório imprimível a partir de obterResultado. Sem votos identificados e sem e-mail.

const CRITERIO = { JURI: "maior votação do júri", PUBLICO: "maior votação do público" } as const;

export function RelatorioView() {
  const ativo = useEventoAtivo();
  const agora = useAgora();
  const eventoId = ativo?.evento.id ?? "";
  const versao = useVersaoResultado(eventoId || null);
  const titulo = useTitulos();
  const consulta = useConsulta(() => obterResultado(eventoId), { ativo: Boolean(eventoId), chave: `${eventoId}:${versao}` });
  if (!ativo) return null;
  const { evento, tema, configApresentacao } = ativo;
  const fuso = evento.fusoHorario;
  const base = `/e/${ativo.slug}/admin`;
  const data = (i: string | null) => (i ? formatarDataHora(paraMs(i), fuso) : "—");

  if (!consulta.dados) {
    if (consulta.erro)
      return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-bold">Relatório</h1>
          <Alerta variante="informacao" titulo="Relatório indisponível">
            {consulta.erro.codigo === "RESULTADO_INDISPONIVEL"
              ? "O relatório fica disponível depois do encerramento da urna, com o resultado oficial calculado."
              : consulta.erro.mensagem}
          </Alerta>
          <Link href={base} className="font-semibold text-tema-primaria-texto underline">
            Voltar ao painel
          </Link>
        </div>
      );
    return <Carregando className="mx-auto py-20" />;
  }

  const visao = consulta.dados;
  const grupos = gruposDoResultado(visao.dados);
  const casas = casasDaPontuacao(visao.dados.ranking);
  const nome = tema.nomeExibicao ?? evento.nome;

  return (
    <div className="relatorio mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <BarraAcoesRelatorio eventoId={eventoId} base={base} />

      <section className="relatorio-secao flex flex-col gap-4">
        <LogoEvento nome={nome} logoUrl={tema.logoUrl} />
        <h1 className="text-3xl font-bold">Relatório do resultado · {nome}</h1>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">Período da votação: </dt>
            <dd className="inline">
              {data(visao.evento.inicio)} até {data(visao.evento.fim)}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">Na disputa: </dt>
            <dd className="inline">{visao.evento.candidatosNaDisputa}</dd>
          </div>
          {grupos.map((g) => (
            <div key={g}>
              <dt className="inline font-semibold">Votos {ROTULO_GRUPO_PAINEL[g].toLocaleLowerCase("pt-BR")}: </dt>
              <dd className="inline tabular-nums">{formatarNumero(visao.dados.totais[g])}</dd>
            </div>
          ))}
          <div>
            <dt className="inline font-semibold">Público: </dt>
            <dd className="inline">
              {formatarNumero(visao.participantes.publico.votaram)} de {formatarNumero(visao.participantes.publico.cadastrados)} votaram
            </dd>
          </div>
          {grupos.includes("JURI") && (
            <div>
              <dt className="inline font-semibold">Jurados: </dt>
              <dd className="inline">
                {visao.participantes.jurado.votaram} de {visao.participantes.jurado.cadastrados} votaram
              </dd>
            </div>
          )}
          <div className="sm:col-span-2">
            <dt className="inline font-semibold">Pesos e critério: </dt>
            <dd className="inline">
              {grupos.map((g) => `${ROTULO_GRUPO_PAINEL[g]} ${visao.pesos[g]}%`).join(" · ")}; desempate pela {CRITERIO[visao.derivados.criterioEfetivo]}
            </dd>
          </div>
        </dl>
      </section>

      <section className="relatorio-secao flex flex-col gap-4">
        <h2 className="text-2xl font-bold">Classificação</h2>
        <ClassificacaoTable visao={visao} titulo={titulo} rotuloCandidato={tema.rotuloCandidato} />
        <ForaDaDisputa visao={visao} titulo={titulo} />
        <BarChart
          titulo="Pontuação final"
          itens={visao.dados.ranking.map((r) => ({ rotulo: `${r.posicao}º ${titulo(r.candidatoId)}`, valor: r.pontuacao }))}
          formato={(v) => formatarDecimal(v, casas)}
          alt="Pontuação final de cada item na disputa"
        />
      </section>

      <section className="relatorio-secao flex flex-col gap-6">
        <CategoriasCards visao={visao} titulo={titulo} config={configApresentacao} />
        <PainelEmpates visao={visao} titulo={titulo} />
      </section>

      <section className="relatorio-secao flex flex-col gap-4">
        <VotosPorMinuto serie={visao.serie} modulos={{ juri: grupos.includes("JURI"), infantil: grupos.includes("INFANTIL") }} fuso={fuso} />
      </section>

      <footer className="border-t border-tema-borda pt-4 text-sm text-tema-texto-suave">
        Resultado oficial versão {visao.versao} ({ROTULO_MOTIVO[visao.motivo]}, calculado em {data(visao.calculadoEm)}). Relatório gerado em{" "}
        {formatarDataHora(agora, fuso)}.
      </footer>
    </div>
  );
}
