"use client";

import { ChartColumn, Monitor, Settings, Vote, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { StatusUrna } from "@/components/landing/StatusUrna";
import { atalhoAtual, atalhosDoPapel, type IdAtalho } from "@/dominio/navegacao";
import { votacaoAberta } from "@/dominio/situacaoEvento";
import { MenuUsuario } from "@/components/evento/MenuUsuario";
import { cx } from "@/lib/classes";
import { useUi } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";
import { useVisaoEvento } from "@/store/seletores/visao";

// Cabeçalho único (08/10/2026): fixo no topo de todas as telas do evento e da landing, com logo, os atalhos
// do papel e o menu da conta. Os atalhos só navegam (são links), nunca executam ação.
// Some no totem (quiosque) e com o palco no ar (telão). A regra dos atalhos fica em dominio/navegacao.ts.
// Na página do evento leva junto a faixa de status (StatusUrna), que assim não rola com a página.

const ICONES: Record<IdAtalho, LucideIcon> = {
  DASHBOARD: ChartColumn,
  CONFIGURACOES: Settings,
  APRESENTACAO: Monitor,
  VOTAR: Vote,
};

export function CabecalhoEvento() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const ui = useUi();
  const pathname = usePathname();
  const visao = useVisaoEvento();
  if (!ativo) return null;
  const { slug, evento, tema } = ativo;
  if (pathname === `/e/${slug}/totem` || ui.palcoAtivo) return null;

  const atalhos = sessao.logado ? atalhosDoPapel(slug, sessao.papel, votacaoAberta(evento)) : [];
  // Evento indisponível: a casca mínima já mostra o estado.
  const comFaixa = pathname === `/e/${slug}` && visao !== null && visao.variante !== "INDISPONIVEL";

  return (
    <header data-print="ocultar" className="sticky top-0 z-30 w-full border-b border-tema-borda bg-tema-fundo">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">
        <Link href={`/e/${slug}`} className="shrink-0 rounded-md">
          <LogoEvento nome={tema.nomeExibicao ?? evento.nome} logoUrl={tema.logoUrl} className="h-9 sm:h-11" prioridade />
        </Link>
        {atalhos.length > 0 && (
          <nav aria-label="Atalhos" className="ml-auto">
            <ul className="flex items-center gap-1">
              {atalhos.map((atalho) => {
                const { href, rotulo } = atalho;
                const Icone = ICONES[atalho.id];
                const atual = atalhoAtual(atalho, pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={atual ? "page" : undefined}
                      title={rotulo}
                      className={cx(
                        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold sm:px-4",
                        atual ? "bg-tema-primaria text-tema-sobre-primaria" : "text-tema-texto hover:bg-tema-superficie",
                      )}
                    >
                      <Icone aria-hidden className="size-4 shrink-0" />
                      {/* No celular, só o ícone; o nome continua para leitor de tela. */}
                      <span className="sr-only sm:not-sr-only">{rotulo}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div className={cx("shrink-0", atalhos.length === 0 && "ml-auto")}>
          <MenuUsuario />
        </div>
      </div>
      {comFaixa && <StatusUrna />}
    </header>
  );
}
