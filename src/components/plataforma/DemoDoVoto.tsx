"use client";

import { ChevronRight, Lock, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { cx } from "@/lib/classes";
import { origemDoClique, TEMA_VAIVOTA, useTemaDaLanding, useVotacoesRealizadas } from "./TemaDaLanding";

// Demonstração do voto na abertura da landing (07/11/2026): o celular funciona de verdade, com os passos e os textos da
// tela de votação (escolher, "Revise seu voto", "Seu voto foi registrado"), mas nada sai do navegador. Veste o tema da
// página e, com o tema de um evento, usa o nome dele e o rótulo dos candidatos ("Curta", "Projeto").

type Passo = "escolher" | "revisar" | "registrado";

const OPCOES = [
  { id: "aurora", titulo: "Aurora", capa: "from-vv-destaque to-tema-primaria" },
  { id: "mare-alta", titulo: "Maré Alta", capa: "from-tema-secundaria to-vv-destaque" },
  { id: "ventania", titulo: "Ventania", capa: "from-tema-primaria to-tema-secundaria" },
];

const VOTOS_POR_MINUTO = [28, 40, 34, 58, 50, 72, 64, 88, 76, 62];

const PODIO = [
  { lugar: 2, altura: "h-7", cor: "bg-vv-destaque/70" },
  { lugar: 1, altura: "h-11", cor: "bg-tema-secundaria" },
  { lugar: 3, altura: "h-5", cor: "bg-tema-primaria/60" },
];

/** Confetes do voto registrado: posições fixas em volta do selo (sem aleatório, para o servidor e o navegador baterem). */
const CONFETES = Array.from({ length: 14 }, (_, i) => {
  const angulo = (i / 14) * Math.PI * 2;
  const raio = 62 + (i % 3) * 16;
  return {
    x: `${Math.round(Math.cos(angulo) * raio)}px`,
    y: `${Math.round(Math.sin(angulo) * raio)}px`,
    giro: `${(i * 67) % 360}deg`,
    cor: ["bg-tema-secundaria", "bg-vv-destaque", "bg-tema-primaria"][i % 3],
    forma: i % 2 ? "h-2.5 w-1 rounded-sm" : "size-1.5 rounded-full",
  };
});

const estilo = (variaveis: Record<string, string>) => variaveis as CSSProperties;

export function DemoDoVoto() {
  const { evento } = useTemaDaLanding();
  const rotulo = evento?.rotuloCandidato.trim() || "Curta";
  const rotuloMinusculo = rotulo.toLocaleLowerCase("pt-BR");
  const [passo, setPasso] = useState<Passo>("escolher");
  const [escolha, setEscolha] = useState<string | null>(null);
  const [votos, setVotos] = useState(0);
  const anunciar = useAnunciar();
  const titulo = useRef<HTMLHeadingElement>(null);
  const interagiu = useRef(false);
  const idPergunta = useId();

  // Quem usa teclado ou leitor de tela acompanha a troca de passo: o foco vai para o título do passo novo.
  useEffect(() => {
    if (interagiu.current) titulo.current?.focus({ preventScroll: true });
  }, [passo]);

  const escolhida = OPCOES.find((o) => o.id === escolha) ?? OPCOES[0];

  const ir = (novo: Passo) => {
    interagiu.current = true;
    setPasso(novo);
  };
  const escolher = (id: string) => {
    setEscolha(id);
    ir("revisar");
  };
  const confirmar = () => {
    setVotos((n) => n + 1);
    ir("registrado");
    anunciar("Demonstração: voto registrado. Nenhum voto de verdade foi enviado.");
  };

  return (
    <figure id="demonstracao" className="mx-auto flex w-full max-w-[24rem] flex-col items-center">
      {/* Folga em cima e embaixo: os cartões flutuantes ficam sobre a moldura, longe da tela que se toca. */}
      <div className="relative w-full pb-14 pt-10">
        <div aria-hidden className="vv-ondas absolute -inset-16 -z-10" />

        <div className="relative mx-auto w-60 rounded-[2.75rem] bg-tema-primaria p-2 shadow-2xl shadow-tema-primaria/30 sm:w-64">
          <div className="overflow-hidden rounded-[2.25rem] bg-tema-fundo">
            <div aria-hidden className="flex items-center justify-between px-6 pb-1 pt-3 text-[10px] font-semibold">
              <span>20:41</span>
              <span className="h-4 w-16 rounded-full bg-tema-primaria" />
              <span className="flex items-end gap-0.5">
                {[1, 2, 3].map((n) => (
                  <span key={n} className="w-0.5 rounded-full bg-tema-texto" style={{ height: `${n * 3 + 2}px` }} />
                ))}
              </span>
            </div>

            <div className="h-[23.5rem]">
              {passo === "escolher" && (
                <div key="escolher" className="vv-tela flex h-full flex-col">
                  <div className="mx-3 mt-2 rounded-2xl bg-linear-to-br from-tema-primaria via-tema-primaria to-vv-destaque px-4 py-3 text-tema-sobre-primaria">
                    <p className="flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-wider opacity-90">
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-tema-secundaria" />
                      {evento ? evento.nome : "Votação aberta"}
                    </p>
                    <h3 ref={titulo} id={idPergunta} tabIndex={-1} className="mt-0.5 text-[15px] font-bold leading-tight">
                      Qual {rotuloMinusculo} merece o prêmio?
                    </h3>
                  </div>
                  <ul aria-labelledby={idPergunta} className="flex flex-col gap-2 p-3">
                    {OPCOES.map((o) => (
                      <li key={o.id}>
                        <button
                          type="button"
                          onClick={() => escolher(o.id)}
                          aria-label={`Votar em ${o.titulo}`}
                          className="group flex w-full items-center gap-3 rounded-2xl p-2 text-left ring-1 ring-tema-borda transition hover:bg-vv-ceu hover:ring-2 hover:ring-vv-destaque"
                        >
                          <span aria-hidden className={cx("size-11 shrink-0 rounded-xl bg-linear-to-br", o.capa)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold">{o.titulo}</span>
                            <span className="block text-[11px] text-tema-texto-suave">{rotulo}</span>
                          </span>
                          <span
                            aria-hidden
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-tema-superficie py-1 pl-2.5 pr-1.5 text-[11px] font-bold transition group-hover:bg-vv-destaque group-hover:text-vv-sobre-destaque"
                          >
                            Votar
                            <ChevronRight className="size-3.5" />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto px-5 pb-4 text-center text-[11px] leading-snug text-tema-texto-suave">
                    Toque em um {rotuloMinusculo} para votar. É só uma demonstração.
                  </p>
                </div>
              )}

              {passo === "revisar" && (
                <div key="revisar" className="vv-tela flex h-full flex-col px-3 pb-4 pt-3">
                  <h3 ref={titulo} tabIndex={-1} className="px-1 text-[15px] font-bold">
                    Revise seu voto
                  </h3>
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-tema-superficie p-3 ring-1 ring-tema-borda">
                    <span aria-hidden className={cx("size-16 shrink-0 rounded-xl bg-linear-to-br", escolhida.capa)} />
                    <span className="min-w-0">
                      <span className="block text-[11px] text-tema-texto-suave">Você está votando em</span>
                      <span className="block truncate text-lg font-bold leading-tight">{escolhida.titulo}</span>
                      <span className="block text-[11px] text-tema-texto-suave">{rotulo}</span>
                    </span>
                  </div>
                  <p className="mt-3 flex gap-1.5 px-1 text-[11px] leading-snug text-tema-texto-suave">
                    <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
                    Seu voto é secreto: ele não fica ligado ao seu nome.
                  </p>
                  <p className="mt-2 px-1 text-[11px] font-semibold leading-snug">Depois de confirmar, não será possível alterar nem desfazer o voto.</p>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={confirmar}
                      className="flex h-10 items-center justify-center rounded-full bg-tema-primaria text-[13px] font-semibold text-tema-sobre-primaria transition hover:opacity-90"
                    >
                      Confirmar voto
                    </button>
                    <button
                      type="button"
                      onClick={() => ir("escolher")}
                      className="flex h-10 items-center justify-center rounded-full text-[13px] font-semibold text-tema-texto-suave transition hover:bg-tema-superficie hover:text-tema-texto"
                    >
                      Trocar
                    </button>
                  </div>
                </div>
              )}

              {passo === "registrado" && (
                <div key="registrado" className="vv-tela flex h-full flex-col items-center justify-center px-5 text-center">
                  <div aria-hidden className="relative">
                    <svg viewBox="0 0 64 64" className="vv-estalo size-20 text-tema-sucesso">
                      <circle cx="32" cy="32" r="30" fill="currentColor" />
                      <path
                        d="M19 33 L28 42 L45 23"
                        pathLength={1}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="vv-tracar"
                      />
                    </svg>
                    {CONFETES.map((c, i) => (
                      <span key={i} className={cx("vv-confete", c.cor, c.forma)} style={estilo({ "--x": c.x, "--y": c.y, "--giro": c.giro })} />
                    ))}
                  </div>
                  <h3 ref={titulo} tabIndex={-1} className="mt-5 text-lg font-bold leading-tight">
                    Seu voto foi registrado
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-snug text-tema-texto-suave">Obrigado por participar! O resultado será divulgado pela organização.</p>
                  <p className="mt-4 rounded-full bg-tema-superficie px-3 py-1 text-[10px] font-semibold text-tema-texto-suave">
                    Demonstração: nenhum voto foi enviado
                  </p>
                  <button
                    type="button"
                    onClick={() => ir("escolher")}
                    className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold ring-1 ring-tema-borda transition hover:bg-tema-superficie"
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    Votar de novo
                  </button>
                </div>
              )}
            </div>

            <div aria-hidden className="flex h-6 items-center justify-center">
              <span className="h-1 w-24 rounded-full bg-tema-texto/25" />
            </div>
          </div>
        </div>

        {/* Ao vivo e pódio: decorativos, sobre a moldura do celular (nunca sobre os botões). */}
        <div
          aria-hidden
          className="vv-flutuar pointer-events-none absolute left-0 top-1 w-36 rounded-2xl bg-tema-fundo p-3 shadow-xl shadow-tema-primaria/15 ring-1 ring-tema-borda"
          style={estilo({ "--dur": "7s", "--atraso": "-2s" })}
        >
          <p className="flex items-center gap-1.5 text-[11px] font-bold">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-tema-sucesso opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-tema-sucesso" />
            </span>
            Ao vivo
            {votos > 0 && (
              <span key={votos} className="vv-estalo ml-auto rounded-full bg-tema-sucesso px-1.5 py-px text-[10px] text-white">
                +1
              </span>
            )}
          </p>
          <div className="mt-2 flex h-10 items-end gap-1">
            {VOTOS_POR_MINUTO.map((altura, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-sm bg-vv-destaque transition-[height] duration-500"
                style={{ height: `${i === VOTOS_POR_MINUTO.length - 1 ? Math.min(100, altura + votos * 12) : altura}%` }}
              />
            ))}
          </div>
        </div>

        <div
          aria-hidden
          className="vv-flutuar pointer-events-none absolute bottom-1 right-1 flex flex-col items-center gap-1.5 rounded-2xl bg-tema-fundo px-4 pb-3 pt-2.5 shadow-xl shadow-tema-primaria/15 ring-1 ring-tema-borda"
          style={estilo({ "--dur": "8s", "--atraso": "-4s" })}
        >
          <Trophy className="size-5 text-tema-secundaria-texto" />
          <span className="flex items-end gap-1">
            {PODIO.map(({ lugar, altura, cor }) => (
              <span key={lugar} className={cx("w-6 rounded-t-md", altura, cor)} />
            ))}
          </span>
        </div>
      </div>

      <figcaption className="sr-only">Demonstração do voto pelo celular. Nenhum voto é enviado.</figcaption>
      <BotoesDeTema />
    </figure>
  );
}

const MAXIMO_DE_EVENTOS = 3;

/** "Veja esta página com a cara de": atalho da vitrine na abertura (VaiVota e as votações mais recentes). */
function BotoesDeTema() {
  const votacoes = useVotacoesRealizadas();
  const { evento, aplicar } = useTemaDaLanding();
  const idRotulo = useId();
  if (votacoes.length === 0) return null;

  const opcoes = [
    { slug: null, nome: "VaiVota", cores: [TEMA_VAIVOTA.corPrimaria, TEMA_VAIVOTA.corSecundaria] },
    ...votacoes.slice(0, MAXIMO_DE_EVENTOS).map((v) => ({ slug: v.evento.slug, nome: v.nome, cores: [v.tema.corPrimaria, v.tema.corSecundaria] })),
  ];

  return (
    <div className="mt-2 flex w-full flex-col items-center gap-2.5">
      <p id={idRotulo} className="text-sm font-semibold text-tema-texto-suave">
        Veja esta página com a cara de:
      </p>
      <div role="group" aria-labelledby={idRotulo} className="flex flex-wrap justify-center gap-2">
        {opcoes.map((o) => {
          const ativo = (evento?.slug ?? null) === o.slug;
          return (
            <button
              key={o.slug ?? "vaivota"}
              type="button"
              aria-pressed={ativo}
              onClick={(e) => aplicar(o.slug, origemDoClique(e))}
              className={cx(
                "inline-flex min-h-10 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-semibold transition",
                ativo ? "bg-tema-texto text-tema-fundo" : "bg-tema-fundo ring-1 ring-tema-borda hover:ring-tema-texto-suave",
              )}
            >
              <span aria-hidden className="flex">
                {o.cores.map((cor, i) => (
                  <span key={i} className="-ml-1.5 size-6 rounded-full ring-2 ring-tema-fundo first:ml-0" style={{ backgroundColor: cor }} />
                ))}
              </span>
              {o.nome}
            </button>
          );
        })}
        {votacoes.length > MAXIMO_DE_EVENTOS && (
          <a href="#identidade" className="inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-tema-texto-suave underline underline-offset-2 hover:text-tema-texto">
            Ver todas
          </a>
        )}
      </div>
    </div>
  );
}
