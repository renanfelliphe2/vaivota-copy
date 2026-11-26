import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { formatarDuracao, totalDeErros, type EstatisticaIntervalos, type FunilTotem, type ResumoSessao } from "@/dominio/sessaoTotem";
import { cx } from "@/lib/classes";

// Peças da análise do totem (logTotem.md): números, intervalos e funil de uma sessão. Usadas no resumo ao encerrar a sessão
// (MenuTotem) e na tela de análise (AnaliseTotem). Nada aqui sabe em quem se votou.

export function hora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function percentual(n: number | null, comSinal = false): string {
  if (n === null) return "—";
  const texto = `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return comSinal && n > 0 ? `+${texto}` : texto;
}

export function Numero({ rotulo, valor, detalhe, destaque = false }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; destaque?: boolean }) {
  return (
    <div className={cx("flex flex-col gap-1 rounded-xl border border-tema-borda p-3", destaque ? "bg-tema-superficie" : "bg-tema-fundo")}>
      <span className="text-sm text-tema-texto-suave">{rotulo}</span>
      <span className="text-2xl font-bold tabular-nums text-tema-texto">{valor}</span>
      {detalhe && <span className="text-sm text-tema-texto-suave">{detalhe}</span>}
    </div>
  );
}

/** Barra horizontal de uma série só (a cor é a primária; o texto diz o valor). */
export function BarraHorizontal({ rotulo, valor, maximo, dica }: { rotulo: string; valor: number; maximo: number; dica?: string }) {
  const largura = maximo > 0 ? Math.max(valor > 0 ? 2 : 0, (valor / maximo) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(8rem,12rem)_1fr_3.5rem] items-center gap-2" title={dica ?? `${rotulo}: ${valor}`}>
      <span className="text-sm text-tema-texto">{rotulo}</span>
      <span className="h-3 rounded-full bg-tema-borda/40">
        <span className="block h-full rounded-full bg-tema-primaria" style={{ width: `${largura}%` }} />
      </span>
      <span className="text-right text-sm font-semibold tabular-nums text-tema-texto">{valor}</span>
    </div>
  );
}

export function Intervalos({ intervalos }: { intervalos: EstatisticaIntervalos | null }) {
  if (!intervalos) return <p className="text-sm text-tema-texto-suave">Precisa de 2 votos ou mais para medir os intervalos.</p>;
  const { faixas } = intervalos;
  const linhas: [string, number][] = [
    ["menos de 5 s", faixas.ate5s],
    ["5 a 15 s", faixas.de5a15s],
    ["15 a 60 s", faixas.de15a60s],
    ["1 a 5 min", faixas.de1a5min],
    ["mais de 5 min", faixas.mais5min],
  ];
  const maximo = Math.max(...linhas.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Numero rotulo="Mediana" valor={formatarDuracao(intervalos.medianaS)} />
        <Numero rotulo="Média" valor={formatarDuracao(intervalos.mediaS)} />
        <Numero rotulo="Menor" valor={formatarDuracao(intervalos.menorS)} />
        <Numero rotulo="Maior" valor={formatarDuracao(intervalos.maiorS)} />
      </div>
      <div className="flex flex-col gap-1.5" aria-label="Intervalos entre votos seguidos, por faixa">
        {linhas.map(([rotulo, n]) => (
          <BarraHorizontal key={rotulo} rotulo={rotulo} valor={n} maximo={maximo} dica={`${n} intervalos de ${rotulo}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * O funil: de quantos toques em "Toque para votar" sobraram quantos votos, e onde o resto parou. É o que explica a diferença
 * entre as crianças na sala e os votos.
 */
export function Funil({ funil, votosNoServidor }: { funil: FunilTotem | null; votosNoServidor: number }) {
  if (!funil) return <p className="text-sm text-tema-texto-suave">Ainda sem registro de toques nesta sessão.</p>;
  const etapas: [string, number][] = [
    ["Tocaram em começar", funil.comecou],
    ["Escolheram um filme", funil.escolheu],
    ["Confirmaram (envios)", funil.enviou],
    ["Votos registrados", funil.registrado],
  ];
  const maximo = Math.max(...etapas.map(([, n]) => n), 1);
  const erros = totalDeErros(funil);
  const perdas: [string, number][] = [
    ["Voltaram no \"É esse?\"", funil.voltou],
    ["Pararam na escolha (tempo)", funil.desistiuEscolha],
    ["Pararam no \"É esse?\" (tempo)", funil.desistiuConfirmar],
    ["Erros", erros],
    ["Tentaram de novo após erro", funil.tentouDeNovo],
    ["Erro sem nova tentativa", funil.erroDescartado],
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        {etapas.map(([rotulo, n]) => (
          <BarraHorizontal key={rotulo} rotulo={rotulo} valor={n} maximo={maximo} />
        ))}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {perdas.map(([rotulo, n]) => (
          <div key={rotulo} className="flex justify-between gap-2 border-b border-tema-borda/60 py-1">
            <dt className="text-tema-texto-suave">{rotulo}</dt>
            <dd className="font-semibold tabular-nums text-tema-texto">{n}</dd>
          </div>
        ))}
      </dl>
      {erros > 0 && (
        <p className="flex items-start gap-2 text-sm text-tema-texto">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-tema-aviso" />
          <span>
            Erros por tipo:{" "}
            {Object.entries(funil.erros)
              .map(([codigo, n]) => `${codigo === "REDE" ? "sem rede" : codigo.toLowerCase().replace(/_/g, " ")} (${n})`)
              .join(", ")}
            .
          </span>
        </p>
      )}
      {funil.registrado !== votosNoServidor && (
        <p className="text-sm text-tema-texto-suave">
          O aparelho contou {funil.registrado} votos confirmados; o servidor tem {votosNoServidor}. Diferença pequena é normal (log apagado,
          página recarregada ou outro aparelho).
        </p>
      )}
    </div>
  );
}

/** O resumo de uma sessão encerrada (menu "Encerrar sessão"). */
export function ResumoSessaoTotem({ resumo }: { resumo: ResumoSessao }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Numero rotulo="Votos antes desta sessão" valor={resumo.votosAntes} />
        <Numero rotulo="Votos nesta sessão" valor={resumo.votos} destaque />
        <Numero
          rotulo="Em relação à sessão anterior"
          valor={percentual(resumo.variacaoAnterior, true)}
          detalhe={resumo.variacaoAnterior === null ? "sem sessão anterior para comparar" : undefined}
        />
        <Numero
          rotulo="Crianças esperadas"
          valor={resumo.criancasEsperadas ?? "—"}
          detalhe={resumo.percentualEsperadas !== null ? `${percentual(resumo.percentualEsperadas)} votaram` : "não informado"}
        />
      </div>
      <p className="text-sm text-tema-texto-suave">
        Sessão {resumo.numero}: aberta às {hora(resumo.abertaEm)}, primeiro voto às {hora(resumo.primeiroVotoEm)}, último às{" "}
        {hora(resumo.ultimoVotoEm)}.
      </p>
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Intervalo entre os votos</h3>
        <Intervalos intervalos={resumo.intervalos} />
      </section>
    </div>
  );
}
