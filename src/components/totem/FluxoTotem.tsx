"use client";

import { ArrowLeft, Check, Hand, LoaderCircle, RotateCcw, Star, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { TEMPOS_TOTEM } from "@/dominio/totem";
import type { Candidato } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { TEXTOS_TOTEM } from "@/lib/textosTotem";
import { votarInfantil } from "@/servicos/totem";

// Totem (§6): toque para votar → cartazes → "Você escolheu X? Sim / Não" → sucesso → volta ao início.
// Inatividade na escolha ou na confirmação também volta ao início. Um toque confirmado = um voto (trava síncrona).

type Passo =
  | { tipo: "INICIO" }
  | { tipo: "ESCOLHA" }
  | { tipo: "CONFIRMAR"; candidatoId: string }
  | { tipo: "ENVIANDO"; candidatoId: string }
  | { tipo: "SUCESSO" }
  | { tipo: "ERRO"; candidatoId: string };

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
  dispositivoId: string;
  candidatos: Candidato[];
  rotuloCategoria: string;
  logo: ReactNode;
  logoPequeno: ReactNode;
  /** Primeiro toque: o gesto que pede a tela cheia. */
  aoComecar: () => void;
};

export function FluxoTotem({ eventoId, dispositivoId, candidatos, rotuloCategoria, logo, logoPequeno, aoComecar }: FluxoTotemProps) {
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

  async function confirmar(candidatoId: string) {
    if (enviando.current) return;
    enviando.current = true;
    setPasso({ tipo: "ENVIANDO", candidatoId });
    const r = await votarInfantil({ eventoId, dispositivoId, candidatoId });
    enviando.current = false;
    setPasso(r.ok ? { tipo: "SUCESSO" } : { tipo: "ERRO", candidatoId });
  }

  const escolhido = "candidatoId" in passo ? candidatos.find((c) => c.id === passo.candidatoId) : undefined;

  return (
    <div ref={raiz} className="flex flex-1 flex-col">
      {passo.tipo === "INICIO" && (
        <TelaInicio
          logo={logo}
          rotuloCategoria={rotuloCategoria}
          candidatos={candidatos}
          aoTocar={() => {
            aoComecar();
            setPasso({ tipo: "ESCOLHA" });
          }}
        />
      )}
      {passo.tipo === "ESCOLHA" && (
        <TelaEscolha logo={logoPequeno} candidatos={candidatos} aoEscolher={(id) => setPasso({ tipo: "CONFIRMAR", candidatoId: id })} />
      )}
      {(passo.tipo === "CONFIRMAR" || passo.tipo === "ENVIANDO") && escolhido && (
        <TelaConfirmar
          candidato={escolhido}
          enviando={passo.tipo === "ENVIANDO"}
          aoConfirmar={() => void confirmar(escolhido.id)}
          aoVoltar={() => setPasso({ tipo: "ESCOLHA" })}
        />
      )}
      {passo.tipo === "SUCESSO" && <TelaSucesso aoTocar={() => setPasso(INICIO)} />}
      {passo.tipo === "ERRO" && (
        <TelaErro
          aoTentar={escolhido ? () => setPasso({ tipo: "CONFIRMAR", candidatoId: escolhido.id }) : undefined}
          aoRecomecar={() => setPasso(INICIO)}
        />
      )}
      {/* Candidato sumiu no meio (desqualificado ou despublicado): volta para a escolha. */}
      {(passo.tipo === "CONFIRMAR" || passo.tipo === "ENVIANDO") && !escolhido && (
        <TelaEscolha logo={logoPequeno} candidatos={candidatos} aoEscolher={(id) => setPasso({ tipo: "CONFIRMAR", candidatoId: id })} />
      )}
    </div>
  );
}

function TelaInicio({
  logo,
  rotuloCategoria,
  candidatos,
  aoTocar,
}: {
  logo: ReactNode;
  rotuloCategoria: string;
  candidatos: Candidato[];
  aoTocar: () => void;
}) {
  const vitrine = candidatos.slice(0, 4);
  return (
    // O toque em qualquer ponto começa; o botão é o alvo do teclado e do leitor de tela.
    <div onClick={aoTocar} className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-8 px-6 py-10 text-center sm:gap-10">
      {logo}
      <p className="rounded-full bg-tema-secundaria px-5 py-2 text-lg font-bold uppercase tracking-wide text-tema-sobre-secundaria sm:text-xl">
        {rotuloCategoria}
      </p>
      <h1 className="max-w-4xl text-5xl font-extrabold leading-tight sm:text-7xl">{TEXTOS_TOTEM.pergunta}</h1>
      <div aria-hidden className="flex justify-center gap-3 sm:gap-5">
        {vitrine.map((c, i) => (
          <div
            key={c.id}
            className={cx(
              "w-20 overflow-hidden rounded-2xl shadow-lg ring-4 ring-tema-fundo sm:w-32",
              i % 2 === 0 ? "-rotate-6" : "translate-y-3 rotate-6",
            )}
          >
            <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} proporcao="1/1" sizes="128px" />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          aoTocar();
        }}
        className="totem-pulso inline-flex min-h-24 items-center gap-4 rounded-full bg-tema-primaria px-12 text-3xl font-extrabold text-tema-sobre-primaria shadow-xl sm:text-4xl"
      >
        <Hand aria-hidden className="size-10" />
        {TEXTOS_TOTEM.toqueParaVotar}
      </button>
    </div>
  );
}

function TelaEscolha({ logo, candidatos, aoEscolher }: { logo: ReactNode; candidatos: Candidato[]; aoEscolher: (id: string) => void }) {
  return (
    <div className="palco-entrada flex flex-1 flex-col gap-6 px-5 py-6 sm:px-10 sm:py-8">
      <header className="flex flex-col items-center gap-3 text-center">
        {logo}
        <h1 className="text-4xl font-extrabold sm:text-5xl">{TEXTOS_TOTEM.pergunta}</h1>
      </header>
      <ul className={cx("mx-auto grid w-full max-w-6xl gap-5 sm:gap-8", candidatos.length <= 4 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-3")}>
        {candidatos.map((c) => (
          <li key={c.id} className="flex">
            <button
              type="button"
              onClick={() => aoEscolher(c.id)}
              className="flex w-full flex-col overflow-hidden rounded-3xl bg-tema-superficie text-left shadow-md ring-4 ring-transparent transition active:scale-[0.97] active:ring-tema-primaria"
            >
              <ImagemCandidato titulo={c.titulo} imagemUrl={c.imagemUrl} sizes="(min-width: 1024px) 33vw, 50vw" />
              <span className="line-clamp-2 px-5 py-4 text-2xl font-bold leading-snug sm:text-3xl">{c.titulo}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
    <div className="palco-entrada flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 md:flex-row md:gap-14">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl ring-8 ring-tema-primaria md:max-w-md">
        <ImagemCandidato titulo={candidato.titulo} imagemUrl={candidato.imagemUrl} sizes="448px" />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center md:items-start md:text-left">
        <p className="text-2xl text-tema-texto-suave sm:text-3xl">{TEXTOS_TOTEM.confirmar}</p>
        <h1 className="line-clamp-3 text-4xl font-extrabold leading-tight sm:text-5xl">{candidato.titulo}?</h1>
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={enviando}
            aria-busy={enviando || undefined}
            className="inline-flex min-h-24 w-full items-center justify-center gap-3 rounded-full bg-tema-primaria px-8 text-4xl font-extrabold text-tema-sobre-primaria shadow-xl transition active:scale-[0.97] disabled:opacity-80"
          >
            {enviando ? <LoaderCircle aria-hidden className="size-10 animate-spin" /> : <Check aria-hidden className="size-11" strokeWidth={3} />}
            {enviando ? TEXTOS_TOTEM.enviando : TEXTOS_TOTEM.sim}
          </button>
          <button
            type="button"
            onClick={aoVoltar}
            disabled={enviando}
            className="inline-flex min-h-18 w-full items-center justify-center gap-3 rounded-full border-4 border-tema-texto-suave px-8 text-2xl font-bold transition active:scale-[0.97] disabled:opacity-50"
          >
            <ArrowLeft aria-hidden className="size-8" />
            {TEXTOS_TOTEM.nao}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Posições fixas dos confetes (sem aleatório na renderização). */
const CONFETES = [
  { x: 6, atraso: 0, tam: 40 },
  { x: 16, atraso: 300, tam: 28 },
  { x: 26, atraso: 120, tam: 48 },
  { x: 37, atraso: 450, tam: 32 },
  { x: 48, atraso: 60, tam: 44 },
  { x: 58, atraso: 380, tam: 30 },
  { x: 68, atraso: 200, tam: 50 },
  { x: 78, atraso: 520, tam: 34 },
  { x: 88, atraso: 90, tam: 42 },
  { x: 95, atraso: 330, tam: 26 },
];

function TelaSucesso({ aoTocar }: { aoTocar: () => void }) {
  return (
    <div onClick={aoTocar} className="relative flex flex-1 cursor-pointer flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-full">
        {CONFETES.map((c, i) => (
          <Star
            key={i}
            className={cx("totem-confete absolute bottom-0", i % 2 === 0 ? "text-tema-primaria" : "text-tema-secundaria")}
            fill="currentColor"
            style={{ left: `${c.x}%`, width: c.tam, height: c.tam, animationDelay: `${c.atraso}ms` }}
          />
        ))}
      </div>
      <span className="totem-pop flex size-40 items-center justify-center rounded-full bg-tema-primaria text-tema-sobre-primaria shadow-2xl sm:size-48">
        <Check aria-hidden className="size-24 sm:size-28" strokeWidth={3} />
      </span>
      <div role="status" className="flex flex-col gap-3">
        <h1 className="text-6xl font-extrabold sm:text-8xl">{TEXTOS_TOTEM.obrigado}</h1>
        <p className="text-2xl text-tema-texto-suave sm:text-3xl">{TEXTOS_TOTEM.votoGuardado}</p>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-3 bg-tema-superficie">
        <div className="totem-barra h-full bg-tema-primaria" style={{ animationDuration: `${TEMPOS_TOTEM.retornoMs}ms` }} />
      </div>
    </div>
  );
}

function TelaErro({ aoTentar, aoRecomecar }: { aoTentar?: () => void; aoRecomecar: () => void }) {
  return (
    <div role="alert" className="palco-entrada flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="flex size-32 items-center justify-center rounded-full bg-tema-superficie text-tema-erro">
        <TriangleAlert aria-hidden className="size-16" />
      </span>
      <h1 className="text-5xl font-extrabold sm:text-6xl">{TEXTOS_TOTEM.erroTitulo}</h1>
      <p className="text-2xl text-tema-texto-suave sm:text-3xl">{TEXTOS_TOTEM.erroCorpo}</p>
      <div className="flex w-full max-w-md flex-col gap-4">
        {aoTentar && (
          <button
            type="button"
            onClick={aoTentar}
            className="inline-flex min-h-20 items-center justify-center gap-3 rounded-full bg-tema-primaria px-8 text-3xl font-extrabold text-tema-sobre-primaria"
          >
            <RotateCcw aria-hidden className="size-8" />
            {TEXTOS_TOTEM.tentarDeNovo}
          </button>
        )}
        <button
          type="button"
          onClick={aoRecomecar}
          className="inline-flex min-h-16 items-center justify-center rounded-full border-4 border-tema-texto-suave px-8 text-2xl font-bold"
        >
          {TEXTOS_TOTEM.voltarInicio}
        </button>
      </div>
    </div>
  );
}
