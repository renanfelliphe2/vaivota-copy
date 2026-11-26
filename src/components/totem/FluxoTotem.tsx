"use client";

import { ArrowLeft, Check, Hand, LoaderCircle, RotateCcw, Star, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { novoIdEnvio, TEMPOS_TOTEM } from "@/dominio/totem";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { arranjarGradeTotem } from "@/lib/gradeTotem";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { votarInfantil } from "@/servicos/totem";
import type { GrupoTotem } from "@/store/seletores/totem";
import { AvisoTotem } from "./MolduraTotem";

// Totem (§6): toque para votar → cartazes → "É esse? Sim / Voltar" → sucesso → volta ao início.
// Inatividade na escolha ou na confirmação também volta ao início. Um toque confirmado = um voto (trava síncrona).
// Cada tentativa de voto leva uma chave aleatória (`idEnvio`). Se a rede falha, o totem não sabe se o voto chegou: o "tentar de novo"
// reenvia a MESMA chave e o servidor não conta duas vezes. A chave só passa da tela de erro para a confirmação seguinte; qualquer outro
// caminho (voltar, trocar de item, voltar ao início) descarta a chave, e o próximo voto, de outra criança, nasce com uma nova.
//
// 26/11/2026: refeito no estilo cinema do Festival, claro (MolduraTotem): película com os cartazes na abertura, cartazes em moldura de
// papel na escolha, letras de cartaz (Arvo). Tudo medido pelo tamanho do totem (cqh/cqw/cqmin) e a grade calcula o tamanho dos cartões
// para caber inteira (lib/gradeTotem.ts): o aparelho fica parado, sem rolagem. Os cartazes aparecem inteiros, sem corte, e os textos
// são poucos: a criança escolhe pela imagem.

type Passo =
  | { tipo: "INICIO" }
  | { tipo: "ESCOLHA" }
  /** `idEnvio` só existe na confirmação que veio de "tentar de novo". */
  | { tipo: "CONFIRMAR"; candidatoId: string; idEnvio?: string }
  | { tipo: "ENVIANDO"; candidatoId: string; idEnvio: string }
  | { tipo: "SUCESSO" }
  | { tipo: "ERRO"; candidatoId: string; idEnvio: string };

const INICIO: Passo = { tipo: "INICIO" };

/** Quanto tempo cada passo espera antes de voltar ao início; null = não volta sozinho. */
function limiteDoPasso(passo: Passo["tipo"]): number | null {
  if (passo === "SUCESSO") return TEMPOS_TOTEM.retornoMs;
  if (passo === "ERRO") return TEMPOS_TOTEM.erroMs;
  if (passo === "ESCOLHA" || passo === "CONFIRMAR") return TEMPOS_TOTEM.inatividadeMs;
  return null;
}

export type FluxoTotemProps = {
  eventoId: string;
  candidatos: Candidato[];
  /** Os itens por categoria (25/11/2026): com mais de uma, a escolha mostra o nome de cada uma acima dos seus itens. */
  grupos: GrupoTotem[];
  logo: ReactNode;
  logoPequeno: ReactNode;
  /** Primeiro toque: o gesto que pede a tela cheia. */
  aoComecar: () => void;
  /** Voto recusado ou sem rede: quem monta confere de novo o aparelho e o evento (pausa, revogação, urna encerrada). */
  aoFalhar: () => void;
  /**
   * Quem registra o voto. Sem ela, o voto vai ao servidor (o totem de verdade). O preview do admin (página Totens) passa uma que
   * não chama servidor nenhum: lá nada é contado.
   */
  registrar?: typeof votarInfantil;
};

export function FluxoTotem({ eventoId, candidatos, grupos, logo, logoPequeno, aoComecar, aoFalhar, registrar = votarInfantil }: FluxoTotemProps) {
  const [passo, setPasso] = useState<Passo>(INICIO);
  const enviando = useRef(false);
  const raiz = useRef<HTMLDivElement>(null);

  // Retorno automático; na escolha e na confirmação, cada toque reinicia a contagem de inatividade.
  useEffect(() => {
    const limite = limiteDoPasso(passo.tipo);
    if (limite === null) return;
    let timer = setTimeout(() => setPasso(INICIO), limite);
    const rearmar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setPasso(INICIO), limite);
    };
    const el = raiz.current;
    const contaToque = passo.tipo === "ESCOLHA" || passo.tipo === "CONFIRMAR";
    if (contaToque) el?.addEventListener("pointerdown", rearmar);
    return () => {
      clearTimeout(timer);
      if (contaToque) el?.removeEventListener("pointerdown", rearmar);
    };
  }, [passo.tipo]);

  async function confirmar(candidatoId: string, idEnvioAnterior?: string) {
    if (enviando.current) return;
    enviando.current = true;
    const idEnvio = idEnvioAnterior ?? novoIdEnvio();
    setPasso({ tipo: "ENVIANDO", candidatoId, idEnvio });
    const r = await registrar({ eventoId, candidatoId, idEnvio });
    enviando.current = false;
    if (!r.ok) aoFalhar();
    setPasso(r.ok ? { tipo: "SUCESSO" } : { tipo: "ERRO", candidatoId, idEnvio });
  }

  const escolhido = "candidatoId" in passo ? candidatos.find((c) => c.id === passo.candidatoId) : undefined;

  return (
    <div ref={raiz} className="flex min-h-0 flex-1 flex-col">
      {passo.tipo === "INICIO" && (
        <TelaInicio
          logo={logo}
          candidatos={candidatos}
          aoTocar={() => {
            aoComecar();
            setPasso({ tipo: "ESCOLHA" });
          }}
        />
      )}
      {passo.tipo === "ESCOLHA" && (
        <TelaEscolha logo={logoPequeno} grupos={grupos} aoEscolher={(id) => setPasso({ tipo: "CONFIRMAR", candidatoId: id })} />
      )}
      {(passo.tipo === "CONFIRMAR" || passo.tipo === "ENVIANDO") && escolhido && (
        <TelaConfirmar
          candidato={escolhido}
          enviando={passo.tipo === "ENVIANDO"}
          aoConfirmar={() => void confirmar(escolhido.id, passo.tipo === "CONFIRMAR" ? passo.idEnvio : undefined)}
          aoVoltar={() => setPasso({ tipo: "ESCOLHA" })}
        />
      )}
      {passo.tipo === "SUCESSO" && <TelaSucesso aoTocar={() => setPasso(INICIO)} />}
      {passo.tipo === "ERRO" && (
        <TelaErro
          aoTentar={escolhido ? () => setPasso({ tipo: "CONFIRMAR", candidatoId: escolhido.id, idEnvio: passo.idEnvio }) : undefined}
          aoRecomecar={() => setPasso(INICIO)}
        />
      )}
      {/* Candidato sumiu no meio (desqualificado ou despublicado): volta para a escolha. */}
      {(passo.tipo === "CONFIRMAR" || passo.tipo === "ENVIANDO") && !escolhido && (
        <TelaEscolha logo={logoPequeno} grupos={grupos} aoEscolher={(id) => setPasso({ tipo: "CONFIRMAR", candidatoId: id })} />
      )}
    </div>
  );
}

/** Quantos cartazes a película da abertura mostra. */
const CARTAZES_DA_ABERTURA = 5;

/**
 * Abertura: o logo, uma película com os cartazes (como a do hero da página do evento, mas na cor do tema) e um botão só. Sem
 * frase: a criança vê os filmes e toca.
 */
function TelaInicio({ logo, candidatos, aoTocar }: { logo: ReactNode; candidatos: Candidato[]; aoTocar: () => void }) {
  const vitrine = candidatos.slice(0, CARTAZES_DA_ABERTURA);
  const n = Math.max(1, vitrine.length);
  // Cada cartaz: o maior que couber na altura reservada (32cqh) e na largura da fita (até 86cqw para todos).
  const larguraCartaz = `min(calc(32cqh * 5 / 7), calc((86cqw - ${n - 1} * 1.6cqmin) / ${n}))`;
  return (
    // O toque em qualquer ponto começa; o botão é o alvo do teclado e do leitor de tela.
    <div onClick={aoTocar} className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-[4cqh] px-[4cqw] py-[3cqh] text-center">
      <h1 className="sr-only">{TEXTOS_TOTEM.pergunta}</h1>
      <div className="marca-subir shrink-0">{logo}</div>
      <div aria-hidden className="marca-subir relative shrink-0 -rotate-2 bg-tema-primaria py-[1.125rem] shadow-xl shadow-black/15" style={{ "--atraso": "120ms" } as CSSProperties}>
        <span className="cine-furos-h absolute inset-x-0 top-0 h-[1.125rem]" />
        <span className="cine-furos-h absolute inset-x-0 bottom-0 h-[1.125rem]" />
        <ul className="flex gap-[1.6cqmin] px-[1.6cqmin]">
          {vitrine.map((c, i) => (
            <li
              key={c.id}
              className="marca-flutuar overflow-hidden rounded-[0.6cqmin] bg-tema-fundo"
              style={{ width: larguraCartaz, "--dur": `${6 + i}s`, "--atraso": `${-i * 900}ms`, "--amplitude": i % 2 === 0 ? "-6px" : "6px" } as CSSProperties}
            >
              <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="5/7" ajuste="conter" sizes="16rem" />
            </li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          aoTocar();
        }}
        className="totem-pulso inline-flex min-h-[clamp(3.5rem,13cqh,7rem)] max-w-full shrink-0 items-center justify-center gap-[0.4em] rounded-full bg-tema-primaria px-[1.3em] font-cine text-[clamp(1.4rem,5.5cqmin,3.25rem)] font-bold text-tema-sobre-primaria shadow-xl shadow-black/15"
      >
        <Hand aria-hidden className="size-[1.15em] shrink-0" />
        {TEXTOS_TOTEM.toqueParaVotar}
      </button>
    </div>
  );
}

/** Mede um elemento (px) e acompanha as mudanças de tamanho: rotação do tablet, janela, preview. */
function useMedida(ref: RefObject<HTMLElement | null>): { largura: number; altura: number } | null {
  const [medida, setMedida] = useState<{ largura: number; altura: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observador = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect;
      setMedida({ largura: Math.floor(width), altura: Math.floor(height) });
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [ref]);
  return medida;
}

function TelaEscolha({ logo, grupos, aoEscolher }: { logo: ReactNode; grupos: GrupoTotem[]; aoEscolher: (id: string) => void }) {
  return (
    <div className="palco-entrada flex min-h-0 flex-1 flex-col gap-[2.5cqh] px-[4cqw] pb-[3cqh] pt-[2.5cqh]">
      <header className="flex shrink-0 flex-wrap items-center justify-center gap-x-[3cqw] gap-y-[1cqh] px-10 text-center">
        {logo}
        <h1 className="text-balance font-cine text-[clamp(1.4rem,5cqmin,3.25rem)] font-bold leading-tight">{TEXTOS_TOTEM.pergunta}</h1>
      </header>
      <GradeEscolha grupos={grupos} aoEscolher={aoEscolher} />
    </div>
  );
}

/**
 * Os cartões ocupam a área que sobra abaixo do cabeçalho: mede a área e escolhe o número de colunas que deixa os cartões maiores
 * sem passar da altura (lib/gradeTotem.ts). Só em área pequena demais (abaixo do mínimo do cartão) a área rola.
 */
function GradeEscolha({ grupos, aoEscolher }: { grupos: GrupoTotem[]; aoEscolher: (id: string) => void }) {
  const area = useRef<HTMLDivElement>(null);
  const medida = useMedida(area);
  const varias = grupos.length > 1;
  const lado = medida ? Math.min(medida.largura, medida.altura) : 0;
  const espaco = Math.round(Math.min(28, Math.max(8, lado * 0.03)));
  const alturaTitulo = Math.round(Math.min(44, Math.max(22, lado * 0.06)));
  const arranjo = medida
    ? arranjarGradeTotem({ largura: medida.largura, altura: medida.altura, grupos: grupos.map((g) => g.itens.length), espaco, alturaTitulo })
    : null;
  const larguraLinha = arranjo ? arranjo.colunas * arranjo.larguraCartao + (arranjo.colunas - 1) * espaco : 0;

  return (
    <div ref={area} className="relative min-h-0 flex-1">
      {arranjo && (
        <div className="absolute inset-0 flex overflow-y-auto overscroll-none">
          <div className="m-auto flex flex-col items-center" style={{ gap: espaco }}>
            {grupos.map(({ categoria, itens }) => (
              <section key={categoria.id} aria-label={varias ? categoria.nome : undefined} className="flex flex-col items-center" style={{ gap: espaco }}>
                {varias && (
                  <h2
                    className="flex items-center gap-3 font-cine font-bold"
                    style={{ height: alturaTitulo, fontSize: Math.round(alturaTitulo * 0.7), maxWidth: larguraLinha }}
                  >
                    <span aria-hidden className="flex h-1.5 w-8 shrink-0 overflow-hidden rounded-full">
                      <span className="flex-1 bg-tema-primaria" />
                      <span className="flex-1 bg-tema-secundaria" />
                    </span>
                    <span className="truncate">{categoria.nome}</span>
                  </h2>
                )}
                <ul className="flex flex-wrap justify-center" style={{ gap: espaco, width: larguraLinha }}>
                  {itens.map((c, i) => (
                    <CartaoTotem key={c.id} candidato={c} largura={arranjo.larguraCartao} inclinado={i % 2 === 1} aoEscolher={aoEscolher} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Cartaz em moldura de papel, com o título em letras de cartaz embaixo. Tudo em cqw do próprio cartão, para a altura ser sempre
 * RAZAO_CARTAO_TOTEM × largura: moldura 4 + cartaz 92 × 7/5 + 3 + título 22 + 4 = 161,8 (de 164). A imagem aparece inteira.
 */
function CartaoTotem({
  candidato,
  largura,
  inclinado,
  aoEscolher,
}: {
  candidato: Candidato;
  largura: number;
  inclinado: boolean;
  aoEscolher: (id: string) => void;
}) {
  return (
    <li className="@container flex" style={{ width: largura }}>
      <button
        type="button"
        onClick={() => aoEscolher(candidato.id)}
        className={cx(
          "flex w-full flex-col rounded-[6cqw] bg-tema-fundo p-[4cqw] shadow-lg shadow-black/10 ring-1 ring-black/5 transition duration-150 active:scale-95 active:shadow-xl active:ring-[3cqw] active:ring-tema-primaria",
          inclinado ? "rotate-1" : "-rotate-1",
        )}
      >
        <ImagemCandidato
          titulo={candidato.titulo}
          imagemUrl={candidato.imagemUrl}
          proporcao="5/7"
          ajuste="conter"
          sizes={`${largura}px`}
          className="w-full rounded-[3cqw]"
        />
        <span className="mt-[3cqw] flex h-[22cqw] items-center justify-center text-center font-cine text-[9.5cqw] font-bold leading-[1.15]">
          <span className="line-clamp-2 wrap-anywhere">{candidato.titulo}</span>
        </span>
      </button>
    </li>
  );
}

/** "É esse?": o cartaz grande e inteiro, o título e dois botões. Deitado, lado a lado; em pé, um embaixo do outro. */
function TelaConfirmar({
  candidato,
  enviando,
  aoConfirmar,
  aoVoltar,
}: {
  candidato: Candidato;
  enviando: boolean;
  aoConfirmar: () => void;
  aoVoltar: () => void;
}) {
  return (
    <div className="palco-entrada flex min-h-0 flex-1 flex-col items-center justify-center gap-[3cqh] px-[6cqw] py-[3cqh] totem-deitado:flex-row totem-deitado:gap-[6cqw]">
      <div className="w-[min(calc(42cqh*5/7),76cqw)] shrink-0 -rotate-2 rounded-[2.5cqmin] bg-tema-fundo p-[1.5cqmin] shadow-2xl shadow-black/15 ring-[0.8cqmin] ring-tema-primaria totem-deitado:w-[min(calc(66cqh*5/7),40cqw)]">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} proporcao="5/7" ajuste="conter" sizes="32rem" className="w-full rounded-[1.5cqmin]" />
      </div>
      <div className="flex w-full max-w-[min(34rem,86cqw)] flex-col items-center gap-[3cqh] text-center totem-deitado:max-w-[44cqw] totem-deitado:items-start totem-deitado:text-left">
        <h1 className="flex max-w-full flex-col gap-[1cqh]">
          <span className="font-cine text-[clamp(1.75rem,8cqmin,4.5rem)] font-bold leading-none text-tema-primaria-texto">{TEXTOS_TOTEM.confirmar}</span>
          <span className="line-clamp-2 text-[clamp(1.1rem,3.6cqmin,2.1rem)] font-semibold leading-tight text-tema-texto-suave wrap-anywhere">
            {candidato.titulo}
          </span>
        </h1>
        <div className="flex w-full flex-col gap-[2cqh]">
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={enviando}
            aria-busy={enviando || undefined}
            className="inline-flex min-h-[clamp(3.75rem,14cqmin,7.5rem)] w-full items-center justify-center gap-[0.35em] rounded-full bg-tema-primaria px-6 font-cine text-[clamp(1.6rem,6cqmin,3.5rem)] font-bold text-tema-sobre-primaria shadow-xl shadow-black/15 transition active:scale-[0.97] disabled:opacity-80"
          >
            {enviando ? <LoaderCircle aria-hidden className="size-[1em] animate-spin" /> : <Check aria-hidden className="size-[1.1em]" strokeWidth={3} />}
            {enviando ? TEXTOS_TOTEM.enviando : TEXTOS_TOTEM.sim}
          </button>
          <button
            type="button"
            onClick={aoVoltar}
            disabled={enviando}
            className="inline-flex min-h-[clamp(3.25rem,10cqmin,5.5rem)] w-full items-center justify-center gap-[0.35em] rounded-full border-[clamp(3px,0.6cqmin,5px)] border-tema-texto-suave bg-tema-fundo/70 px-6 text-[clamp(1.15rem,4cqmin,2.25rem)] font-bold transition active:scale-[0.97] disabled:opacity-50"
          >
            <ArrowLeft aria-hidden className="size-[1.1em]" />
            {TEXTOS_TOTEM.nao}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Posições fixas dos confetes (sem aleatório na renderização); o tamanho é em centésimos do lado menor do totem. */
const CONFETES = [
  { x: 6, atraso: 0, tam: 5.2 },
  { x: 16, atraso: 300, tam: 3.6 },
  { x: 26, atraso: 120, tam: 6.2 },
  { x: 37, atraso: 450, tam: 4.2 },
  { x: 48, atraso: 60, tam: 5.7 },
  { x: 58, atraso: 380, tam: 3.9 },
  { x: 68, atraso: 200, tam: 6.5 },
  { x: 78, atraso: 520, tam: 4.4 },
  { x: 88, atraso: 90, tam: 5.5 },
  { x: 95, atraso: 330, tam: 3.4 },
];

function TelaSucesso({ aoTocar }: { aoTocar: () => void }) {
  return (
    <div onClick={aoTocar} className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-[4cqh] overflow-hidden px-[6cqw] text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {CONFETES.map((c, i) => (
          <Star
            key={i}
            className={cx("totem-confete absolute bottom-0", i % 2 === 0 ? "text-tema-primaria" : "text-tema-secundaria")}
            fill="currentColor"
            style={{ left: `${c.x}%`, width: `${c.tam}cqmin`, height: `${c.tam}cqmin`, animationDelay: `${c.atraso}ms` }}
          />
        ))}
      </div>
      <span className="totem-pop flex size-[clamp(6rem,30cqmin,14rem)] items-center justify-center rounded-full bg-tema-primaria text-tema-sobre-primaria shadow-2xl shadow-black/20 ring-[1.5cqmin] ring-tema-fundo">
        <Check aria-hidden className="size-3/5" strokeWidth={3} />
      </span>
      <div role="status" className="flex flex-col gap-[1.5cqh]">
        <h1 className="font-cine text-[clamp(2.5rem,12cqmin,7rem)] font-bold leading-none">{TEXTOS_TOTEM.obrigado}</h1>
        <p className="text-[clamp(1.2rem,4.5cqmin,2.5rem)] font-semibold text-tema-texto-suave">{TEXTOS_TOTEM.votoGuardado}</p>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-2 bg-tema-fundo/70">
        <div className="totem-barra h-full bg-tema-primaria" style={{ animationDuration: `${TEMPOS_TOTEM.retornoMs}ms` }} />
      </div>
    </div>
  );
}

function TelaErro({ aoTentar, aoRecomecar }: { aoTentar?: () => void; aoRecomecar: () => void }) {
  return (
    <AvisoTotem papel="alert" tom="erro" icone={<TriangleAlert aria-hidden />} titulo={TEXTOS_TOTEM.erroTitulo} corpo={TEXTOS_TOTEM.erroCorpo}>
      <div className="mt-[1cqh] flex w-full max-w-[min(30rem,86cqw)] flex-col gap-[2cqh]">
        {aoTentar && (
          <button
            type="button"
            onClick={aoTentar}
            className="inline-flex min-h-[clamp(3.5rem,12cqmin,6rem)] items-center justify-center gap-[0.35em] rounded-full bg-tema-primaria px-6 font-cine text-[clamp(1.35rem,5cqmin,2.75rem)] font-bold text-tema-sobre-primaria shadow-xl shadow-black/15"
          >
            <RotateCcw aria-hidden className="size-[1em]" />
            {TEXTOS_TOTEM.tentarDeNovo}
          </button>
        )}
        <button
          type="button"
          onClick={aoRecomecar}
          className="inline-flex min-h-[clamp(3.25rem,10cqmin,5rem)] items-center justify-center rounded-full border-[clamp(3px,0.6cqmin,5px)] border-tema-texto-suave bg-tema-fundo/70 px-6 text-[clamp(1.1rem,3.8cqmin,2rem)] font-bold"
        >
          {TEXTOS_TOTEM.voltarInicio}
        </button>
      </div>
    </AvisoTotem>
  );
}
