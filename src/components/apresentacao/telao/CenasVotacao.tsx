"use client";

import { QRCodeSVG } from "qrcode.react";
import type { CSSProperties, ReactNode } from "react";
import type { CandidatoPalco } from "@/dominio/apresentacao/tipos";
import { linkPorExtenso, TELAO_PADRAO } from "@/dominio/telao";
import type { OpcoesTelao } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { formatarNumero } from "@/lib/formatar";
import { TEXTOS_PALCO } from "@/lib/textosPalco";
import { useContagemAnimada } from "../hooks";
import { atrasoTc, BordasPelicula, CartazTelao, FaixaCores, FundoSala, Furos, LogoTelao, MarcaVaiVota, QuadroContagem, Sobretitulo } from "./Sala";
import { Transicao, useEntradaDaCena } from "./Transicao";

// Telão (cerimônia, 25/11/2026; protótipo aprovado, quadros 1 a 3): as cenas fora da revelação. Só desenham o que recebem.
// Animações (25/11/2026, telao.css): a tela entra em cascata; no ao vivo, a troca de categoria passa pelo foco (a película entra
// puxada) e o ingresso vira entre a categoria online e a do totem; nas telas de espera a película é enfiada no projetor e corre.

export type SubestadoAoVivo = "ABERTURA" | "RETA_FINAL" | "TEMPO_ESGOTADO" | null;

/** Filmes que cabem lado a lado na película; com mais, ela corre devagar (sem mudar de altura entre as categorias). */
const CABEM_NA_FITA = 4;

function Pelicula({ candidatos }: { candidatos: CandidatoPalco[] }) {
  const corre = candidatos.length > CABEM_NA_FITA;
  const lista = corre ? [...candidatos, ...candidatos] : candidatos;
  return (
    <div className="mt-auto overflow-hidden rounded-md">
      {/* A película é puxada pela direita e trava (só na entrada); depois, se não couber, corre. */}
      <div className="tc-puxar" style={atrasoTc(500)}>
        <div
          className={cx("flex", corre ? "tc-rolo w-max" : "w-full")}
          style={corre ? ({ "--tc-dur": `${candidatos.length * 6.5}s` } as CSSProperties) : undefined}
        >
          {lista.map((c, i) => (
            <div key={`${c.id}-${i}`} className="flex w-[276px] flex-none flex-col">
              <div className="bg-tc-pelicula px-2.5">
                <Furos quantidade={8} className="h-[30px] justify-around" furo="h-[11px] w-4" />
                <CartazTelao candidato={c} sizes="256px" className="w-64" />
                <Furos quantidade={8} className="h-[30px] justify-around" furo="h-[11px] w-4" />
              </div>
              <p className="m-0 mt-4 line-clamp-2 h-[60px] px-2.5 text-[26px] font-bold leading-[1.15] text-balance">{c.titulo}</p>
            </div>
          ))}
          {!corre && <div aria-hidden className="flex-1 self-start bg-tc-pelicula" style={{ height: 401 }} />}
        </div>
      </div>
    </div>
  );
}

/** Totem, TV e tablet se revezando (a votação da categoria é feita em aparelhos no local). */
function Aparelhos() {
  const traco = { fill: "none", stroke: "var(--tc-papel-texto)", strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const toque = (cx: number, cy: number) => (
    <>
      <circle className="tc-toque" cx={cx} cy={cy} r={14} fill="none" stroke="var(--tc-papel-destaque)" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={5} fill="var(--tc-papel-destaque)" />
    </>
  );
  return (
    <div aria-hidden className="relative h-[283px] w-[200px]">
      <svg className="tc-aparelho tc-aparelho-1" viewBox="0 0 120 170" width={200} height={283}>
        <rect x={18} y={6} width={84} height={118} rx={10} {...traco} />
        <rect x={28} y={18} width={64} height={86} rx={4} {...traco} stroke="var(--tc-papel-destaque)" />
        <path d="M44 124 L38 162 M76 124 L82 162 M30 162 H90" {...traco} />
        {toque(60, 61)}
      </svg>
      <svg className="tc-aparelho tc-aparelho-2" viewBox="0 0 120 170" width={200} height={283}>
        <rect x={4} y={44} width={112} height={72} rx={6} {...traco} />
        <rect x={12} y={52} width={96} height={56} rx={3} {...traco} stroke="var(--tc-papel-destaque)" />
        <path d="M52 116 L46 136 M68 116 L74 136 M34 136 H86" {...traco} />
        {toque(60, 80)}
      </svg>
      <svg className="tc-aparelho tc-aparelho-3" viewBox="0 0 120 170" width={200} height={283}>
        <rect x={22} y={22} width={76} height={120} rx={11} {...traco} />
        <rect x={30} y={33} width={60} height={92} rx={3} {...traco} stroke="var(--tc-papel-destaque)" />
        <circle cx={60} cy={133} r={2.5} fill="var(--tc-papel-texto)" />
        {toque(60, 79)}
      </svg>
    </div>
  );
}

function RotuloCanhoto({ children }: { children: ReactNode }) {
  return <p className="m-0 font-cine text-[18px] font-bold uppercase tracking-[0.2em] text-tc-papel-destaque">{children}</p>;
}

export function CenaAoVivo({
  nome,
  logoUrl,
  rotuloCandidato,
  candidatos,
  urlQr,
  contagem,
  fimTexto,
  totalGeral,
  subestado,
  mostrar = TELAO_PADRAO.mostrar,
  intervaloSegundos,
  categoria = null,
}: {
  nome: string;
  logoUrl: string | null;
  /** "Curta": "Vote no seu curta". */
  rotuloCandidato: string;
  candidatos: CandidatoPalco[];
  urlQr: string;
  contagem: ReactNode | null;
  /** Quando a votação fecha, por extenso ("28 nov · 20h"). */
  fimTexto: string | null;
  totalGeral: number | null;
  subestado: SubestadoAoVivo;
  mostrar?: OpcoesTelao;
  intervaloSegundos: number;
  /** A categoria em tela no ciclo; `mensagem`: na do totem, a frase no lugar do QR Code. */
  categoria?: { nome: string; premio: string | null; soTotem: boolean; mensagem: string; posicao: { indice: number; total: number } | null } | null;
}) {
  const posicao = categoria?.posicao;
  const sobretitulo =
    subestado === "ABERTURA" ? TEXTOS_PALCO.votacaoComecou : posicao && posicao.total > 1 ? `Categoria ${posicao.indice + 1} de ${posicao.total}` : "Categoria";
  const ladoDoIngresso = categoria?.soTotem ? `totem:${categoria.mensagem}` : "online";
  return (
    <div className="telao-cine relative h-full overflow-hidden">
      <FundoSala />
      <BordasPelicula />
      <div className="absolute inset-x-24 top-[74px] bottom-[70px] grid grid-cols-[minmax(0,1fr)_520px] gap-x-[88px]">
        <div className="flex min-w-0 flex-col">
          <div className="tc-acender self-start">
            <LogoTelao nome={nome} logoUrl={logoUrl} />
          </div>
          {/* A categoria em tela: na troca, o foco sai de uma e encontra a outra. */}
          <div className="relative mt-[58px] min-h-0 flex-1">
            <Transicao chave={categoria?.nome ?? ""} meta={null} escolher={() => "FOCO"} className="size-full">
              <div className="flex items-center gap-[22px]">
                <Sobretitulo className="tc-surgir">{sobretitulo}</Sobretitulo>
                {posicao && posicao.total > 1 && (
                  <div aria-hidden className="tc-surgir flex gap-2" style={atrasoTc(100)}>
                    {Array.from({ length: posicao.total }, (_, i) => (
                      <span key={i} className={cx("block h-1.5 w-14 overflow-hidden rounded-[3px]", i < posicao.indice ? "bg-tc-luz/50" : "bg-tc-luz/18")}>
                        {i === posicao.indice && (
                          <span key={categoria?.nome} className="tc-ciclo block size-full bg-tema-primaria" style={{ "--tc-dur": `${intervaloSegundos}s` } as CSSProperties} />
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {categoria && (
                <>
                  <h1 className="tc-revelar m-0 mt-[18px] font-cine text-[88px] font-bold uppercase leading-[0.98] tracking-[-0.01em] text-balance" style={atrasoTc(150)}>
                    {categoria.nome}
                  </h1>
                  <div className="mt-[26px] flex items-center gap-6">
                    <FaixaCores className="tc-barra" style={atrasoTc(350)} />
                    {categoria.premio && (
                      <p className="tc-surgir m-0 text-[34px] font-medium text-tc-suave" style={atrasoTc(450)}>
                        {categoria.premio}
                      </p>
                    )}
                  </div>
                </>
              )}
              {subestado === "TEMPO_ESGOTADO" && (
                <p className="tc-surgir m-0 mt-6 text-[34px] font-semibold text-tc-primaria-clara">
                  {TEXTOS_PALCO.tempoEsgotado}. {TEXTOS_PALCO.aguardandoEncerramento}
                </p>
              )}
              {mostrar.candidatos && <Pelicula candidatos={candidatos} />}
            </Transicao>
          </div>
        </div>

        {/* O ingresso sai da bilheteria na entrada; entre a categoria online e a do totem, ele vira. */}
        <div className="tc-ingresso-entra self-center" style={atrasoTc(600)}>
          <Transicao chave={ladoDoIngresso} meta={null} escolher={() => "VIRAR"}>
        <div className="tc-ingresso flex flex-col rounded-[28px] bg-tc-papel text-tc-papel-texto shadow-[0_30px_70px_rgb(0_0_0/0.5)]">
          {categoria?.soTotem ? (
            <div className="flex h-[612px] flex-col items-center justify-center gap-[34px] px-[52px] pt-14 pb-11 text-center">
              <Aparelhos />
              <p className="m-0 font-cine text-[58px] font-bold leading-[1.02] text-balance">{categoria.mensagem}</p>
              <p className="m-0 -mt-3 max-w-[380px] text-[24px] leading-snug text-tc-papel-suave">A votação desta categoria é feita nos totens.</p>
            </div>
          ) : (
            <div className="flex h-[612px] flex-col items-center gap-[22px] px-[52px] pt-11 pb-9">
              <p className="m-0 self-stretch font-cine text-[42px] font-bold">Vote no seu {rotuloCandidato.toLocaleLowerCase("pt-BR")}</p>
              {mostrar.qr ? (
                <>
                  <p className="m-0 -mt-2 self-stretch text-[24px] text-tc-papel-suave">{TEXTOS_PALCO.escaneie}</p>
                  <div className="bg-white">
                    <QRCodeSVG value={urlQr} size={360} level="M" marginSize={2} bgColor="#ffffff" fgColor="#141110" role="img" aria-label="QR Code para votar" />
                  </div>
                </>
              ) : (
                <div className="flex-1" />
              )}
              {mostrar.link && <p className="m-0 text-center text-[24px] font-bold break-all text-tc-papel-destaque">{linkPorExtenso(urlQr)}</p>}
            </div>
          )}
          <div aria-hidden className="mx-10 border-t-[3px] border-dashed border-tc-papel-linha" />
          <div className="grid grid-cols-2 gap-6 px-[52px] pt-[30px] pb-10">
            {mostrar.tempo && (
              <div className="flex flex-col gap-1.5">
                <RotuloCanhoto>{subestado === "RETA_FINAL" ? TEXTOS_PALCO.retaFinal : "Termina em"}</RotuloCanhoto>
                <div className="font-cine text-[42px] font-bold leading-none tabular-nums">{subestado === "TEMPO_ESGOTADO" ? TEXTOS_PALCO.tempoEsgotado : (contagem ?? "—")}</div>
                {fimTexto && <p className="m-0 text-[20px] text-tc-papel-suave">{fimTexto}</p>}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <RotuloCanhoto>Votos</RotuloCanhoto>
              <p className="m-0 font-cine text-[42px] font-bold leading-none tabular-nums">{totalGeral === null ? "—" : formatarNumero(totalGeral)}</p>
              <p className="m-0 text-[20px] text-tc-papel-suave">{categoria?.soTotem ? "registrados" : "contabilizados"}</p>
            </div>
          </div>
        </div>
          </Transicao>
        </div>
      </div>
      <MarcaVaiVota className="right-[30px] bottom-[70px]" />
    </div>
  );
}

/** Quadros da ponta (a lista repete: o ciclo de tc-pelicula-correr é exatamente os quatro primeiros). */
const PONTA = [5, 4, 3, 2, 5, 4, 3, 2];

/** A película em pé, à direita, com a contagem de início de filme em cada quadro: enfiada no projetor na entrada, depois corre. */
function PeliculaEmPe() {
  return (
    <div aria-hidden className="absolute top-[34px] right-[220px] bottom-[34px] w-[420px] overflow-hidden">
      <div className="tc-enfiar relative size-full bg-tc-pelicula shadow-[0_0_80px_rgb(0_0_0/0.6)]" style={atrasoTc(200)}>
        <div className="tc-pelicula-correr absolute inset-x-0 -top-[200px] flex flex-col">
          {PONTA.map((n, i) => (
            <div key={i} className="grid h-[440px] flex-none grid-cols-[34px_1fr_34px]">
              <Furos quantidade={7} className="flex-col justify-around" furo="h-[18px] w-3" />
              <QuadroContagem numero={n} tamanho={352} className="my-[44px]" />
              <Furos quantidade={7} className="flex-col justify-around" furo="h-[18px] w-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Molde das telas de espera (encerrada, antes da abertura, mensagens): texto à esquerda, película em pé à direita. */
function TelaDeEspera({ nome, logoUrl, titulo, texto, rodape }: { nome: string; logoUrl: string | null; titulo: string; texto: ReactNode; rodape?: ReactNode }) {
  return (
    <div className="telao-cine relative h-full overflow-hidden">
      <FundoSala />
      <BordasPelicula />
      <div className="absolute top-[110px] bottom-[110px] left-[120px] flex w-[1060px] flex-col">
        <div className="tc-acender self-start">
          <LogoTelao nome={nome} logoUrl={logoUrl} className="h-[88px]" />
        </div>
        <h1 className="tc-revelar m-0 mt-auto font-cine text-[150px] font-bold uppercase leading-[0.94] tracking-[-0.015em] text-balance" style={atrasoTc(250)}>
          {titulo}
        </h1>
        <FaixaCores className="tc-barra mt-10 w-40" style={atrasoTc(600)} />
        {texto && (
          <div className="tc-surgir m-0 mt-[34px] max-w-[900px] text-[42px] font-medium leading-[1.3] text-tc-suave" style={atrasoTc(750)}>
            {texto}
          </div>
        )}
        {rodape && (
          <div className="tc-surgir mt-auto flex items-end gap-[72px]" style={atrasoTc(1000)}>
            {rodape}
          </div>
        )}
      </div>
      <PeliculaEmPe />
      <MarcaVaiVota className="right-[120px] bottom-[58px]" />
    </div>
  );
}

/** Um número grande da tela de espera, contando até o total quando entra. */
function Numero({ valor, legenda, cor, atraso }: { valor: number; legenda: string; cor: "primaria" | "secundaria"; atraso: number }) {
  const { entrada } = useEntradaDaCena();
  const contando = useContagemAnimada(valor, 1800, true, entrada + atraso);
  return (
    <div className="flex flex-col gap-1.5">
      <p className={cx("m-0 font-cine text-[96px] font-bold leading-none tabular-nums", cor === "primaria" ? "text-tc-primaria-clara" : "text-tc-secundaria-clara")}>
        {formatarNumero(Math.round(contando))}
      </p>
      <p className="m-0 text-[28px] font-semibold text-tc-apagado">{legenda}</p>
    </div>
  );
}

export function CenaEncerrada({
  nome,
  logoUrl,
  totalGeral,
  itens,
  categorias,
  rotuloCandidatos,
}: {
  nome: string;
  logoUrl: string | null;
  totalGeral: number | null;
  itens: number;
  categorias: number;
  /** "Curtas". */
  rotuloCandidatos: string;
}) {
  const plural = rotuloCandidatos.toLocaleLowerCase("pt-BR");
  return (
    <TelaDeEspera
      nome={nome}
      logoUrl={logoUrl}
      titulo={TEXTOS_PALCO.votacaoEncerrada}
      texto="Obrigado por votar. O resultado será revelado na cerimônia, em instantes."
      rodape={
        <>
          {totalGeral !== null && <Numero valor={totalGeral} legenda={TEXTOS_PALCO.totalVotos} cor="primaria" atraso={1000} />}
          {itens > 0 && <Numero valor={itens} legenda={categorias > 1 ? `${plural} em ${categorias} categorias` : plural} cor="secundaria" atraso={1150} />}
        </>
      }
    />
  );
}

export function CenaPreVotacao({ nome, logoUrl, chamada, contagem }: { nome: string; logoUrl: string | null; chamada: string; contagem: ReactNode | null }) {
  return (
    <TelaDeEspera
      nome={nome}
      logoUrl={logoUrl}
      titulo={chamada}
      texto={
        contagem ? (
          <span className="flex flex-col gap-2">
            <span>{TEXTOS_PALCO.comecaEm}</span>
            <span className="font-cine text-[96px] font-bold leading-none text-tc-primaria-clara tabular-nums">{contagem}</span>
          </span>
        ) : (
          "Acompanhe por aqui: a votação abre durante o evento."
        )
      }
    />
  );
}

export function CenaMensagem({ nome, logoUrl, texto }: { nome: string; logoUrl: string | null; texto: string }) {
  return <TelaDeEspera nome={nome} logoUrl={logoUrl} titulo={texto} texto="" />;
}
