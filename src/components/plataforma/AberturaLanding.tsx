import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import type { TotaisDaVitrine } from "@/dominio/votacoesEncerradas";
import { formatarNumero } from "@/lib/formatar";
import { DemoDoVoto } from "./DemoDoVoto";
import { AcoesDaAbertura } from "./EventosAgora";

const atraso = (ms: number) => ({ "--atraso": `${ms}ms` }) as CSSProperties;

const GARANTIAS = ["Sem aplicativo para instalar", "Um voto por pessoa", "Resultado congelado na hora"];

/**
 * Abertura da landing: a promessa, os botões e, quando já existe votação encerrada, os números somados de todas elas. Do
 * lado, a demonstração do voto (um celular que funciona) e os botões que vestem a página com a cara de cada evento.
 * `overflow-clip`, não `hidden`: corta as ondas sem virar contêiner de rolagem.
 */
export function AberturaLanding({ totais, comResultados }: { totais: TotaisDaVitrine | null; comResultados: boolean }) {
  return (
    <section aria-labelledby="titulo-abertura" className="vv-ceu relative isolate w-full overflow-clip">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-12 lg:pb-24 lg:pt-16">
        <div className="flex min-w-0 flex-col items-start">
          <p
            className="marca-subir inline-flex items-center gap-2 rounded-full bg-tema-fundo/80 px-4 py-1.5 text-sm font-semibold text-vv-destaque-texto shadow-sm ring-1 ring-vv-destaque/30"
            style={atraso(0)}
          >
            <span aria-hidden className="size-2 rounded-full bg-vv-destaque" />
            Votação ao vivo para festivais, mostras e premiações
          </p>
          <h1
            id="titulo-abertura"
            className="marca-subir mt-6 text-balance text-[clamp(2.5rem,8vw,4.25rem)] font-bold leading-[1.02] tracking-tight"
            style={atraso(80)}
          >
            Quem decide é a plateia.{" "}
            <span className="block bg-linear-to-r from-vv-destaque-texto to-tema-primaria-texto bg-clip-text pb-1 text-transparent">
              A urna fica com a gente.
            </span>
          </h1>
          <p className="marca-subir mt-6 max-w-xl text-pretty text-lg leading-relaxed text-tema-texto-suave" style={atraso(160)}>
            O público vota pelo celular, o júri por convite e as crianças no totem. A VaiVota garante um voto por pessoa, apura
            tudo sozinha e entrega o resultado oficial pronto para o telão, com a identidade do seu evento.
          </p>
          <div className="marca-subir mt-8" style={atraso(240)}>
            <AcoesDaAbertura comResultados={comResultados} />
          </div>
          {totais ? <NumerosDaPlataforma totais={totais} /> : <Garantias />}
        </div>

        <div className="marca-subir" style={atraso(200)}>
          <DemoDoVoto />
        </div>
      </div>
    </section>
  );
}

function NumerosDaPlataforma({ totais }: { totais: TotaisDaVitrine }) {
  const numeros = [
    { rotulo: "votos apurados", valor: totais.votos },
    { rotulo: "participantes", valor: totais.participantes },
    { rotulo: totais.votacoes === 1 ? "votação realizada" : "votações realizadas", valor: totais.votacoes },
  ];
  return (
    <div className="marca-subir mt-10 w-full max-w-xl border-t border-tema-borda pt-6" style={atraso(320)}>
      <p className="text-sm font-semibold text-tema-texto-suave">Até agora, na VaiVota:</p>
      <dl className="mt-3 grid grid-cols-3 gap-4">
        {numeros.map(({ rotulo, valor }) => (
          <div key={rotulo} className="flex flex-col-reverse gap-0.5">
            <dt className="text-sm text-tema-texto-suave">{rotulo}</dt>
            <dd className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">{formatarNumero(valor)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Garantias() {
  return (
    <ul className="marca-subir mt-10 flex flex-col gap-2.5 text-sm font-semibold sm:flex-row sm:flex-wrap sm:gap-x-6" style={atraso(320)}>
      {GARANTIAS.map((texto) => (
        <li key={texto} className="flex items-center gap-2">
          <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-vv-destaque text-vv-sobre-destaque">
            <Check className="size-3" strokeWidth={3.5} />
          </span>
          {texto}
        </li>
      ))}
    </ul>
  );
}
