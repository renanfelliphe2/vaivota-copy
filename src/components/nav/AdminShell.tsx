"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Monitor, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { Selo } from "@/components/ui/Selo";
import { cx } from "@/lib/classes";
import { ROTULO_ESTADO_EVENTO, ROTULO_ESTADO_URNA } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";

/** Casca mínima do painel (Etapa 0). As Etapas 6 e 7 só preenchem o conteúdo. */
export function AdminShell({ children }: { children: ReactNode }) {
  const ativo = useEventoAtivo();
  const pathname = usePathname();
  if (!ativo) return null;
  const { slug, evento, tema } = ativo;
  const base = `/e/${slug}/admin`;
  const links = [
    { href: base, rotulo: "Dashboard", icone: ChartColumn },
    { href: `${base}/configuracao`, rotulo: "Configuração", icone: Settings },
    { href: `${base}/apresentar`, rotulo: "Apresentação", icone: Monitor },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <header data-print="ocultar" className="border-b border-tema-borda bg-tema-superficie">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={`/e/${slug}`} className="text-lg font-bold hover:underline">
              {tema.nomeExibicao ?? evento.nome}
            </Link>
            <Selo variante={evento.estado === "ATIVO" ? "sucesso" : evento.estado === "RASCUNHO" ? "aviso" : "neutro"}>
              {ROTULO_ESTADO_EVENTO[evento.estado]}
            </Selo>
            <Selo variante={evento.estadoUrna === "ABERTA" ? "sucesso" : "neutro"}>{ROTULO_ESTADO_URNA[evento.estadoUrna]}</Selo>
          </div>
          <nav aria-label="Painel do evento">
            <ul className="flex flex-wrap gap-1">
              {links.map(({ href, rotulo, icone: Icone }) => {
                const atual = pathname === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={atual ? "page" : undefined}
                      className={cx(
                        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                        atual ? "bg-tema-primaria text-tema-sobre-primaria" : "text-tema-texto hover:bg-tema-fundo",
                      )}
                    >
                      <Icone aria-hidden className="size-4" />
                      {rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
