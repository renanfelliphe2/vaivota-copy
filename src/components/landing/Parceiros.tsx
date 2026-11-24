"use client";

import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { cx } from "@/lib/classes";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * Patrocinadores do evento (08/10/2026; chamados "Parceiros" até 24/11/2026), no fim da página do evento. Sem eles, nada. Com link
 * (24/11/2026), a logo leva ao site em outra aba. 19/10/2026: faixa branca com o
 * rótulo em caixa-alta, como a de patrocínio nas placas da Maratona Tech Tivit. 07/11/2026, estilo cinema: como os
 * créditos de um filme, o rótulo na fonte de cartaz entre dois fios, sobre o papel dos cartazes.
 */
export function Parceiros({ cinema = false }: { cinema?: boolean }) {
  const ativo = useEventoAtivo();
  if (!ativo || ativo.parceiros.length === 0) return null;
  return (
    <section aria-labelledby="parceiros" className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-fundo")}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-14 sm:px-6 sm:py-16">
        <div className="flex w-full max-w-md items-center gap-4">
          {cinema && <span aria-hidden className="h-px flex-1 bg-tema-borda" />}
          <h2
            id="parceiros"
            className={cx(
              "text-xs font-bold uppercase text-tema-primaria-texto",
              cinema ? "font-cine tracking-[0.3em]" : "mx-auto tracking-[0.22em]",
            )}
          >
            Patrocinadores
          </h2>
          {cinema && <span aria-hidden className="h-px flex-1 bg-tema-borda" />}
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
          {ativo.parceiros.map((p) => {
            const logo = <LogoParceiro parceiro={p} className="max-h-14 max-w-40 sm:max-h-16 sm:max-w-44" classeNome="font-display text-lg font-extrabold text-tema-texto-suave" />;
            return (
              <li key={p.id} className="flex h-16 items-center justify-center">
                {p.linkUrl && /^https?:\/\//i.test(p.linkUrl) ? (
                  <a
                    href={p.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${p.nome} (abre o site em outra aba)`}
                    className="rounded-lg opacity-90 transition hover:opacity-100 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-tema-foco"
                  >
                    {logo}
                  </a>
                ) : (
                  logo
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
