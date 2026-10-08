import { LineChart } from "@/components/charts/LineChart";
import { totalDoPonto, tituloDaSerie, type SerieVotos } from "@/dominio/serie";
import { formatarNumero } from "@/lib/formatar";
import { formatarDataHora, formatarHora, paraMs } from "@/lib/tempo";

// Etapa 7 (5.5, D13): série com o pico (valor e horário) e tabela alternativa por grupo.

export function VotosPorMinuto({
  serie,
  modulos,
  fuso,
}: {
  serie: SerieVotos;
  modulos: { juri: boolean; infantil: boolean };
  fuso: string;
}) {
  const titulo = tituloDaSerie(serie.passoMinutos);
  const rotulo = (inicio: string) =>
    serie.passoMinutos === 60 ? formatarDataHora(paraMs(inicio), fuso).replace(/:00$/, "h") : formatarHora(paraMs(inicio), fuso);
  const pontos = serie.pontos.map((p) => ({ rotulo: rotulo(p.inicio), valor: totalDoPonto(p) }));
  const indicePico = serie.pico ? serie.pontos.findIndex((p) => p.inicio === serie.pico!.inicio) : null;
  const pico = serie.pico ? `Pico de ${formatarNumero(serie.pico.votos)} votos às ${rotulo(serie.pico.inicio)}` : "Sem votos no período";
  const total = serie.pontos.reduce((s, p) => s + totalDoPonto(p), 0);

  return (
    <div className="flex flex-col gap-2">
      <LineChart
        titulo={titulo}
        pontos={pontos}
        destaque={indicePico}
        alt={`${titulo}. ${pico}`}
        rotuloY="Votos"
        vazio={serie.inicio ? "Nenhum voto registrado até agora." : "A urna ainda não foi aberta: sem série de votos."}
        tabela={{
          legenda: `${titulo}: intervalo e votos por grupo`,
          cabecalho: ["Intervalo", "Popular", ...(modulos.juri ? ["Júri"] : []), ...(modulos.infantil ? ["Infantil"] : []), "Total"],
          linhas: serie.pontos.map((p) => [
            rotulo(p.inicio),
            p.popular,
            ...(modulos.juri ? [p.juri] : []),
            ...(modulos.infantil ? [p.infantil] : []),
            totalDoPonto(p),
          ]),
        }}
      />
      {serie.pico && (
        <p className="text-sm text-tema-texto-suave">
          {pico}. Total no período: {formatarNumero(total)}.
        </p>
      )}
    </div>
  );
}
