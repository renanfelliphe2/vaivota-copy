"use client";

import { Equal, Scale, Trophy } from "lucide-react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import type { PropsCena, PropsFinal } from "@/dominio/apresentacao/roteiro";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import type { ConfigApresentacao, Grupo } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { formatarDecimal, formatarNumero } from "@/lib/formatar";
import { lugar, TEXTOS_PALCO } from "@/lib/textosPalco";
import { useContagemAnimada } from "../hooks";
import { MaisNomes, TituloCandidato } from "../Pecas";

// Etapa 8 (5.4, 5.7): cenas da revelação. Recebem só as fatias de montarProps; o DOM tem apenas o passo
// atual (cenas e passos futuros nem são renderizados). Nunca mostram quem votou em quem (E21).

export type Catalogo = (id: string) => CandidatoPalco;

export function rotuloCategoria(config: ConfigApresentacao, grupo: Grupo): string {
  if (grupo === "POPULAR") return config.rotuloCategoriaPublico;
  if (grupo === "JURI") return config.rotuloCategoriaJuri;
  return config.rotuloCategoriaInfantil;
}

function Moldura({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-10 p-20">
      <p className="text-[56px] font-bold text-tema-primaria-texto">{titulo}</p>
      <div className="flex flex-1 flex-col justify-center gap-10">{children}</div>
    </div>
  );
}

function Pessoa({ c, destaque, extra }: { c: CandidatoPalco; destaque?: boolean; extra?: React.ReactNode }) {
  return (
    <div className={cx("palco-entrada flex items-center gap-10 rounded-3xl p-4", destaque && "ring-8 ring-tema-primaria")}>
      <div className="w-[420px] shrink-0">
        <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="16/9" className="rounded-2xl" sizes="420px" />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <TituloCandidato titulo={c.titulo} inteiro />
        {extra}
      </div>
    </div>
  );
}

function Pontuacao({ valor, casas, ativo }: { valor: number; casas: 2 | 4; ativo: boolean }) {
  const animado = useContagemAnimada(valor, 1500, ativo);
  return <span className="text-[72px] font-black tabular-nums">{formatarDecimal(animado, casas)} pontos</span>;
}

export function CenaRevelacao({ props, catalogo, config }: { props: PropsCena; catalogo: Catalogo; config: ConfigApresentacao }) {
  switch (props.tipo) {
    case "CATEGORIA": {
      const co = props.vencedores.length > 1;
      return (
        <Moldura titulo={rotuloCategoria(config, props.grupo)}>
          {props.passo === 0 ? (
            <Trophy aria-hidden className="mx-auto size-64 text-tema-primaria-texto motion-safe:animate-pulse" />
          ) : (
            <>
              {co && <p className="text-[48px] font-bold uppercase tracking-wide text-tema-aviso">{TEXTOS_PALCO.coVencedores}</p>}
              <div className={cx("grid gap-8", co && "grid-cols-2")}>
                {props.vencedores.map((v) => (
                  <Pessoa
                    key={v.candidatoId}
                    c={catalogo(v.candidatoId)}
                    destaque
                    extra={
                      props.passo >= 2 && (
                        <p className="text-[56px] font-bold tabular-nums">{formatarNumero(v.votos)} votos</p>
                      )
                    }
                  />
                ))}
              </div>
              {props.passo >= 2 && props.desempatadoPorPontuacao && <p className="text-[40px] text-tema-texto-suave">{TEXTOS_PALCO.desempatePontuacao}</p>}
            </>
          )}
        </Moldura>
      );
    }
    case "DESEMPATE": {
      const criterio = props.criterio === "JURI" ? TEXTOS_PALCO.criterioJuri : TEXTOS_PALCO.criterioPublico;
      const grupoVotos = props.criterio === "JURI" ? "do júri" : "do público";
      return (
        <Moldura titulo="Desempate">
          <div className="grid grid-cols-2 gap-8">
            {props.candidatos.itens.map((c) => (
              <div key={c.candidatoId} className={cx("flex flex-col gap-4 rounded-3xl border-4 border-tema-borda p-6", props.passo >= 2 && props.vencedorId === c.candidatoId && "border-tema-primaria")}>
                <ImagemCandidato titulo={catalogo(c.candidatoId).titulo} imagemUrl={catalogo(c.candidatoId).imagemUrl} proporcao="16/9" className="rounded-2xl" sizes="800px" />
                <p className="line-clamp-2 text-[48px] font-bold leading-tight">{catalogo(c.candidatoId).titulo}</p>
                {props.passo >= 1 && (
                  <p className="text-[40px] tabular-nums">
                    {formatarNumero(c.votos)} votos {grupoVotos}
                  </p>
                )}
                {props.passo >= 2 && props.vencedorId === c.candidatoId && (
                  <p className="inline-flex items-center gap-3 text-[44px] font-black text-tema-primaria-texto">
                    <Scale aria-hidden className="size-12" /> {TEXTOS_PALCO.vencedor}
                  </p>
                )}
              </div>
            ))}
          </div>
          <MaisNomes mais={props.candidatos.mais} />
          {props.passo >= 1 && (
            <p className="text-[48px] font-semibold">
              {criterio}
              {props.criterio !== props.criterioConfigurado && <span className="block text-[36px] text-tema-texto-suave">{TEXTOS_PALCO.juriDesligado}</span>}
            </p>
          )}
          {props.passo >= 2 && !props.resolvido && (
            <p className="inline-flex items-center gap-3 text-[48px] font-bold text-tema-aviso">
              <Equal aria-hidden className="size-12" /> {TEXTOS_PALCO.posicaoCompartilhada}
            </p>
          )}
        </Moldura>
      );
    }
    case "PODIO":
      return (
        <Moldura titulo={lugar(props.posicao, props.compartilhada)}>
          {props.passo === 0 ? (
            <p className="palco-entrada text-center text-[320px] font-black leading-none text-tema-primaria-texto">{props.posicao}º</p>
          ) : (
            <>
              <div className={cx("grid gap-6", props.candidatos.itens.length > 1 && "grid-cols-2")}>
                {props.candidatos.itens.map((c) => (
                  <Pessoa
                    key={c.candidatoId}
                    c={catalogo(c.candidatoId)}
                    destaque={props.posicao === 1}
                    extra={props.passo >= 2 && <Pontuacao valor={c.pontuacao} casas={props.casas} ativo={props.passo >= 2} />}
                  />
                ))}
              </div>
              <MaisNomes mais={props.candidatos.mais} />
            </>
          )}
        </Moldura>
      );
    case "CLASSIFICACAO":
      return (
        <Moldura titulo={`Classificação · página ${props.pagina + 1} de ${props.paginas}`}>
          <ol className="flex flex-col gap-3">
            {props.linhas.map((l) => (
              <li key={l.candidatoId} className="grid grid-cols-[160px_1fr_320px] items-center gap-6 border-b-2 border-tema-borda pb-2 text-[40px]">
                <span className="font-black tabular-nums">{l.posicao}º</span>
                <span className="truncate">{catalogo(l.candidatoId).titulo}</span>
                <span className="text-right font-bold tabular-nums">{formatarDecimal(l.pontuacao, props.casas)}</span>
              </li>
            ))}
          </ol>
        </Moldura>
      );
    case "FINAL":
      return <CenaFinal final={props} catalogo={catalogo} config={config} />;
    default:
      return null;
  }
}

export function CenaFinal({ final, catalogo, config }: { final: PropsFinal; catalogo: Catalogo; config: ConfigApresentacao }) {
  return (
    <div className="flex h-full flex-col gap-8 p-16">
      <p className="text-[56px] font-bold text-tema-primaria-texto">Resultado final</p>
      {final.vazio ? (
        <p className="flex flex-1 items-center justify-center text-[80px] font-black">{TEXTOS_PALCO.semCandidatos}</p>
      ) : (
        <div className="grid flex-1 grid-cols-[3fr_2fr] gap-12">
          <ol className="flex flex-col gap-6">
            {final.podio.map((p) => (
              <li key={p.posicao} className="flex flex-col gap-2 rounded-3xl border-4 border-tema-borda p-6">
                <p className="text-[44px] font-black text-tema-primaria-texto">{lugar(p.posicao, p.candidatos.itens.length > 1)}</p>
                {p.candidatos.itens.map((c) => (
                  <p key={c.candidatoId} className="flex items-baseline justify-between gap-6 text-[44px]">
                    <span className="line-clamp-2 font-bold">{catalogo(c.candidatoId).titulo}</span>
                    <span className="shrink-0 tabular-nums">{formatarDecimal(c.pontuacao, final.casas)}</span>
                  </p>
                ))}
                <MaisNomes mais={p.candidatos.mais} />
              </li>
            ))}
          </ol>
          <ul className="flex flex-col gap-6">
            {final.categorias.map((c) => (
              <li key={c.grupo} className="flex flex-col gap-2 rounded-3xl bg-tema-superficie p-6">
                <p className="inline-flex items-center gap-3 text-[36px] font-semibold text-tema-texto-suave">
                  <Trophy aria-hidden className="size-9" /> {rotuloCategoria(config, c.grupo)}
                </p>
                {c.vencedores.map((v) => (
                  <p key={v.candidatoId} className="line-clamp-2 text-[44px] font-bold">
                    {catalogo(v.candidatoId).titulo}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-right text-[36px] text-tema-texto-suave">{TEXTOS_PALCO.marca}</p>
    </div>
  );
}
