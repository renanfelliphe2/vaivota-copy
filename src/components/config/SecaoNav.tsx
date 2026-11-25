"use client";

import { Gavel, Layers, ListChecks, Monitor, Palette, Power, Scale, Settings2, Tablet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { SecaoConfig } from "@/dominio/checklistAtivacao";
import { cx } from "@/lib/classes";
import { useFormularioSujo } from "./FormularioSujoProvider";

const TODAS_AS_SECOES: { id: SecaoConfig; rotulo: string; icone: typeof Gavel }[] = [
  { id: "geral", rotulo: "Geral", icone: Settings2 },
  { id: "categorias", rotulo: "Categorias", icone: Layers },
  { id: "candidatos", rotulo: "Itens", icone: ListChecks }, // exibido com o rótulo do tema
  { id: "juri", rotulo: "Júri", icone: Gavel },
  { id: "totens", rotulo: "Totens", icone: Tablet },
  { id: "placar", rotulo: "Placar", icone: Scale },
  { id: "tema", rotulo: "Tema", icone: Palette },
  { id: "apresentacao", rotulo: "Apresentação", icone: Monitor },
  { id: "operacao", rotulo: "Operação", icone: Power },
];

/** 24/11/2026: todas as seções em todo evento (antes Categorias, Júri e Totens dependiam de NEXT_PUBLIC_MODULOS_FESTIVAL). */
export const SECOES = TODAS_AS_SECOES;

/**
 * Etapa 6 (D2): <nav> com Link e aria-current (não é tablist). Sidebar no desktop, faixa rolável no
 * celular. Com alteração pendente, pergunta antes de trocar de seção.
 */
export function SecaoNav({ base, atual, rotuloCandidatos }: { base: string; atual: SecaoConfig; rotuloCandidatos: string }) {
  const { sujo, confirmarSaida } = useFormularioSujo();
  const router = useRouter();
  const faixa = useRef<HTMLElement>(null);

  // 25/11/2026: no celular a faixa rola na horizontal; a seção atual vem para o meio dela (antes podia ficar fora da vista).
  useEffect(() => {
    const caixa = faixa.current;
    const ativa = caixa?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!caixa || !ativa || caixa.scrollWidth <= caixa.clientWidth) return;
    caixa.scrollLeft = ativa.offsetLeft - (caixa.clientWidth - ativa.offsetWidth) / 2;
  }, [atual]);

  return (
    // Celular: uma linha que rola. Do sm ao lg: as seções quebram em linhas (todas à vista). lg: coluna ao lado do conteúdo.
    <nav
      ref={faixa}
      aria-label="Seções da configuração"
      className="carrossel-sem-barra relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
    >
      <ul className="flex gap-1 sm:flex-wrap lg:flex-col">
        {SECOES.map(({ id, rotulo, icone: Icone }) => {
          const href = `${base}?secao=${id}`;
          const ativa = id === atual;
          return (
            <li key={id} className="shrink-0">
              <Link
                href={href}
                aria-current={ativa ? "page" : undefined}
                scroll={false}
                onClick={(e) => {
                  if (!sujo || ativa) return;
                  e.preventDefault();
                  confirmarSaida(() => router.push(href, { scroll: false }));
                }}
                className={cx(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold whitespace-nowrap lg:rounded-xl",
                  ativa ? "bg-tema-primaria text-tema-sobre-primaria" : "text-tema-texto hover:bg-tema-superficie",
                )}
              >
                <Icone aria-hidden className="size-4" />
                {id === "candidatos" ? rotuloCandidatos : rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
