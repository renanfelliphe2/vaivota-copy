"use client";

import { LogoParceiro } from "@/components/evento/LogoParceiro";
import { parceirosPorGrupo } from "@/dominio/gruposParceiros";
import type { Parceiro } from "@/dominio/tipos";
import { cx } from "@/lib/classes";
import { useEventoAtivo } from "@/store/seletores/evento";

/**
 * Parceiros do evento (08/10/2026), no fim da página do evento. Sem eles, nada. Com link (24/11/2026), a logo leva ao site em outra
 * aba. 19/10/2026: faixa com o rótulo em caixa-alta, como a de patrocínio nas placas da Maratona Tech Tivit. 07/11/2026, estilo
 * cinema: como os créditos de um filme, o rótulo na fonte de cartaz entre dois fios, sobre o papel dos cartazes.
 * 25/11/2026 (demanda C1): um bloco por grupo (Patrocínio, Realização…), com o nome do grupo como título, na ordem dos grupos.
 * Quem não está em grupo nenhum vai num último bloco, sob "Parceiros".
 * 24/11/2026: os blocos dividem a linha (grupos pequenos lado a lado) e só descem quando não cabem; logos em células de largura
 * fixa, para formar grade dentro de cada grupo.
 */
export function Parceiros({ cinema = false }: { cinema?: boolean }) {
  const ativo = useEventoAtivo();
  if (!ativo || ativo.parceiros.length === 0) return null;
  const blocos = parceirosPorGrupo(ativo.gruposParceiros, ativo.parceiros);
  return (
    <section aria-label="Parceiros" className={cx("w-full", cinema ? "bg-cine-papel" : "bg-tema-fundo")}>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-x-14 gap-y-10 px-4 py-12 sm:px-6 sm:py-14">
        {blocos.map((b) => {
          const id = `parceiros-${b.grupo?.id ?? "sem-grupo"}`;
          return (
            <div key={id} role="group" aria-labelledby={id} className="flex min-w-56 max-w-full flex-auto flex-col items-center gap-5">
              <div className="flex w-full max-w-md items-center gap-4">
                {cinema && <span aria-hidden className="h-px flex-1 bg-tema-borda" />}
                <h2
                  id={id}
                  className={cx(
                    "text-xs font-bold uppercase text-tema-primaria-texto",
                    cinema ? "font-cine tracking-[0.3em]" : "mx-auto tracking-[0.22em]",
                  )}
                >
                  {b.grupo?.nome ?? "Parceiros"}
                </h2>
                {cinema && <span aria-hidden className="h-px flex-1 bg-tema-borda" />}
              </div>
              <ListaLogos parceiros={b.parceiros} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ListaLogos({ parceiros }: { parceiros: readonly Parceiro[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-5 sm:gap-x-8">
      {parceiros.map((p) => {
        const logo = <LogoParceiro parceiro={p} className="max-h-12 max-w-32 sm:max-h-14 sm:max-w-36" classeNome="line-clamp-2 whitespace-normal! text-center font-display text-base font-extrabold text-tema-texto-suave wrap-anywhere" />;
        return (
          <li key={p.id} className="flex h-14 w-32 items-center justify-center sm:h-16 sm:w-36">
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
  );
}
