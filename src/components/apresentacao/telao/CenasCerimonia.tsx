"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ORIGEM_TROFEU } from "@/dominio/apresentacao/cerimonia";
import { DURACOES } from "@/dominio/apresentacao/duracoes";
import { creditoDoItem, type Contagem, type ItemRevelado, type PropsCena, type PropsResultado } from "@/dominio/apresentacao/roteiro";
import type { CandidatoPalco, CategoriaPalco } from "@/dominio/apresentacao/tipos";
import { cx } from "@/lib/classes";
import { formatarNumero, formatarPercentual } from "@/lib/formatar";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { Holofotes } from "../Cinema";
import { useContagemAnimada, usePaginaRotativa } from "../hooks";
import { atrasoTc, BordasPelicula, CartazTelao, FundoSala, LogoTelao, Louros, MarcaVaiVota, QuadroContagem, Sobretitulo } from "./Sala";
import { Transicao, useEntradaDaCena } from "./Transicao";

// Telão (cerimônia, 25/11/2026; protótipo aprovado, quadros 4 a 11): a revelação. Cada vencedor (troféu ou posição) entra com a
// contagem de início de filme 3, 2, 1 no quadro e, no passo seguinte, o cartaz projetado no mesmo quadro. Ao fim de cada categoria,
// o resultado dela; no final, os vencedores de todas.
// Animações (25/11/2026, telao.css): toda cena entra em cascata depois do corte que a trouxe (Transicao.tsx); na revelação o
// quadro dá o clarão do fim da ponta, a disputa recolhe e o vencedor surge; os votos contam até o total.

export type ContextoCerimonia = {
  catalogo: (id: string) => CandidatoPalco;
  /** A categoria do item (para o crédito: Direção, Proponente). */
  categoriaDoItem: (id: string) => CategoriaPalco | null;
};

export type CreditosParceiros = { titulo: string; nomes: string[] }[];

function textoContagem(c: NonNullable<Contagem>): string {
  return `${formatarNumero(c.votos)} ${c.votos === 1 ? "voto" : "votos"} · ${formatarPercentual(c.percentual)}`;
}

/** Os votos contando até o total, quando o elemento entra (o atraso da entrada da cena mais o do próprio elemento). */
function VotosContando({ votos, atraso = 0, className }: { votos: number; atraso?: number; className?: string }) {
  const { entrada } = useEntradaDaCena();
  const valor = useContagemAnimada(votos, 1500, true, entrada + atraso);
  return <span className={className}>{formatarNumero(Math.round(valor))}</span>;
}

/**
 * 3, 2, 1 no quadro, do começo a cada montagem da cena. O 2 e o 1 duram um segundo cada (mais a virada, no 1) e terminam junto
 * com o passo; o 3 fica o resto, enquanto a cena ainda entra pelo corte.
 */
function useContagem3(): number {
  const [n, setN] = useState(3);
  useEffect(() => {
    const dois = setTimeout(() => setN(2), DURACOES.contagem - 2300);
    const um = setTimeout(() => setN(1), DURACOES.contagem - 1300);
    return () => {
      clearTimeout(dois);
      clearTimeout(um);
    };
  }, []);
  return n;
}

function NumeroContagem() {
  const n = useContagem3();
  return <QuadroContagem numero={n} tamanho={800} />;
}

/** Os cartazes no quadro: um ao centro; dois ou três lado a lado (co-vencedores). */
function CartazesNoQuadro({ ids, ctx }: { ids: string[]; ctx: ContextoCerimonia }) {
  const lista = ids.slice(0, 3);
  const largura = lista.length === 1 ? 600 : lista.length === 2 ? 370 : 246;
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5 bg-[radial-gradient(60%_60%_at_50%_40%,color-mix(in_srgb,var(--tc-luz)_12%,transparent),transparent_75%)]">
      {lista.map((id, i) => (
        <div key={id} className="tc-projetar" style={{ width: largura, ...atrasoTc(i * 140) }}>
          <CartazTelao candidato={ctx.catalogo(id)} sizes={`${largura}px`} className="w-full" />
        </div>
      ))}
    </div>
  );
}

/** Os cartazes da disputa entram dados um a um, cada um com um giro. */
const GIROS = [-3, 2.5, -1.5, 3, -2.5];

function giro(i: number): CSSProperties {
  return { "--tc-giro": `${GIROS[i % GIROS.length]}deg` } as CSSProperties;
}

export function CenaVencedor({ props, ctx }: { props: Extract<PropsCena, { tipo: "TROFEU" | "POSICAO" }>; ctx: ContextoCerimonia }) {
  const revelado = props.passo >= 1;
  const trofeu = props.tipo === "TROFEU";
  const titulo = trofeu ? props.titulo : props.unico ? (props.premio ?? TEXTOS_PALCO.vencedor) : `${props.posicao}º lugar`;
  const sobretitulo = trofeu ? (props.categoria ?? ORIGEM_TROFEU[props.origem]) : props.categoria;
  const sub = trofeu
    ? `O mais votado na ${ORIGEM_TROFEU[props.origem]}${props.categoria ? "" : ", entre todas as categorias"}.`
    : props.posicao === 1
      ? props.premio
        ? `${props.premio}.`
        : "O grande vencedor da categoria."
      : "Pela pontuação final da categoria.";
  const vencedores = props.vencedores;
  const nomes = vencedores.map((v) => ctx.catalogo(v.candidatoId).titulo);
  const primeiro = vencedores[0] ? ctx.catalogo(vencedores[0].candidatoId) : null;
  const credito = primeiro ? creditoDoItem(primeiro, ctx.categoriaDoItem(primeiro.id)) : null;
  const contagem = vencedores.length === 1 ? vencedores[0].contagem : null;
  const louros = revelado && (trofeu || props.posicao === 1);
  const selo = trofeu || props.unico ? "Vencedor" : "1º";
  const revelados = props.tipo === "POSICAO" ? props.revelados : [];
  const fichas = revelados.flatMap((r) => r.candidatoIds.map((id) => ({ posicao: r.posicao, id })));

  return (
    <div className="telao-cine tc-sala-revelacao relative h-full overflow-hidden">
      <FundoSala feixe={false} />
      <MarcaVaiVota className="bottom-[110px] left-11" />

      <div className="absolute top-[110px] bottom-[110px] left-[120px] flex w-[860px] flex-col">
        {sobretitulo && <Sobretitulo className="tc-surgir">{sobretitulo}</Sobretitulo>}
        <h1 className="tc-revelar m-0 mt-7 font-cine text-[124px] font-bold uppercase leading-[0.96] tracking-[-0.01em] text-balance" style={atrasoTc(150)}>
          {titulo}
        </h1>
        {fichas.length > 0 && (
          <div className="mt-[30px] flex flex-wrap gap-x-3.5 gap-y-3">
            {fichas.map((f, i) => (
              <span
                key={`${f.posicao}-${f.id}`}
                className="tc-surgir inline-flex items-baseline gap-2.5 rounded-md px-4 py-2 text-[22px] font-semibold text-tc-suave shadow-[inset_0_0_0_2px_var(--tc-linha)]"
                style={atrasoTc(350 + i * 80)}
              >
                <b className="font-cine text-tc-primaria-clara">{f.posicao}º</b>
                {ctx.catalogo(f.id).titulo}
              </span>
            ))}
          </div>
        )}

        {/* Antes e depois no mesmo lugar: na revelação, a disputa recolhe enquanto o vencedor surge. */}
        <div className="mt-9 grid">
          <div className={cx("col-start-1 row-start-1 flex flex-col", revelado && "tc-recolher")} aria-hidden={revelado || undefined}>
            <p className="tc-surgir m-0 text-[38px] font-medium leading-[1.3] text-tc-suave" style={atrasoTc(400)}>
              {sub}
            </p>
            <div className="mt-14 flex flex-col gap-[18px]">
              <p className="tc-surgir m-0 text-[22px] font-bold uppercase tracking-[0.18em] text-tc-apagado" style={atrasoTc(550)}>
                Na disputa
              </p>
              <div className="flex gap-[18px]">
                {props.disputa.slice(0, 5).map((id, i) => (
                  <div key={id} className="tc-distribuir w-[150px]" style={{ ...atrasoTc(650 + i * 90), ...giro(i) }}>
                    <div className="brightness-[0.55] grayscale-[0.7]">
                      <CartazTelao candidato={ctx.catalogo(id)} sizes="150px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {revelado && (
            <div className="col-start-1 row-start-1 flex flex-col">
              <p className="tc-revelar m-0 font-cine text-[96px] font-bold leading-[0.98] tracking-[-0.015em] text-balance" style={atrasoTc(450)}>
                {nomes.join(" e ")}
              </p>
              {credito && (
                <p className="tc-surgir m-0 mt-6 text-[30px] leading-[1.35] text-tc-suave" style={atrasoTc(750)}>
                  <span className="text-tc-apagado">{credito.rotulo}</span> {credito.valor}
                </p>
              )}
              {contagem && (
                <div className="tc-surgir mt-[34px] flex items-baseline gap-[22px] border-t-2 border-tc-linha pt-[26px]" style={atrasoTc(1000)}>
                  <p className="m-0 font-cine text-[64px] font-bold leading-none text-tc-primaria-clara tabular-nums">
                    <VotosContando votos={contagem.votos} atraso={1000} />
                  </p>
                  <p className="m-0 text-[28px] font-medium text-tc-suave">
                    {contagem.votos === 1 ? "voto" : "votos"} <span className="text-tc-apagado">·</span> <b className="text-white tabular-nums">{formatarPercentual(contagem.percentual)}</b>
                    {trofeu ? ` da ${ORIGEM_TROFEU[props.origem]}` : " da categoria"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* O quadro acende como a lâmpada do projetor; no fim da contagem, o clarão branco e o cartaz projetado. */}
      <div className="tc-projetar absolute top-[140px] left-[1120px] h-[800px] w-[800px] overflow-hidden bg-tc-quadro shadow-[0_0_0_1px_var(--tc-linha),0_40px_120px_rgb(0_0_0/0.6)]" style={atrasoTc(250)}>
        {revelado ? (
          <>
            <CartazesNoQuadro ids={vencedores.map((v) => v.candidatoId)} ctx={ctx} />
            <div aria-hidden className="tc-clarao pointer-events-none absolute inset-0 bg-tc-luz" />
          </>
        ) : (
          <NumeroContagem />
        )}
      </div>

      {louros && (
        <div
          className="tc-carimbar absolute top-[812px] left-[1018px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--tc-sala-funda)_92%,transparent)_72%,transparent)]"
          style={atrasoTc(1100)}
        >
          <Louros tamanho={210}>
            <p className={cx("m-0 font-cine font-bold uppercase leading-none text-tc-luz", selo === "1º" ? "text-[58px]" : "text-[22px]")}>{selo}</p>
          </Louros>
        </div>
      )}
    </div>
  );
}

const CRITERIO: Record<string, string> = { JURI: "Maior votação do júri", PUBLICO: "Maior votação do público" };

export function CenaDesempate({ props, ctx }: { props: Extract<PropsCena, { tipo: "DESEMPATE" }>; ctx: ContextoCerimonia }) {
  const itens = props.candidatos.itens;
  const posicao = Math.min(...itens.map((c) => c.posicao));
  const decidido = props.passo >= 2;
  const colunas = Math.min(itens.length, 3);
  return (
    <div className="telao-cine tc-sala-revelacao relative h-full overflow-hidden">
      <FundoSala feixe={false} />
      <MarcaVaiVota className="right-10 bottom-[120px]" />
      <div className="absolute top-[120px] bottom-[120px] left-[120px] flex w-[640px] flex-col">
        <Sobretitulo className="tc-surgir">{props.categoria}</Sobretitulo>
        <h1 className="tc-revelar m-0 mt-7 font-cine text-[112px] font-bold uppercase leading-[0.96] tracking-[-0.01em] text-balance" style={atrasoTc(150)}>
          {TEXTOS_PALCO.empate.replace("!", "")} no {posicao}º lugar
        </h1>
        <p className="tc-surgir m-0 mt-10 text-[34px] leading-[1.4] text-tc-suave" style={atrasoTc(400)}>
          {itens.length} {itens.length === 1 ? "item" : "itens"} com a mesma pontuação final.
        </p>
        {props.passo >= 1 && (
          <div className="tc-surgir mt-auto flex flex-col gap-2.5 border-t-2 border-tc-linha pt-[30px]">
            <p className="m-0 text-[22px] font-bold uppercase tracking-[0.18em] text-tc-apagado">Critério do desempate</p>
            <p className="m-0 font-cine text-[44px] font-bold leading-[1.15]">{props.resolvido ? (CRITERIO[props.criterio] ?? props.criterio) : TEXTOS_PALCO.posicaoCompartilhada}</p>
            {props.criterio !== props.criterioConfigurado && <p className="m-0 text-[26px] text-tc-apagado">{TEXTOS_PALCO.juriDesligado}</p>}
          </div>
        )}
      </div>
      <div className="absolute top-[120px] right-[120px] bottom-[120px] left-[900px] grid gap-16" style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, 1fr))` }}>
        {itens.slice(0, 3).map((c, i) => {
          const venceu = decidido && props.resolvido && props.vencedorId === c.candidatoId;
          const perdeu = decidido && props.resolvido && props.vencedorId !== c.candidatoId;
          return (
            <div key={c.candidatoId} className="tc-distribuir min-w-0" style={{ ...atrasoTc(350 + i * 160), ...giro(i) }}>
              <figure className={cx("relative m-0 flex min-w-0 flex-col gap-[26px]", perdeu && "tc-apagar")}>
                {venceu && <div aria-hidden className="tc-foco-de-luz" />}
                <CartazTelao candidato={ctx.catalogo(c.candidatoId)} sizes="400px" className="w-full shadow-[0_40px_100px_rgb(0_0_0/0.65)]" />
                <figcaption className="flex flex-col gap-3.5">
                  <p className="m-0 line-clamp-2 font-cine text-[48px] font-bold leading-none">{ctx.catalogo(c.candidatoId).titulo}</p>
                  {props.passo >= 1 && (
                    <div className="flex items-center justify-between gap-4">
                      <p className="tc-surgir m-0 text-[28px] text-tc-suave" style={atrasoTc(250 + i * 140)}>
                        {props.criterio === "JURI" ? "Júri" : "Público"}:{" "}
                        <b className="text-white tabular-nums">
                          <VotosContando votos={c.votos} atraso={250 + i * 140} /> {c.votos === 1 ? "voto" : "votos"}
                        </b>
                      </p>
                      {decidido && props.resolvido && (
                        <p
                          className={cx(
                            "tc-carimbar m-0 rounded-md px-[18px] py-2 font-cine text-[24px] font-bold uppercase tracking-[0.06em]",
                            venceu ? "bg-tc-luz text-tc-sala" : "shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--tc-luz)_50%,transparent)]",
                          )}
                          style={atrasoTc(venceu ? 1200 : 1500)}
                        >
                          {venceu ? `Fica com o ${posicao}º` : `${c.posicao}º lugar`}
                        </p>
                      )}
                    </div>
                  )}
                </figcaption>
              </figure>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Creditos({ creditos }: { creditos: CreditosParceiros }) {
  const todos = creditos.flatMap((g) => g.nomes);
  if (todos.length === 0) return null;
  const um = creditos.length === 1;
  const itens = creditos.flatMap((g) => [...(um ? [] : [{ grupo: true, texto: g.titulo }]), ...g.nomes.map((n) => ({ grupo: false, texto: n }))]);
  return (
    // 25/11/2026: colada no pé da tela, logo acima da película; entra depois do resultado, como os créditos do filme.
    <div className="tc-surgir absolute inset-x-0 bottom-[34px] flex h-[92px] items-center overflow-hidden border-t border-tc-linha" style={atrasoTc(1300)}>
      {um && (
        <p className="relative z-10 m-0 flex items-center self-stretch bg-[linear-gradient(90deg,var(--tc-sala)_82%,transparent)] pr-9 pl-[120px] font-cine text-[20px] font-bold uppercase tracking-[0.22em] text-tc-primaria-clara">
          {creditos[0].titulo}
        </p>
      )}
      <div className="tc-creditos flex shrink-0 gap-14 pl-14 whitespace-nowrap">
        {[...itens, ...itens].map((x, i) =>
          x.grupo ? (
            <span key={i} className="font-cine text-[20px] font-bold uppercase tracking-[0.22em] text-tc-primaria-clara">
              {x.texto}
            </span>
          ) : (
            <span key={i} className="text-[24px] font-semibold text-tc-suave">
              {x.texto}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function LinhaContagem({ contagem, grande, atraso = 0 }: { contagem: Contagem; grande?: boolean; atraso?: number }) {
  if (!contagem) return null;
  return grande ? (
    <p className="m-0 text-[28px] text-tc-suave">
      <b className="font-cine text-[56px] text-tc-primaria-clara tabular-nums">
        <VotosContando votos={contagem.votos} atraso={atraso} />
      </b>{" "}
      {contagem.votos === 1 ? "voto" : "votos"} <span className="text-tc-apagado">·</span> <b className="text-white tabular-nums">{formatarPercentual(contagem.percentual)}</b>
    </p>
  ) : (
    <p className="m-0 text-[22px] text-tc-suave tabular-nums">{textoContagem(contagem)}</p>
  );
}

function Premiados({ premiados, ctx, alinhamento = "esquerda" }: { premiados: PropsResultado["premiados"]; ctx: ContextoCerimonia; alinhamento?: "esquerda" | "direita" }) {
  if (premiados.length === 0) return null;
  return (
    <div className={cx("flex flex-col gap-3", alinhamento === "direita" && "items-end text-right")}>
      <p className="m-0 text-[20px] font-bold uppercase tracking-[0.18em] text-tc-apagado">{TEXTOS_PALCO.destaques}</p>
      {premiados.map((p) => (
        <p key={p.titulo} className="m-0 text-[26px] leading-[1.3]">
          <span className="font-bold text-tc-secundaria-clara">{p.titulo}</span> <span className="text-tc-apagado">·</span> {p.candidatoIds.map((id) => ctx.catalogo(id).titulo).join(" e ")}
        </p>
      ))}
    </div>
  );
}

/**
 * De onde o cartaz do resultado parte no corte casado: o cartaz do vencedor sozinho no quadro da revelação (600 × 800, em
 * 1220 × 140 no canvas) até o lugar dele aqui.
 */
function poseDoQuadro(destino: { x: number; y: number; largura: number }): CSSProperties {
  return { "--tc-de-x": `${1220 - destino.x}px`, "--tc-de-y": `${140 - destino.y}px`, "--tc-de-escala": 600 / destino.largura } as CSSProperties;
}

export function CenaResultado({
  resultado,
  ctx,
  nome,
  logoUrl,
  creditos,
}: {
  resultado: PropsResultado;
  ctx: ContextoCerimonia;
  nome: string;
  logoUrl: string | null;
  creditos: CreditosParceiros;
}) {
  const { corte } = useEntradaDaCena();
  const casado = corte === "CASADO";
  const [primeiro, ...outros] = resultado.podio;
  const vencedor = primeiro?.itens[0];
  const cand = vencedor ? ctx.catalogo(vencedor.candidatoId) : null;
  const nomesVencedores = primeiro ? primeiro.itens.map((i) => ctx.catalogo(i.candidatoId).titulo).join(" e ") : "";
  const credito = cand ? creditoDoItem(cand, ctx.categoriaDoItem(cand.id)) : null;
  const contagemVencedor: Contagem = primeiro?.itens.length === 1 ? (vencedor?.contagem ?? null) : null;
  const linhas = outros.flatMap((p) => p.itens.map((i) => ({ posicao: p.posicao, item: i })));
  const compacto = linhas.length > 2;
  /** O cartaz do vencedor: no corte casado, vem do quadro da revelação; senão, acende como projetado. */
  const cartaz = (destino: { x: number; y: number; largura: number }) =>
    casado ? { className: "tc-casar", style: poseDoQuadro(destino) } : { className: "tc-projetar", style: atrasoTc(0) };
  return (
    <div className="telao-cine relative h-full overflow-hidden">
      <FundoSala />
      {casado && <div aria-hidden className="tc-luzes" />}
      <div className="absolute top-16 right-[120px] left-[120px] flex items-center justify-between gap-10">
        <div className="tc-acender" style={atrasoTc(100)}>
          <LogoTelao nome={nome} logoUrl={logoUrl} className="h-[68px]" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Sobretitulo className="tc-surgir text-[22px]! tracking-[0.22em]!" style={atrasoTc(150)}>
            Resultado
          </Sobretitulo>
          <p className="tc-surgir m-0 font-cine text-[40px] font-bold uppercase leading-none" style={atrasoTc(250)}>
            {resultado.nome}
          </p>
        </div>
      </div>

      {cand &&
        (resultado.unico ? (
          <div className="absolute top-[190px] right-[160px] left-[160px] grid h-[640px] grid-cols-[480px_minmax(0,1fr)] gap-x-[90px]">
            <div {...cartaz({ x: 160, y: 190, largura: 480 })}>
              <CartazTelao candidato={cand} sizes="480px" className="w-[480px] shadow-[0_0_0_1px_var(--tc-linha),0_40px_110px_rgb(0_0_0/0.7)]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="tc-carimbar -ml-4 self-start" style={atrasoTc(500)}>
                <Louros tamanho={250}>
                  <p className="m-0 font-cine text-[26px] font-bold uppercase text-tc-luz">Vencedor</p>
                </Louros>
              </div>
              {resultado.premio && (
                <p className="tc-surgir m-0 mt-5 text-[24px] font-bold uppercase tracking-[0.18em] text-tc-apagado" style={atrasoTc(300)}>
                  {resultado.premio}
                </p>
              )}
              <h1 className="tc-revelar m-0 mt-4 font-cine text-[116px] font-bold leading-[0.95] tracking-[-0.015em] text-balance" style={atrasoTc(400)}>
                {nomesVencedores}
              </h1>
              {credito && (
                <p className="tc-surgir m-0 mt-[26px] text-[30px] leading-[1.35] text-tc-suave" style={atrasoTc(650)}>
                  <span className="text-tc-apagado">{credito.rotulo}</span> {credito.valor}
                </p>
              )}
              <div className="tc-surgir mt-auto flex items-end justify-between gap-10" style={atrasoTc(850)}>
                <LinhaContagem contagem={contagemVencedor} grande atraso={850} />
                <div className="ml-auto">
                  <Premiados premiados={resultado.premiados} ctx={ctx} alinhamento="direita" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="absolute top-[196px] left-[120px] grid h-[600px] w-[1000px] grid-cols-[450px_minmax(0,1fr)] gap-x-[52px]">
              <div {...cartaz({ x: 120, y: 196, largura: 450 })}>
                <CartazTelao candidato={cand} sizes="450px" className="w-[450px] shadow-[0_0_0_1px_var(--tc-linha),0_40px_110px_rgb(0_0_0/0.7)]" />
              </div>
              <div className="flex min-w-0 flex-col">
                <div className="tc-carimbar -ml-3.5 self-start" style={atrasoTc(500)}>
                  <Louros tamanho={230}>
                    <p className="m-0 font-cine text-[44px] font-bold leading-none text-tc-luz">1º</p>
                    <p className="m-0 mt-1 text-[13px] font-bold uppercase tracking-[0.16em] text-tc-suave">Lugar</p>
                  </Louros>
                </div>
                {resultado.premio && (
                  <p className="tc-surgir m-0 mt-[18px] text-[22px] font-bold uppercase tracking-[0.18em] text-tc-apagado" style={atrasoTc(300)}>
                    {resultado.premio}
                  </p>
                )}
                <h1 className="tc-revelar m-0 mt-3.5 font-cine text-[82px] font-bold leading-[0.98] tracking-[-0.01em] text-balance" style={atrasoTc(400)}>
                  {nomesVencedores}
                </h1>
                {credito && (
                  <p className="tc-surgir m-0 mt-[22px] text-[26px] leading-[1.35] text-tc-suave" style={atrasoTc(650)}>
                    <span className="text-tc-apagado">{credito.rotulo}</span> {credito.valor}
                  </p>
                )}
                <div className="tc-surgir mt-auto" style={atrasoTc(850)}>
                  <LinhaContagem contagem={contagemVencedor} grande atraso={850} />
                </div>
              </div>
            </div>
            <div className="absolute top-[196px] right-[120px] left-[1200px] flex h-[600px] flex-col" style={{ gap: compacto ? 12 : 22 }}>
              {linhas.map(({ posicao, item }, i) => {
                const c = ctx.catalogo(item.candidatoId);
                return (
                  <div
                    key={`${posicao}-${item.candidatoId}`}
                    className="tc-surgir grid items-center gap-x-[22px] border-b-2 border-tc-linha"
                    style={{ ...atrasoTc(500 + i * 160), gridTemplateColumns: compacto ? "52px 66px minmax(0,1fr)" : "72px 120px minmax(0,1fr)", paddingBottom: compacto ? 12 : 22 }}
                  >
                    <p className={cx("m-0 font-cine font-bold text-tc-suave", compacto ? "text-[36px]" : "text-[52px]")}>{posicao}º</p>
                    <CartazTelao candidato={c} sizes="120px" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <p className={cx("m-0 line-clamp-2 font-cine font-bold leading-[1.08]", compacto ? "text-[28px]" : "text-[36px]")}>{c.titulo}</p>
                      <LinhaContagem contagem={item.contagem} />
                    </div>
                  </div>
                );
              })}
              <div className="tc-surgir mt-auto" style={atrasoTc(1100)}>
                <Premiados premiados={resultado.premiados} ctx={ctx} />
              </div>
            </div>
          </>
        ))}

      <Creditos creditos={creditos} />
      <MarcaVaiVota className="right-10 bottom-[150px]" />
      <BordasPelicula alto={false} />
    </div>
  );
}

/** Vencedores por página na tela final (4 colunas × 2 linhas); mais que isso, as páginas se revezam. */
const VENCEDORES_POR_PAGINA = 8;

/** Colunas e altura do cartaz conforme quantos vencedores dividem a tela. */
function gradeDosVencedores(n: number): { colunas: number; alturaCartaz: number; fonteNome: number } {
  if (n <= 1) return { colunas: 1, alturaCartaz: 560, fonteNome: 64 };
  if (n <= 4) return { colunas: n, alturaCartaz: n === 4 ? 470 : 520, fonteNome: n === 4 ? 40 : 48 };
  return { colunas: n <= 6 ? 3 : 4, alturaCartaz: 210, fonteNome: 32 };
}

/** Um vencedor na tela final: o cartaz (revelado pela luz, um de cada vez), a categoria e quem ganhou (co-vencedores juntos). */
function VencedorDaCategoria({ resultado, ctx, alturaCartaz, fonteNome, indice }: { resultado: PropsResultado; ctx: ContextoCerimonia; alturaCartaz: number; fonteNome: number; indice: number }) {
  const primeiro = resultado.podio.find((p) => p.posicao === 1) ?? resultado.podio[0];
  const ids = primeiro?.itens.map((i) => i.candidatoId) ?? [];
  if (ids.length === 0) return null;
  const nomes = ids.map((id) => ctx.catalogo(id).titulo).join(" e ");
  const atraso = 300 + indice * 180;
  return (
    <figure className="m-0 flex min-w-0 flex-col items-center gap-5 text-center">
      <div className="tc-revelar-cartaz" style={{ width: Math.round(alturaCartaz * 0.75), ...atrasoTc(atraso) }}>
        <CartazTelao candidato={ctx.catalogo(ids[0])} sizes={`${Math.round(alturaCartaz * 0.75)}px`} className="w-full shadow-[0_0_0_1px_var(--tc-linha),0_30px_80px_rgb(0_0_0/0.6)]" />
      </div>
      <figcaption className="tc-surgir flex w-full min-w-0 flex-col items-center gap-2" style={atrasoTc(atraso + 250)}>
        <p className="m-0 line-clamp-1 font-cine text-[20px] font-bold uppercase tracking-[0.18em] text-tc-primaria-clara">{resultado.nome || resultado.premio || TEXTOS_PALCO.vencedor}</p>
        <p className="m-0 line-clamp-2 font-cine font-bold leading-[1.05] text-balance" style={{ fontSize: fonteNome }}>
          {nomes}
        </p>
      </figcaption>
    </figure>
  );
}

/** Final (25/11/2026): os vencedores de todas as categorias numa tela só (em páginas, que trocam pelo foco, se não couberem). */
export function CenaFinal(props: { resultados: PropsResultado[]; ctx: ContextoCerimonia; nome: string; logoUrl: string | null; creditos: CreditosParceiros }) {
  const comVencedor = props.resultados.filter((r) => r.podio.some((p) => p.itens.length > 0));
  const paginas = Math.max(1, Math.ceil(comVencedor.length / VENCEDORES_POR_PAGINA));
  const pagina = usePaginaRotativa(paginas, DURACOES.resultadoCategoria);
  const naTela = comVencedor.slice(pagina * VENCEDORES_POR_PAGINA, (pagina + 1) * VENCEDORES_POR_PAGINA);
  if (naTela.length === 0)
    return (
      <div className="telao-cine relative flex h-full items-center justify-center overflow-hidden">
        <FundoSala />
        <p className="tc-revelar relative m-0 font-cine text-[96px] font-bold">{TEXTOS_PALCO.semCandidatos}</p>
      </div>
    );
  const { colunas, alturaCartaz, fonteNome } = gradeDosVencedores(naTela.length);
  return (
    <div className="telao-cine relative h-full overflow-hidden">
      <FundoSala />
      <div className="absolute top-16 right-[120px] left-[120px] flex items-center justify-between gap-10">
        <div className="tc-acender">
          <LogoTelao nome={props.nome} logoUrl={props.logoUrl} className="h-[68px]" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Sobretitulo className="tc-surgir text-[22px]! tracking-[0.22em]!" style={atrasoTc(100)}>
            {paginas > 1 ? `Resultado final · ${pagina + 1} de ${paginas}` : "Resultado final"}
          </Sobretitulo>
          <p className="tc-revelar m-0 font-cine text-[40px] font-bold uppercase leading-none" style={atrasoTc(200)}>
            Os vencedores
          </p>
        </div>
      </div>
      <div className="absolute top-[180px] right-[120px] bottom-[150px] left-[120px]">
        <Transicao chave={String(pagina)} meta={null} escolher={() => "FOCO"} className="size-full">
          <div
            className="grid size-full content-center justify-center gap-x-12 gap-y-10"
            style={{ gridTemplateColumns: `repeat(${colunas}, minmax(0, ${Math.max(Math.round(alturaCartaz * 0.75), 300)}px))` }}
          >
            {naTela.map((r, i) => (
              <VencedorDaCategoria key={r.categoriaId} resultado={r} ctx={props.ctx} alturaCartaz={alturaCartaz} fonteNome={fonteNome} indice={i} />
            ))}
          </div>
        </Transicao>
      </div>
      <Creditos creditos={props.creditos} />
      <MarcaVaiVota className="right-10 bottom-[150px]" />
      <BordasPelicula alto={false} />
    </div>
  );
}

/** Depois do trailer: o festival apresenta os vencedores (protótipo, quadro 4). */
export function ChamadaCerimonia({ nome, logoUrl, ano }: { nome: string; logoUrl: string | null; ano: string | null }) {
  return (
    <div className="telao-cine relative h-full overflow-hidden bg-[radial-gradient(40%_60%_at_50%_46%,color-mix(in_srgb,var(--tc-luz)_7%,transparent),transparent_75%),var(--tc-sala-funda)]!">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Holofotes />
      </div>
      <div aria-hidden className="tc-cone" />
      <svg aria-hidden viewBox="-72 -72 144 144" width={980} height={980} className="tc-acender absolute top-[60px] left-[470px] opacity-[0.07]" style={atrasoTc(200)}>
        <g fill="none" stroke="var(--tc-secundaria-clara)" strokeWidth={1.1}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <circle key={a} cx={34 * Math.cos((a * Math.PI) / 180)} cy={34 * Math.sin((a * Math.PI) / 180)} r={34} />
          ))}
        </g>
      </svg>
      <div aria-hidden className="tc-grao" />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-40 text-center">
        <div className="tc-acender">
          <LogoTelao nome={nome} logoUrl={logoUrl} className="h-[132px]" />
        </div>
        <p className="tc-acender m-0 mt-14 font-cine text-[30px] font-normal uppercase tracking-[0.42em] text-tc-suave" style={atrasoTc(500)}>
          {TEXTOS_PALCO.apresenta}
        </p>
        <h1 className="tc-revelar m-0 mt-[30px] font-cine text-[132px] font-bold uppercase leading-[0.96] tracking-[-0.01em] text-balance" style={atrasoTc(1000)}>
          Os vencedores{ano ? <><br />de {ano}</> : null}
        </h1>
      </div>
      <MarcaVaiVota className="right-10 bottom-[90px]" />
      <BordasPelicula alto={false} />
    </div>
  );
}

export type { ItemRevelado };
