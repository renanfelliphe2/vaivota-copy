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
  if (pathname === `/e/${slug}/totem` || pathname === `/e/${slug}/telao` || pathname.startsWith(`/e/${slug}/qr/`) || ui.palcoAtivo) return null;

  // A apresentação (telão) é do MVP do Festival.
  const atalhos = sessao.logado
    ? atalhosDoPapel(slug, sessao.papel, votacaoAberta(evento), { totens: evento.moduloInfantil, jaVotou: sessao.jaVotou })
    : [];
  // Evento indisponível: a casca mínima já mostra o estado.
  // 09/11/2026: também nas páginas das categorias (Festival).
  const naPaginaDeVoto = pathname === `/e/${slug}` || pathname.startsWith(`/e/${slug}/categoria/`);
  const comFaixa = naPaginaDeVoto && visao !== null && visao.variante !== "INDISPONIVEL";
  const nome = tema.nomeExibicao ?? evento.nome;
  // 25/11/2026: com mais de um atalho (o admin tem 3 ou 4), abaixo de 700px eles saem da linha do logo e entram no menu da
  // conta (MenuUsuario). Dos 700px ao lg, só os ícones na linha; do lg em diante, ícone e nome. Um atalho só (Votar) segue
  // sempre na linha do logo.
  const emMenu = atalhos.length > 1;
  const atalhosDoMenu = emMenu
    ? atalhos.map((atalho) => ({ href: atalho.href, rotulo: atalho.rotulo, icone: ICONES[atalho.id], atual: atalhoAtual(atalho, pathname) }))
    : [];

  return (
    <header data-print="ocultar" className="sticky top-0 z-30 w-full bg-tema-fundo/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-x-3 px-4 py-2.5 sm:gap-x-4 sm:px-6">
        {tema.logoUrl ? (
          // Logo largo encolhe (em vez de empurrar o menu para fora da tela).
          <Link href={`/e/${slug}`} className="flex min-w-0 rounded-md">
            <LogoEvento nome={nome} logoUrl={tema.logoUrl} className="h-9 max-w-full object-contain object-left sm:h-11" prioridade />
          </Link>
        ) : (
          // 19/10/2026: sem logo, o nome em dois tons (como no hero), com o símbolo do organizador a partir do sm.
          // Encolhe e trunca no celular, onde divide a linha com os atalhos e o menu.
          <Link href={`/e/${slug}`} className="flex min-h-11 min-w-0 items-center gap-3 rounded-md">
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
          <nav aria-label="Atalhos" className={cx("ml-auto", emMenu && "max-[700px]:hidden")}>
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
                      {/* Vários atalhos: só o ícone até o lg (o nome segue para leitor de tela). Um só: o nome a partir do sm. */}
                      <span className={emMenu ? "sr-only lg:not-sr-only" : "sr-only sm:not-sr-only"}>{rotulo}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
        <div className={cx("shrink-0", atalhos.length === 0 && "ml-auto", emMenu && "max-[700px]:ml-auto")}>
          <MenuUsuario atalhos={atalhosDoMenu} />
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
