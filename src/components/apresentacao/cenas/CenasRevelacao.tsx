"use client";

import { Award, Crown, Equal, Scale } from "lucide-react";
import type { CSSProperties } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import type { DetalheFinal, ListaLimitada, PropsCena, PropsFinal } from "@/dominio/apresentacao/roteiro";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import type { ConfigApresentacao, Grupo } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { contar, formatarDecimal, formatarNumero, formatarPercentual } from "@/lib/formatar";
import { disputaPelo, lugar, TEXTOS_PALCO } from "@/lib/textosPalco";
import { atraso, Confete, Flash, FundoCinema, Halo, PalcoCinema, Raios, Reticencias, useDepoisDe, useRoleta } from "../Cinema";
import { useContagemAnimada } from "../hooks";
import { MaisNomes } from "../Pecas";

// Etapa 8 (5.4, 5.7): cenas da revelação. Recebem só as fatias de montarProps; o DOM tem apenas o passo
// atual (cenas e passos futuros nem são renderizados). Nunca mostram quem votou em quem (E21).
// 08/10/2026: direção cinematográfica. Cada cena fica montada entre os passos (CenaAtual troca a chave só na cena),
// então o passo seguinte acontece sobre o anterior: roleta → clarão → vencedor → votos; pódio físico montado do 3º
// ao 1º; final em dois atos (pódio só com os vencedores, depois os cards com votos, percentuais e selos).

export type Catalogo = (id: string) => CandidatoPalco;

export function rotuloCategoria(config: ConfigApresentacao, grupo: Grupo): string {
  if (grupo === "POPULAR") return config.rotuloCategoriaPublico;
  if (grupo === "JURI") return config.rotuloCategoriaJuri;
  return config.rotuloCategoriaInfantil;
}

const NOME_GRUPO_CURTO: Record<Grupo, string> = { POPULAR: "Público", JURI: "Júri", INFANTIL: "Crianças" };

const MEDALHA: Record<number, string> = { 1: "var(--medalha-ouro)", 2: "var(--medalha-prata)", 3: "var(--medalha-bronze)" };
const corDaPosicao = (posicao: number) => MEDALHA[posicao] ?? "var(--cinema-destaque)";

// ─── Peças ───

/** Título de seção da cena, com filetes que se abrem dos lados. */
function Rotulo({ texto, cor = "var(--cinema-destaque)" }: { texto: string; cor?: string }) {
  return (
    <div className="flex items-center justify-center gap-8">
      <span className="cinema-barra h-[3px] w-48" style={{ ...atraso(300), transformOrigin: "right", background: `linear-gradient(90deg, transparent, ${cor})` }} />
      <p className="cinema-tracking text-center text-[44px] font-bold uppercase tracking-[0.22em]" style={{ color: cor }}>
        {texto}
      </p>
      <span className="cinema-barra h-[3px] w-48" style={{ ...atraso(300), background: `linear-gradient(90deg, ${cor}, transparent)` }} />
    </div>
  );
}

function tamanhoNome(titulo: string, escala: "grande" | "medio"): string {
  if (escala === "grande") return titulo.length > 60 ? "text-[56px]" : titulo.length > 28 ? "text-[72px]" : "text-[100px]";
  return titulo.length > 50 ? "text-[40px]" : titulo.length > 24 ? "text-[48px]" : "text-[60px]";
}

function Nome({ titulo, escala = "grande", className, style }: { titulo: string; escala?: "grande" | "medio"; className?: string; style?: CSSProperties }) {
  return (
    <p className={cx("font-black leading-[1.05] tracking-tight", tamanhoNome(titulo, escala), className)} style={style} title={titulo}>
      {titulo}
    </p>
  );
}

/** Cartaz com brilho que atravessa e moldura de luz. */
function Cartaz({ c, largura, cor = "var(--cinema-destaque)", atrasoMs = 0, brilho = true }: { c: CandidatoPalco; largura: number; cor?: string; atrasoMs?: number; brilho?: boolean }) {
  return (
    <div className="relative" style={{ width: largura }}>
      <div className="absolute -inset-4 rounded-[40px] opacity-60 blur-3xl" style={{ background: cor }} />
      <div className="relative overflow-hidden rounded-[28px]" style={{ boxShadow: `0 0 0 4px ${cor}` }}>
        <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="16/9" sizes={`${largura}px`} />
        {brilho && (
          <span aria-hidden className="cinema-brilho absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent" style={atraso(atrasoMs + 700)} />
        )}
      </div>
    </div>
  );
}

function Contador({ valor, casas, ms = 1600, className }: { valor: number; casas?: 2 | 4; ms?: number; className?: string }) {
  const animado = useContagemAnimada(valor, ms, true);
  return <span className={cx("tabular-nums", className)}>{casas ? formatarDecimal(animado, casas) : formatarNumero(Math.round(animado))}</span>;
}

// ─── Categoria ───

function SuspenseCategoria({ candidatos }: { candidatos: CandidatoPalco[] }) {
  const i = useRoleta(candidatos.length, true);
  const c = candidatos[i];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-14">
      <div aria-hidden className="cinema-pop relative w-[820px]" style={atraso(250)}>
        <div className="cinema-pulsar absolute -inset-8 rounded-[48px] blur-3xl" style={{ background: "color-mix(in srgb, var(--cinema-luz) 40%, transparent)" }} />
        <div className="relative overflow-hidden rounded-[28px]" style={{ boxShadow: "0 0 0 3px var(--cinema-linha)" }}>
          {c ? (
            <ImagemCandidato titulo="" imagemUrl={c.imagemUrl} proporcao="16/9" sizes="820px" className="scale-105 blur-[3px] brightness-[0.55]" />
          ) : (
            <div className="aspect-video bg-cinema-vidro" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="cinema-pulsar text-[300px] font-black leading-none text-white drop-shadow-[0_0_40px_rgb(255_255_255/0.5)]">?</span>
          </div>
        </div>
      </div>
      <p className="cinema-subir text-[80px] font-bold" style={atraso(700)}>
        {TEXTOS_PALCO.eOVencedorE}
        <Reticencias />
      </p>
    </div>
  );
}

function VencedorCategoria({ c, votos, mostrarVotos, largura, atrasoMs }: { c: CandidatoPalco; votos: number; mostrarVotos: boolean; largura: number; atrasoMs: number }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center" style={{ width: largura }}>
      <div className="cinema-pop" style={atraso(atrasoMs + 120)}>
        <Cartaz c={c} largura={largura} atrasoMs={atrasoMs} />
      </div>
      <Nome titulo={c.titulo} escala={largura < 700 ? "medio" : "grande"} className="cinema-revelar line-clamp-2" style={atraso(atrasoMs + 450)} />
      <div className="h-[80px]">
        {mostrarVotos && (
          <p className="cinema-subir text-[64px] font-black text-cinema-destaque" style={atraso(atrasoMs)}>
            <Contador valor={votos} /> {votos === 1 ? "voto" : "votos"}
          </p>
        )}
      </div>
    </div>
  );
}

function CenaCategoria({ props, catalogo, config, candidatos }: { props: Extract<PropsCena, { tipo: "CATEGORIA" }>; catalogo: Catalogo; config: ConfigApresentacao; candidatos: CandidatoPalco[] }) {
  const { passo, vencedores } = props;
  const co = vencedores.length > 1;
  const largura = vencedores.length === 1 ? 760 : vencedores.length === 2 ? 620 : 480;
  return (
    <PalcoCinema fundo={<FundoCinema tensao={passo === 0} />}>
      <div className="flex h-full flex-col items-center px-20 pt-16 pb-12">
        <Rotulo texto={rotuloCategoria(config, props.grupo)} />
        {passo === 0 ? (
          <SuspenseCategoria candidatos={candidatos} />
        ) : (
          <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-6">
            <Raios className="left-1/2 top-1/2 size-[1600px] -translate-x-1/2 -translate-y-1/2" />
            {co && <p className="cinema-carimbo relative text-[48px] font-black uppercase tracking-[0.2em] text-medalha-ouro">{TEXTOS_PALCO.coVencedores}</p>}
            <div className={cx("relative grid items-start justify-center gap-14", vencedores.length === 2 ? "grid-cols-2" : vencedores.length > 2 && "grid-cols-3")}>
              {vencedores.map((v, i) => (
                <VencedorCategoria key={v.candidatoId} c={catalogo(v.candidatoId)} votos={v.votos} mostrarVotos={passo >= 2} largura={largura} atrasoMs={i * 250} />
              ))}
            </div>
            {passo >= 2 && props.desempatadoPorPontuacao && (
              <p className="cinema-surgir relative text-[40px] text-cinema-suave" style={atraso(600)}>
                {TEXTOS_PALCO.desempatePontuacao}
              </p>
            )}
          </div>
        )}
      </div>
      {passo === 1 && <Flash />}
      {passo >= 1 && <Confete quantidade={90} atrasoMs={150} />}
    </PalcoCinema>
  );
}

// ─── Desempate ───

function BarraVotos({ votos, max, rotulo, atrasoMs }: { votos: number; max: number; rotulo: string; atrasoMs: number }) {
  return (
    <div className="cinema-subir flex flex-col gap-3" style={atraso(atrasoMs)}>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[36px] text-cinema-suave">{rotulo}</span>
        <span className="text-[56px] font-black">
          <Contador valor={votos} ms={1800} />
        </span>
      </div>
      <div className="h-5 overflow-hidden rounded-full bg-cinema-vidro">
        <div className="cinema-barra h-full rounded-full bg-cinema-destaque" style={{ ...atraso(atrasoMs + 150), "--dur": "1800ms", width: `${max > 0 ? (votos / max) * 100 : 0}%` } as CSSProperties} />
      </div>
    </div>
  );
}

function CenaDesempate({ props, catalogo }: { props: Extract<PropsCena, { tipo: "DESEMPATE" }>; catalogo: Catalogo }) {
  const { passo, candidatos, resolvido, vencedorId } = props;
  const itens = candidatos.itens;
  const max = Math.max(1, ...itens.map((c) => c.votos));
  const disputa = Math.min(...itens.map((c) => c.posicao));
  const decidido = passo >= 2;
  const criterio = props.criterio === "JURI" ? TEXTOS_PALCO.criterioJuri : TEXTOS_PALCO.criterioPublico;
  const rotuloVotos = props.criterio === "JURI" ? "Votos do júri" : "Votos do público";
  const colunas = Math.min(itens.length, 3);
  // Mais de 3 empatados (duas fileiras): sem cartaz, para caber.
  const compacto = itens.length > 3;
  return (
    <PalcoCinema fundo={<FundoCinema tensao={!decidido} />}>
      <div className="flex h-full flex-col items-center gap-6 px-20 pt-14 pb-10">
        <Rotulo texto={disputaPelo(disputa)} />
        <div className="relative flex w-full flex-1 items-center justify-center">
          <p className="cinema-carimbo absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-3xl border-[6px] border-medalha-ouro bg-cinema-fundo px-12 py-2 text-[72px] font-black uppercase tracking-wider text-medalha-ouro" style={atraso(500)}>
            {TEXTOS_PALCO.empate}
          </p>
          <div className="grid w-full justify-center gap-10 pt-16" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, ${colunas > 2 ? 470 : 560}px))` }}>
            {itens.map((c, i) => {
              const cand = catalogo(c.candidatoId);
              const venceu = decidido && resolvido && vencedorId === c.candidatoId;
              const perdeu = decidido && resolvido && !venceu;
              return (
                <div
                  key={c.candidatoId}
                  className={cx("relative flex flex-col gap-5 rounded-[32px] bg-cinema-vidro p-6 transition-all duration-1000", venceu && "scale-[1.05]", perdeu && "scale-95 opacity-35 grayscale")}
                  style={{ boxShadow: venceu ? "0 0 0 6px var(--medalha-ouro), 0 0 90px color-mix(in srgb, var(--medalha-ouro) 55%, transparent)" : "0 0 0 2px var(--cinema-linha)" }}
                >
                  {venceu && <Halo className="-inset-x-20 -top-64 h-[600px]" />}
                  {compacto ? (
                    venceu && (
                      <p className="cinema-pop inline-flex w-fit items-center gap-3 rounded-full bg-medalha-ouro px-6 py-2 text-[36px] font-black text-black">
                        <Crown aria-hidden className="size-10" /> {TEXTOS_PALCO.venceuDesempate}
                      </p>
                    )
                  ) : (
                    <div className="cinema-subir relative overflow-hidden rounded-2xl" style={atraso(200 + i * 220)}>
                      <ImagemCandidato titulo={cand.titulo} imagemUrl={cand.imagemUrl} proporcao="16/9" sizes="560px" />
                      {venceu && (
                        <p className="cinema-pop absolute left-4 top-4 inline-flex items-center gap-3 rounded-full bg-medalha-ouro px-6 py-2 text-[36px] font-black text-black">
                          <Crown aria-hidden className="size-10" /> {TEXTOS_PALCO.venceuDesempate}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="cinema-subir relative line-clamp-2 text-[48px] font-bold leading-tight" style={atraso(350 + i * 220)}>
                    {cand.titulo}
                  </p>
                  {passo >= 1 && <BarraVotos votos={c.votos} max={max} rotulo={rotuloVotos} atrasoMs={i * 300} />}
                </div>
              );
            })}
          </div>
        </div>
        <MaisNomes mais={candidatos.mais} />
        <div className="flex h-[110px] flex-col items-center justify-center gap-2 text-center">
          {passo >= 1 && !(decidido && !resolvido) && (
            <p className="cinema-subir inline-flex items-center gap-4 text-[48px] font-semibold">
              <Scale aria-hidden className="size-12 text-cinema-destaque" /> {criterio}
            </p>
          )}
          {passo >= 1 && props.criterio !== props.criterioConfigurado && <p className="cinema-surgir text-[36px] text-cinema-suave">{TEXTOS_PALCO.juriDesligado}</p>}
          {decidido && !resolvido && (
            <p className="cinema-pop inline-flex items-center gap-4 text-[52px] font-black text-medalha-ouro">
              <Equal aria-hidden className="size-14" /> {TEXTOS_PALCO.posicaoCompartilhada}
            </p>
          )}
        </div>
      </div>
      {decidido && <Flash />}
    </PalcoCinema>
  );
}

// ─── Pódio ───

type ItemPodio = { candidatoId: string; pontuacao: number };
type Degrau = { posicao: number; candidatos: ListaLimitada<ItemPodio> | null };
/** OCULTO: degrau sem nome; VEZ: suspense sobre o degrau; REVELADO: candidato chegando; FIXO: já estava lá. */
type EstadoDegrau = "OCULTO" | "VEZ" | "REVELADO" | "FIXO";

const ALTURA_DEGRAU: Record<number, number> = { 1: 330, 2: 230, 3: 160 };
/** Ordem clássica do pódio: 2º à esquerda, 1º no centro, 3º à direita. */
const ORDEM_VISUAL = [2, 1, 3];

function BlocoDegrau({ posicao, aceso, vez, subir, atrasoMs }: { posicao: number; aceso: boolean; vez: boolean; subir: boolean; atrasoMs: number }) {
  const cor = corDaPosicao(posicao);
  return (
    <div className="relative w-full overflow-hidden" style={{ height: ALTURA_DEGRAU[posicao] ?? 140 }}>
      <div className={cx("absolute inset-0 flex flex-col", subir && "cinema-degrau")} style={atraso(atrasoMs)}>
        <div className="h-6 w-full" style={{ background: `color-mix(in srgb, ${cor} ${aceso ? 85 : 35}%, #ffffff)`, clipPath: "polygon(4% 0, 96% 0, 100% 100%, 0 100%)" }} />
        <div
          className="flex flex-1 items-start justify-center pt-5 transition-[background] duration-1000"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${cor} ${aceso ? 78 : 28}%, #0b0d14), color-mix(in srgb, ${cor} ${aceso ? 30 : 8}%, #04050a))`,
          }}
        >
          <span
            className={cx("text-[120px] font-black leading-none transition-colors duration-1000", vez && "cinema-pulsar")}
            style={{ color: aceso ? "#ffffff" : "rgb(255 255 255 / 0.22)", textShadow: aceso ? "0 6px 30px rgb(0 0 0 / 0.45)" : undefined }}
          >
            {posicao}
          </span>
        </div>
      </div>
    </div>
  );
}

function Ocupantes({ lista, posicao, catalogo, animar, pontos, casas }: { lista: ListaLimitada<ItemPodio>; posicao: number; catalogo: Catalogo; animar: boolean; pontos: boolean; casas: 2 | 4 }) {
  const cor = corDaPosicao(posicao);
  if (lista.itens.length >= 3)
    return (
      <div className={cx("flex flex-col items-center gap-2 text-center", animar && "cinema-cair")}>
        {lista.itens.slice(0, 4).map((c) => (
          <p key={c.candidatoId} className="line-clamp-1 max-w-[500px] text-[36px] font-bold">
            {catalogo(c.candidatoId).titulo}
          </p>
        ))}
        <MaisNomes mais={lista.mais + Math.max(0, lista.itens.length - 4)} />
      </div>
    );
  return (
    <div className="flex w-full items-end justify-center gap-4">
      {lista.itens.map((c, i) => {
        const cand = catalogo(c.candidatoId);
        return (
          <div key={c.candidatoId} className={cx("flex min-w-0 flex-col items-center gap-3 text-center", lista.itens.length === 1 ? "w-[440px]" : "flex-1", animar && "cinema-cair")} style={atraso(i * 200)}>
            <div className="w-full overflow-hidden rounded-2xl" style={{ boxShadow: `0 0 0 4px ${cor}, 0 18px 50px rgb(0 0 0 / 0.5)` }}>
              <ImagemCandidato titulo={cand.titulo} imagemUrl={cand.imagemUrl} proporcao="16/9" sizes="440px" />
            </div>
            <p className={cx("line-clamp-2 font-bold leading-tight", lista.itens.length === 1 ? "text-[44px]" : "text-[36px]")}>{cand.titulo}</p>
            {pontos && (
              <p className="cinema-subir text-[52px] font-black leading-none" style={{ color: cor }}>
                <Contador valor={c.pontuacao} casas={casas} /> <span className="text-[36px] font-semibold text-cinema-suave">{TEXTOS_PALCO.pontos}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Podio({
  degraus,
  estados,
  catalogo,
  casas,
  pontosEm,
  subir,
}: {
  degraus: Degrau[];
  estados: Record<number, EstadoDegrau>;
  catalogo: Catalogo;
  casas: 2 | 4;
  /** Posição que mostra a pontuação (passo de detalhe). */
  pontosEm: number | null;
  /** Degraus sobem do chão (primeira cena do pódio). */
  subir: boolean;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-5 px-16">
      {ORDEM_VISUAL.map((posicao, ordem) => {
        const d = degraus.find((x) => x.posicao === posicao);
        if (!d) return <div key={posicao} className="w-[520px]" />;
        const estado = estados[posicao] ?? "OCULTO";
        const visivel = d.candidatos && (estado === "REVELADO" || estado === "FIXO");
        return (
          <div key={posicao} className="relative flex w-[520px] flex-col items-center">
            {estado === "VEZ" && (
              <div
                aria-hidden
                className="cinema-surgir pointer-events-none absolute bottom-0 left-1/2 h-[1100px] w-[760px] -translate-x-1/2"
                style={{
                  background: "linear-gradient(180deg, color-mix(in srgb, var(--cinema-luz) 55%, transparent), transparent 85%)",
                  clipPath: "polygon(44% 0, 56% 0, 100% 100%, 0 100%)",
                  filter: "blur(16px)",
                  opacity: 0.5,
                }}
              />
            )}
            {visivel && posicao === 1 && <Raios className="bottom-[200px] left-1/2 size-[1100px] -translate-x-1/2 translate-y-1/2" cor="var(--medalha-ouro)" />}
            <div className="relative flex min-h-[420px] w-full flex-col items-center justify-end pb-6">
              {estado === "OCULTO" && <span className="text-[130px] font-black text-white/12">?</span>}
              {estado === "VEZ" && <span className="cinema-pulsar text-[200px] font-black leading-none text-cinema-destaque drop-shadow-[0_0_50px_var(--cinema-luz)]">?</span>}
              {visivel && d.candidatos && (
                <Ocupantes lista={d.candidatos} posicao={posicao} catalogo={catalogo} animar={estado === "REVELADO"} pontos={pontosEm === posicao} casas={casas} />
              )}
            </div>
            <BlocoDegrau posicao={posicao} aceso={estado !== "OCULTO"} vez={estado === "VEZ"} subir={subir} atrasoMs={[150, 350, 0][ordem]} />
          </div>
        );
      })}
    </div>
  );
}

function TituloLugar({ texto, posicao }: { texto: string; posicao: number }) {
  return (
    <p
      className={cx("cinema-tracking text-center text-[110px] font-black uppercase leading-none tracking-[0.06em]", posicao === 1 && "cinema-ouro")}
      style={posicao === 1 ? undefined : { color: corDaPosicao(posicao) }}
    >
      {texto}
    </p>
  );
}

function CenaPodio({ props, catalogo }: { props: Extract<PropsCena, { tipo: "PODIO" }>; catalogo: Catalogo }) {
  const { passo, posicao, degraus } = props;
  const primeiro = posicao === 1;
  const primeiraCenaDoPodio = posicao === Math.max(...degraus.map((d) => d.posicao));
  const estados: Record<number, EstadoDegrau> = {};
  for (const d of degraus) estados[d.posicao] = d.posicao > posicao ? "FIXO" : d.posicao < posicao ? "OCULTO" : passo === 0 ? "VEZ" : "REVELADO";
  return (
    <PalcoCinema fundo={<FundoCinema tensao={passo === 0} />}>
      <div className="flex flex-col items-center gap-5 pt-14">
        <TituloLugar texto={lugar(posicao, props.compartilhada)} posicao={posicao} />
        {passo === 0 && primeiro && (
          <p className="cinema-subir text-[56px] font-bold text-cinema-suave" style={atraso(900)}>
            {TEXTOS_PALCO.eOGrandeVencedorE}
            <Reticencias />
          </p>
        )}
      </div>
      <Podio degraus={degraus} estados={estados} catalogo={catalogo} casas={props.casas} pontosEm={passo >= 2 ? posicao : null} subir={primeiraCenaDoPodio && passo === 0} />
      {passo === 1 && <Flash />}
      {primeiro && passo >= 1 && <Confete quantidade={140} atrasoMs={200} />}
    </PalcoCinema>
  );
}

// ─── Classificação ───

function CenaClassificacao({ props, catalogo }: { props: Extract<PropsCena, { tipo: "CLASSIFICACAO" }>; catalogo: Catalogo }) {
  return (
    <PalcoCinema fundo={<FundoCinema holofotes={false} />}>
      <div key={props.pagina} className="flex h-full flex-col gap-8 px-24 pt-16 pb-12">
        <div className="flex items-baseline justify-between">
          <p className="cinema-tracking text-[56px] font-black uppercase tracking-[0.12em]">Classificação</p>
          <p className="cinema-surgir text-[36px] text-cinema-suave">
            Página {props.pagina + 1} de {props.paginas}
          </p>
        </div>
        <ol className="flex flex-col gap-3">
          {props.linhas.map((l, i) => (
            <li
              key={l.candidatoId}
              className="cinema-subir grid grid-cols-[150px_1fr_300px] items-center gap-6 rounded-2xl bg-cinema-vidro px-8 py-3 text-[40px]"
              style={atraso(150 + i * 90)}
            >
              <span className="font-black tabular-nums" style={{ color: l.posicao <= 3 ? corDaPosicao(l.posicao) : undefined }}>
                {l.posicao}º
              </span>
              <span className="truncate font-semibold">{catalogo(l.candidatoId).titulo}</span>
              <span className="text-right font-bold tabular-nums">{formatarDecimal(l.pontuacao, props.casas)}</span>
            </li>
          ))}
        </ol>
      </div>
    </PalcoCinema>
  );
}

export function CenaRevelacao({ props, catalogo, config, candidatos }: { props: PropsCena; catalogo: Catalogo; config: ConfigApresentacao; candidatos: CandidatoPalco[] }) {
  switch (props.tipo) {
    case "CATEGORIA":
      return <CenaCategoria props={props} catalogo={catalogo} config={config} candidatos={candidatos} />;
    case "DESEMPATE":
      return <CenaDesempate props={props} catalogo={catalogo} />;
    case "PODIO":
      return <CenaPodio props={props} catalogo={catalogo} />;
    case "CLASSIFICACAO":
      return <CenaClassificacao props={props} catalogo={catalogo} />;
    case "FINAL":
      return <CenaFinal final={props} catalogo={catalogo} config={config} />;
    default:
      return null;
  }
}

// ─── Final ───

function Medalha({ posicao, tamanho = 72 }: { posicao: number; tamanho?: number }) {
  const cor = corDaPosicao(posicao);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-black text-black"
      style={{
        width: tamanho,
        height: tamanho,
        fontSize: tamanho * 0.5,
        background: `radial-gradient(circle at 35% 30%, #ffffff, ${cor} 45%, color-mix(in srgb, ${cor} 60%, #000000))`,
        boxShadow: `0 0 0 3px color-mix(in srgb, ${cor} 50%, #000000), 0 0 30px color-mix(in srgb, ${cor} 45%, transparent)`,
      }}
    >
      {posicao}
    </span>
  );
}

function Selo({ texto, atrasoMs }: { texto: string; atrasoMs: number }) {
  return (
    <span
      className="cinema-pop inline-flex items-center gap-3 rounded-full px-5 py-2 text-[36px] font-bold leading-tight text-medalha-ouro"
      style={{
        ...atraso(atrasoMs),
        background: "color-mix(in srgb, var(--medalha-ouro) 18%, transparent)",
        boxShadow: "inset 0 0 0 2px color-mix(in srgb, var(--medalha-ouro) 65%, transparent)",
      }}
    >
      <Award aria-hidden className="size-9 shrink-0" /> {texto}
    </span>
  );
}

function VotosDoGrupo({ v, cor }: { v: DetalheFinal["votos"][number]; cor: string }) {
  return (
    <span className="tabular-nums">
      <b className="font-black">{contar(v.votos, "voto", "votos")}</b>
      <span className="text-cinema-suave"> · </span>
      <b className="font-black" style={{ color: cor }}>
        {formatarPercentual(v.percentual)}
      </b>
    </span>
  );
}

function LinhaVotos({ v, cor, atrasoMs }: { v: DetalheFinal["votos"][number]; cor: string; atrasoMs: number }) {
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-4 text-[36px] leading-tight">
        <span className="text-cinema-suave">{NOME_GRUPO_CURTO[v.grupo]}</span>
        <VotosDoGrupo v={v} cor={cor} />
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-cinema-vidro">
        <div className="cinema-barra h-full rounded-full" style={{ ...atraso(atrasoMs), width: `${Math.min(100, v.percentual)}%`, background: cor }} />
      </div>
    </li>
  );
}

type CardFinal = ItemPodio & { posicao: number; detalhe: DetalheFinal };

function estiloCartao(posicao: number, atrasoMs: number): CSSProperties {
  const cor = corDaPosicao(posicao);
  return {
    ...atraso(atrasoMs),
    background: `linear-gradient(180deg, color-mix(in srgb, ${cor} 16%, transparent), var(--cinema-vidro) 55%)`,
    boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${cor} 55%, transparent)${posicao === 1 ? `, 0 0 80px color-mix(in srgb, ${cor} 30%, transparent)` : ""}`,
  };
}

function CartaoFinal({ item, catalogo, config, casas, atrasoMs }: { item: CardFinal; catalogo: Catalogo; config: ConfigApresentacao; casas: 2 | 4; atrasoMs: number }) {
  const cand = catalogo(item.candidatoId);
  const cor = corDaPosicao(item.posicao);
  return (
    <article className="cinema-subir relative flex min-h-0 flex-col gap-3 overflow-hidden rounded-[32px] p-7" style={estiloCartao(item.posicao, atrasoMs)}>
      <div className="flex items-center gap-4">
        <Medalha posicao={item.posicao} />
        <p className={cx("text-[40px] font-black uppercase tracking-wide", item.posicao === 1 && "cinema-ouro")} style={item.posicao === 1 ? undefined : { color: cor }}>
          {lugar(item.posicao)}
        </p>
      </div>
      <div className="h-[190px] shrink-0 overflow-hidden rounded-2xl">
        <ImagemCandidato titulo={cand.titulo} imagemUrl={cand.imagemUrl} proporcao="16/9" className="aspect-auto! h-full" sizes="560px" />
      </div>
      <p className="line-clamp-2 text-[44px] font-bold leading-tight" title={cand.titulo}>
        {cand.titulo}
      </p>
      <p className="text-[60px] font-black leading-none">
        <Contador valor={item.pontuacao} casas={casas} ms={1800} /> <span className="text-[36px] font-semibold text-cinema-suave">{TEXTOS_PALCO.pontos}</span>
      </p>
      <ul className="flex flex-col gap-3">
        {item.detalhe.votos.map((v, i) => (
          <LinhaVotos key={v.grupo} v={v} cor={cor} atrasoMs={atrasoMs + 500 + i * 150} />
        ))}
      </ul>
      {item.detalhe.selos.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-3">
          {item.detalhe.selos.map((g, i) => (
            <Selo key={g} texto={rotuloCategoria(config, g)} atrasoMs={atrasoMs + 1100 + i * 200} />
          ))}
        </div>
      )}
    </article>
  );
}

/** Pódio com empates (4 a 6 nomes): uma faixa por candidato, em duas linhas. */
function FaixaFinal({ item, catalogo, config, casas, atrasoMs }: { item: CardFinal; catalogo: Catalogo; config: ConfigApresentacao; casas: 2 | 4; atrasoMs: number }) {
  const cor = corDaPosicao(item.posicao);
  return (
    <article className="cinema-subir flex flex-col gap-2 rounded-[28px] px-7 py-3" style={estiloCartao(item.posicao, atrasoMs)}>
      <div className="flex items-center gap-5">
        <Medalha posicao={item.posicao} tamanho={56} />
        <p className="min-w-0 flex-1 truncate text-[44px] font-bold">{catalogo(item.candidatoId).titulo}</p>
        <p className="shrink-0 text-[48px] font-black">
          <Contador valor={item.pontuacao} casas={casas} ms={1800} /> <span className="text-[36px] font-semibold text-cinema-suave">{TEXTOS_PALCO.pontos}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-2 pl-[76px] text-[36px] leading-tight">
        {item.detalhe.votos.map((v) => (
          <span key={v.grupo}>
            <span className="text-cinema-suave">{NOME_GRUPO_CURTO[v.grupo]} </span>
            <VotosDoGrupo v={v} cor={cor} />
          </span>
        ))}
        {item.detalhe.selos.map((g, i) => (
          <Selo key={g} texto={rotuloCategoria(config, g)} atrasoMs={atrasoMs + 900 + i * 200} />
        ))}
      </div>
    </article>
  );
}

const MAX_CARDS = 6;

function DetalhesFinal({ final, catalogo, config }: { final: PropsFinal; catalogo: Catalogo; config: ConfigApresentacao }) {
  const cards: CardFinal[] = final.podio.flatMap((p) => p.candidatos.itens.map((c) => ({ ...c, posicao: p.posicao })));
  const visiveis = cards.slice(0, MAX_CARDS);
  const mais = final.podio.reduce((s, p) => s + p.candidatos.mais, 0) + Math.max(0, cards.length - MAX_CARDS);
  const faixas = visiveis.length > 3;
  return (
    <div className="flex h-full flex-col gap-7 px-16 pt-12 pb-10">
      <header className="flex items-end justify-between gap-8">
        <p className="cinema-tracking text-[60px] font-black uppercase tracking-[0.12em]">{TEXTOS_PALCO.resultadoFinal}</p>
        <p className="cinema-surgir text-[36px] text-cinema-suave" style={atraso(800)}>
          {TEXTOS_PALCO.marca}
        </p>
      </header>
      {faixas ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
          {visiveis.map((c, i) => (
            <FaixaFinal key={c.candidatoId} item={c} catalogo={catalogo} config={config} casas={final.casas} atrasoMs={150 + i * 160} />
          ))}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 justify-center gap-8" style={{ gridTemplateColumns: `repeat(${visiveis.length}, minmax(0, ${visiveis.length === 1 ? 760 : 580}px))` }}>
          {visiveis.map((c, i) => (
            <CartaoFinal key={c.candidatoId} item={c} catalogo={catalogo} config={config} casas={final.casas} atrasoMs={150 + i * 220} />
          ))}
        </div>
      )}
      <MaisNomes mais={mais} />
      {final.destaques.length > 0 && (
        <div className="cinema-subir flex flex-wrap items-center gap-x-8 gap-y-3" style={atraso(1400)}>
          <span className="text-[36px] font-semibold uppercase tracking-[0.15em] text-cinema-suave">{TEXTOS_PALCO.destaques}</span>
          {final.destaques.map((d) => (
            <span key={`${d.grupo}:${d.candidatoId}`} className="inline-flex items-center gap-4 text-[36px]">
              <Selo texto={rotuloCategoria(config, d.grupo)} atrasoMs={1600} />
              <b className="font-bold">{catalogo(d.candidatoId).titulo}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Final da revelação em dois atos: o pódio só com os vencedores (ainda com confete) e, depois de
 * DURACOES.finalPodio, os cards com pontuação, votos e percentuais por grupo e os selos das categorias.
 * `direto` (resultado estático, depois da cerimônia) abre já nos cards.
 */
export function CenaFinal({ final, catalogo, config, direto = false }: { final: PropsFinal; catalogo: Catalogo; config: ConfigApresentacao; direto?: boolean }) {
  const animar = !direto && !final.vazio;
  const saindo = useDepoisDe(DURACOES.finalPodio - 900, animar);
  const detalhes = useDepoisDe(DURACOES.finalPodio, animar);
  if (final.vazio)
    return (
      <PalcoCinema>
        <p className="cinema-revelar flex h-full items-center justify-center text-center text-[80px] font-black">{TEXTOS_PALCO.semCandidatos}</p>
      </PalcoCinema>
    );
  if (detalhes)
    return (
      <PalcoCinema fundo={<FundoCinema holofotes={false} />}>
        <DetalhesFinal final={final} catalogo={catalogo} config={config} />
      </PalcoCinema>
    );
  const degraus: Degrau[] = final.podio.map((p) => ({ posicao: p.posicao, candidatos: p.candidatos }));
  const estados: Record<number, EstadoDegrau> = Object.fromEntries(final.podio.map((p) => [p.posicao, "FIXO" as const]));
  return (
    <PalcoCinema>
      <div className={cx("relative h-full transition-all duration-700 ease-in", saindo && "scale-[0.97] opacity-0 blur-sm")}>
        <div className="flex flex-col items-center gap-4 pt-14">
          <p className="cinema-tracking cinema-ouro text-center text-[96px] font-black uppercase leading-none tracking-[0.06em]">{TEXTOS_PALCO.grandesVencedores}</p>
        </div>
        <Podio degraus={degraus} estados={estados} catalogo={catalogo} casas={final.casas} pontosEm={null} subir={false} />
        <Confete quantidade={120} atrasoMs={300} />
      </div>
    </PalcoCinema>
  );
}
