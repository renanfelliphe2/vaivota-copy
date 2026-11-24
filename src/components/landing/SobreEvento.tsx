"use client";

import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { paragrafosDoSobre, temSobre } from "@/dominio/sobreEvento";
import { cx } from "@/lib/classes";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * "Sobre o evento" (demanda C2, 25/11/2026), no fim da página de todos os eventos: um cartão na cor do tema, imagem à esquerda e
 * título e texto à direita; no celular, a imagem vem em cima. Sem título nem texto, nada. O **negrito** do texto vira <strong>
 * (o texto nunca é lido como HTML).
 */
export function SobreEvento({ cinema = false }: { cinema?: boolean }) {
  const ativo = useEventoAtivo();
  if (!ativo || !temSobre(ativo.evento)) return null;
  const { sobreTitulo, sobreTexto, sobreImagemUrl } = ativo.evento;
  const paragrafos = paragrafosDoSobre(sobreTexto);
  const titulo = sobreTitulo?.trim() || null;

  return (
    <section aria-labelledby={titulo ? "titulo-sobre-evento" : undefined} aria-label={titulo ? undefined : "Sobre o evento"} className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-fundo")}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div
          className={cx(
            "grid overflow-hidden rounded-3xl bg-tema-primaria text-tema-sobre-primaria shadow-xl shadow-tema-primaria/20",
            sobreImagemUrl && "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
          )}
        >
          {sobreImagemUrl && (
            <div className="relative md:min-h-80">
              <ImagemCandidato
                titulo={titulo ?? "Sobre o evento"}
                imagemUrl={sobreImagemUrl}
                proporcao="4/3"
                className="h-full md:absolute md:inset-0 md:aspect-auto!"
                sizes="(min-width: 1152px) 28rem, (min-width: 768px) 40vw, 100vw"
              />
            </div>
          )}
          <div className="flex flex-col justify-center gap-5 p-6 sm:p-10 lg:p-12">
            {titulo && (
              <h2
                id="titulo-sobre-evento"
                className={cx("text-3xl leading-tight tracking-tight wrap-anywhere sm:text-4xl", cinema ? "font-cine font-bold" : "font-display font-extrabold")}
              >
                {titulo}
              </h2>
            )}
            {paragrafos.map((trechos, i) => (
              <p key={i} className="text-base leading-relaxed opacity-95 sm:text-lg">
                {trechos.map((t, j) => (t.negrito ? <strong key={j} className="font-bold">{t.texto}</strong> : <span key={j}>{t.texto}</span>))}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
