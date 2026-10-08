import { CircleDot, CircleStop, Clock, Hourglass } from "lucide-react";
import Link from "next/link";
import { Cartao } from "@/components/ui/Cartao";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Selo } from "@/components/ui/Selo";
import type { OperacaoDados } from "@/dominio/painel";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { TituloBloco } from "./KpiCard";

// Etapa 7 (5.5): estado da urna, tempo restante e janela. Decide pela fase e pela situação do serviço.

export function EstadoUrnaCard({ dados, fuso, base }: { dados: OperacaoDados; fuso: string; base: string }) {
  const { fase, situacao, janela, urna } = dados;
  const naoIniciada = fase === "RASCUNHO" || fase === "ATIVO_NAO_INICIADA";
  const encerrada = fase === "URNA_ENCERRADA" || fase === "CONCLUIDO";
  const esgotado = situacao === "TEMPO_ESGOTADO";
  const linkOperacao = (
    <Link href={`${base}/configuracao?secao=operacao`} className="font-semibold text-tema-primaria-texto underline">
      Abrir Configuração, seção Operação
    </Link>
  );

  return (
    <Cartao className="flex flex-col gap-3">
      <TituloBloco>Urna</TituloBloco>
      <div className="flex flex-wrap items-center gap-2">
        {naoIniciada && <Selo icone={Clock}>Não iniciada</Selo>}
        {fase === "URNA_ABERTA" && !esgotado && (
          <Selo variante="sucesso" icone={CircleDot} pulsar>
            Aberta
          </Selo>
        )}
        {esgotado && (
          <Selo variante="aviso" icone={Hourglass}>
            Tempo esgotado
          </Selo>
        )}
        {encerrada && <Selo icone={CircleStop}>Votação encerrada</Selo>}
      </div>

      {naoIniciada && (
        <p className="text-sm">
          A urna ainda não foi aberta.
          {situacao === "ABERTURA_PENDENTE" && " Aguardando a organização abrir a urna."}
        </p>
      )}
      {fase === "URNA_ABERTA" && urna.abertaEm && <p className="text-sm">Aberta desde {formatarDataHora(paraMs(urna.abertaEm), fuso)}.</p>}
      {fase === "URNA_ABERTA" && !esgotado && janela.fim && (
        <ContagemRegressiva alvoMs={paraMs(janela.fim)} rotulo="Encerra em" textoZerado="Tempo esgotado" className="text-2xl font-bold" />
      )}
      {esgotado && (
        <p className="text-sm">
          Aguardando a organização encerrar a votação. Votar continua permitido até o encerramento. {linkOperacao}
        </p>
      )}
      {encerrada && urna.encerradaEm && <p className="text-sm">Encerrada em {formatarDataHora(paraMs(urna.encerradaEm), fuso)}.</p>}

      <dl className="grid gap-1 text-sm text-tema-texto-suave sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold">Janela: </dt>
          <dd className="inline">
            {janela.inicio ? formatarDataHora(paraMs(janela.inicio), fuso) : "a definir"} até{" "}
            {janela.fim ? formatarDataHora(paraMs(janela.fim), fuso) : "a definir"}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">Encerramento automático: </dt>
          <dd className="inline">{janela.encerramentoAutomatico ? "ligado" : "desligado"}</dd>
        </div>
      </dl>
      {!esgotado && <p className="text-sm">{linkOperacao}</p>}
    </Cartao>
  );
}
