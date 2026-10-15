"use client";

import { Gavel, Handshake, ListChecks, Palette, Power, Scale, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SecaoConfig } from "@/dominio/checklistAtivacao";
import { cx } from "@/lib/classes";
import { MODULOS_FESTIVAL } from "@/lib/modulos";
import { useFormularioSujo } from "./FormularioSujoProvider";

const TODAS_AS_SECOES: { id: SecaoConfig; rotulo: string; icone: typeof Gavel }[] = [
  { id: "geral", rotulo: "Geral", icone: Settings2 },
  { id: "candidatos", rotulo: "Itens", icone: ListChecks }, // exibido com o rótulo do tema
  { id: "juri", rotulo: "Júri", icone: Gavel },
  { id: "placar", rotulo: "Placar", icone: Scale },
  { id: "tema", rotulo: "Tema", icone: Palette },
  { id: "parceiros", rotulo: "Parceiros", icone: Handshake },
  { id: "operacao", rotulo: "Operação", icone: Power },
];

/** Júri e Parceiros são do MVP do Festival (ver src/lib/modulos.ts). */
export const SECOES = TODAS_AS_SECOES.filter((s) => MODULOS_FESTIVAL || (s.id !== "juri" && s.id !== "parceiros"));

/**
 * Etapa 6 (D2): <nav> com Link e aria-current (não é tablist). Sidebar no desktop, faixa rolável no
 * celular. Com alteração pendente, pergunta antes de trocar de seção.
 */
export function SecaoNav({ base, atual, rotuloCandidatos }: { base: string; atual: SecaoConfig; rotuloCandidatos: string }) {
  const { sujo, confirmarSaida } = useFormularioSujo();
  const router = useRouter();

  return (
    <nav aria-label="Seções da configuração" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
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
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold lg:rounded-xl",
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
