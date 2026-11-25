"use client";

import { ChartColumn, Monitor, Settings, Tablet, Vote, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { useIdentidadePagina } from "@/components/evento/identidadePagina";
import { SimboloOrganizador } from "@/components/evento/MarcaOrganizador";
import { StatusUrna } from "@/components/landing/StatusUrna";
import { atalhoAtual, atalhosDoPapel, type IdAtalho } from "@/dominio/navegacao";
import { votacaoAberta } from "@/dominio/situacaoEvento";
import { MenuUsuario } from "@/components/evento/MenuUsuario";
import { cx } from "@/lib/classes";
import { dividirNome } from "@/lib/rotulos";
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
  TOTENS: Tablet,
  VOTAR: Vote,
};

export function CabecalhoEvento() {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const ui = useUi();
  const pathname = usePathname();
  const visao = useVisaoEvento();
  const { organizador } = useIdentidadePagina();
  if (!ativo) return null;
  const { slug, evento, tema } = ativo;
  // 09/11/2026: some também no QR Code de tela cheia das categorias (telão).
  if (pathname === `/e/${slug}/totem` || pathname.startsWith(`/e/${slug}/qr/`) || ui.palcoAtivo) return null;

  // A apresentação (telão) é do MVP do Festival.
  const atalhos = sessao.logado ? atalhosDoPapel(slug, sessao.papel, votacaoAberta(evento), { totens: evento.moduloInfantil }) : [];
  // Evento indisponível: a casca mínima já mostra o estado.
  // 09/11/2026: também nas páginas das categorias (Festival).
  const naPaginaDeVoto = pathname === `/e/${slug}` || pathname.startsWith(`/e/${slug}/categoria/`);
  const comFaixa = naPaginaDeVoto && visao !== null && visao.variante !== "INDISPONIVEL";
  const nome = tema.nomeExibicao ?? evento.nome;
  // 25/11/2026: com mais de um atalho (o admin tem 3 ou 4), no celular eles descem para uma segunda linha, como abas de
  // ícone e nome curto: na linha do logo só cabiam o logo espremido e o menu. Do sm ao lg, só os ícones na linha; do lg
  // em diante, ícone e nome. Um atalho só (Votar) segue na linha do logo.
  const emAbas = atalhos.length > 1;

  return (
    <header data-print="ocultar" className="sticky top-0 z-30 w-full bg-tema-fundo/90 backdrop-blur-md">
      <div className={cx("mx-auto flex max-w-6xl items-center gap-x-3 px-4 sm:gap-x-4 sm:px-6", emAbas ? "flex-wrap pt-2.5 sm:flex-nowrap sm:py-2.5" : "py-2.5")}>
        {tema.logoUrl ? (
          // Logo largo encolhe (em vez de empurrar o menu para fora da tela).
          <Link href={`/e/${slug}`} className={cx("flex min-w-0 rounded-md", emAbas && "flex-1 sm:flex-initial")}>
            <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-9 max-w-full object-contain object-left sm:h-11" prioridade />
          </Link>
        ) : (
          // 19/10/2026: sem logo, o nome em dois tons (como no hero), com o símbolo do organizador a partir do sm.
          // Encolhe e trunca no celular, onde divide a linha com os atalhos e o menu.
          <Link href={`/e/${slug}`} className={cx("flex min-h-11 min-w-0 items-center gap-3 rounded-md", emAbas && "flex-1 sm:flex-initial")}>
            {organizador && (
              <>
                <SimboloOrganizador marca={organizador} className="hidden h-8 sm:block" />
                <span aria-hidden className="hidden h-7 w-px shrink-0 bg-tema-borda sm:block" />
              </>
            )}
            <NomeEmDoisTons nome={nome} />
          </Link>
        )}
        {atalhos.length > 0 && (
          <nav
            aria-label="Atalhos"
            className={cx("ml-auto", emAbas && "order-last mt-1.5 basis-full border-t border-tema-borda/60 py-1 sm:order-none sm:mt-0 sm:basis-auto sm:border-0 sm:py-0")}
          >
            <ul className={cx("flex items-center gap-1", emAbas && "*:flex-1 sm:*:flex-none")}>
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
                        "inline-flex min-h-11 min-w-11 items-center justify-center font-semibold",
                        emAbas
                          ? "w-full flex-col gap-0.5 rounded-xl px-1 py-1 text-[0.6875rem] leading-tight sm:w-auto sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:py-0 sm:text-sm lg:px-4"
                          : "gap-2 rounded-full px-3 text-sm sm:px-4",
                        atual ? "bg-tema-primaria text-tema-sobre-primaria" : "text-tema-texto hover:bg-tema-superficie",
                      )}
                    >
                      <Icone aria-hidden className="size-4 shrink-0" />
                      {/* Nas abas do celular, ícone e nome; do sm ao lg, só o ícone (o nome segue para leitor de tela). */}
                      <span className={emAbas ? "max-w-full truncate sm:sr-only lg:not-sr-only" : "sr-only sm:not-sr-only"}>{rotulo}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div className={cx("shrink-0", (atalhos.length === 0 || emAbas) && "ml-auto", emAbas && "sm:ml-0")}>
          <MenuUsuario />
        </div>
      </div>
      {comFaixa && <StatusUrna />}
      <div aria-hidden className="h-0.5 w-full bg-linear-to-r from-tema-primaria to-tema-secundaria" />
    </header>
  );
}

function NomeEmDoisTons({ nome }: { nome: string }) {
  const { primeira, resto } = dividirNome(nome);
  return (
    <span className="min-w-0 truncate font-display text-lg font-extrabold leading-tight tracking-tight sm:text-xl">
      {primeira}
      {resto && <span className="text-tema-primaria-texto"> {resto}</span>}
    </span>
  );
}
