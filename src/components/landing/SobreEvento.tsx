"use client";

import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { paragrafosDoSobre, temSobre } from "@/dominio/sobreEvento";
import { cx } from "@/lib/classes";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * "Sobre o evento" (demanda C2, 25/11/2026), no fim da página de todos os eventos. Sem título nem texto, nada. O **negrito** do
 * texto vira <strong> (o texto nunca é lido como HTML).
 * 24/11/2026, refeito: cartão claro de revista, com fio nas cores do tema no topo e brilhos suaves ao fundo; a foto numa moldura
 * com uma placa em degradê deslocada atrás (no estilo cinema, um quadro de película com perfurações); sobrescrito "Sobre o
 * evento", título com traço de destaque, primeiro parágrafo maior (abertura) e os demais no tom suave. Sem foto, o texto centraliza.
 * 25/11/2026: com foto, o texto contorna a foto (a partir do md); no celular, a foto vem em cima.
 */
export function SobreEvento({ cinema = false }: { cinema?: boolean }) {
  const ativo = useEventoAtivo();
  if (!ativo || !temSobre(ativo.evento)) return null;
  const { sobreTitulo, sobreTexto, sobreImagemUrl } = ativo.evento;
  const paragrafos = paragrafosDoSobre(sobreTexto);
  const titulo = sobreTitulo?.trim() || null;
  const comImagem = Boolean(sobreImagemUrl);

  return (
    <section aria-labelledby="titulo-sobre-evento" className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-fundo")}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <article className="relative isolate overflow-hidden rounded-[2rem] border border-tema-borda bg-tema-superficie shadow-xl shadow-tema-primaria/10">
          {/* Fio nas cores do tema e brilhos de fundo: só decoração. */}
          <div aria-hidden className="h-1.5 w-full bg-linear-to-r from-tema-primaria via-tema-secundaria to-tema-primaria" />
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-tema-primaria/10 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-96 rounded-full bg-tema-secundaria/10 blur-3xl" />

          {/* 25/11/2026: com foto, o texto a contorna (float em fluxo de bloco; grid ou flex deixariam um vão sob a foto quando o
              texto é longo). `flow-root` contém o float. Sem foto, a coluna centralizada. */}
          <div className={cx("p-6 sm:p-10 lg:p-14", comImagem ? "flow-root" : "grid justify-items-center text-center")}>
            {sobreImagemUrl && (
              <div className="relative mb-10 mr-3 md:float-left md:mb-8 md:mr-14 md:w-[44%] lg:mr-16 lg:w-[42%]">
                {/* Placa em degradê deslocada atrás da foto. */}
                <div
                  aria-hidden
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-linear-to-br from-tema-primaria to-tema-secundaria md:translate-x-4 md:translate-y-4"
                />
                {cinema ? (
                  <div className="relative rounded-2xl bg-cine-pelicula px-2.5 py-1 shadow-lg">
                    <Perfuracoes />
                    <ImagemCandidato
                      titulo={titulo ?? "Sobre o evento"}
                      imagemUrl={sobreImagemUrl}
                      proporcao="4/3"
                      className="rounded-md"
                      sizes="(min-width: 1152px) 26rem, (min-width: 768px) 38vw, 100vw"
                    />
                    <Perfuracoes />
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-tema-borda">
                    <ImagemCandidato
                      titulo={titulo ?? "Sobre o evento"}
                      imagemUrl={sobreImagemUrl}
                      proporcao="4/3"
                      sizes="(min-width: 1152px) 26rem, (min-width: 768px) 38vw, 100vw"
                    />
                  </div>
                )}
              </div>
            )}

            <div className={cx(comImagem ? "block" : "flex max-w-3xl flex-col items-center gap-5")}>
              <div className={cx("flex flex-col gap-3", !comImagem && "items-center", comImagem && "mb-6")}>
                <p
                  {...(titulo ? {} : { id: "titulo-sobre-evento", role: "heading", "aria-level": 2 })}
                  className={cx(
                    "inline-flex items-center gap-3 text-xs font-bold uppercase text-tema-primaria-texto",
                    cinema ? "font-cine tracking-[0.3em]" : "tracking-[0.22em]",
                  )}
                >
                  <span aria-hidden className="h-px w-8 bg-tema-primaria" />
                  Sobre o evento
                  {!comImagem && <span aria-hidden className="h-px w-8 bg-tema-primaria" />}
                </p>
                {titulo && (
                  <h2
                    id="titulo-sobre-evento"
                    className={cx(
                      "text-3xl leading-[1.1] tracking-tight text-balance text-tema-texto wrap-anywhere sm:text-4xl lg:text-5xl",
                      cinema ? "font-cine font-bold" : "font-display font-extrabold",
                    )}
                  >
                    {titulo}
                  </h2>
                )}
                <span aria-hidden className="mt-1 h-1 w-14 rounded-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
              </div>

              {/* Parágrafos em bloco (não flex): só assim as linhas passam por baixo da foto quando o texto a ultrapassa. */}
              <div className={comImagem ? "block" : "flex flex-col gap-4"}>
                {paragrafos.map((trechos, i) => (
                  <p
                    key={i}
                    className={cx(
                      "text-pretty",
                      comImagem && i > 0 && "mt-4",
                      i === 0 ? "text-lg leading-relaxed text-tema-texto sm:text-xl" : "text-base leading-relaxed text-tema-texto-suave sm:text-lg",
                    )}
                  >
                    {trechos.map((t, j) =>
                      t.negrito ? (
                        <strong key={j} className="font-bold text-tema-texto">
                          {t.texto}
                        </strong>
                      ) : (
                        <span key={j}>{t.texto}</span>
                      ),
                    )}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

/** Fileira de perfurações da película (estilo cinema). */
function Perfuracoes() {
  return (
    <div aria-hidden className="flex justify-between py-1.5">
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="h-2 w-3 rounded-[2px] bg-cine-papel/85" />
      ))}
    </div>
  );
}
