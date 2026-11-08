import { Palette, Send, Smartphone } from "lucide-react";
import Link from "next/link";
import { AvisoPrivacidade } from "@/components/evento/AvisoPrivacidade";
import { classesBotao } from "@/components/ui/Botao";
import { comResultado, totaisDaVitrine, type VotacaoEncerrada } from "@/dominio/votacoesEncerradas";
import { AberturaLanding } from "./AberturaLanding";
import { AtalhoDoTopo, EventosAgora } from "./EventosAgora";
import { LogoVaiVota } from "./LogoVaiVota";
import { MenuDaPagina } from "./MenuDaPagina";
import { ComoFunciona, Perguntas, Recursos, Seguranca } from "./SecoesDaPlataforma";
import { TemaDaLanding } from "./TemaDaLanding";
import { VitrineIdentidade } from "./VitrineIdentidade";
import { VotacoesConcluidas } from "./VotacoesConcluidas";

type Props = {
  /** Votações com a urna encerrada (números) e, as concluídas, com o vencedor. */
  votacoes: VotacaoEncerrada[];
  /** `https://` ou `mailto:` de quem quer a VaiVota no próprio evento (CONTATO_ORGANIZADORES_URL); null esconde o botão. */
  contatoUrl: string | null;
};

/**
 * Landing da plataforma (07/11/2026, refeita do zero). Fala com quem vota (leva ao evento certo), com quem organiza (como
 * funciona, recursos, segurança, o convite do fim) e mostra o que já aconteceu: os números de cada votação encerrada, o
 * vencedor das concluídas e, na vitrine "A cara do seu evento", a página inteira vestida com o tema de cada uma. Na
 * abertura, um celular de demonstração deixa experimentar o voto.
 * Componente de servidor: só o tema da página, a demonstração, a vitrine, o menu do celular e o que depende dos eventos em
 * andamento rodam no navegador. A entrada ao rolar é CSS puro (.vv-surgir).
 */
export function LandingVaiVota({ votacoes, contatoUrl }: Props) {
  const concluidas = votacoes.filter(comResultado);
  const links = linksDaPagina(concluidas.length > 0);
  return (
    <TemaDaLanding>
      <Topo links={links} />
      <main id="conteudo" className="flex flex-1 flex-col">
        <AberturaLanding totais={votacoes.length > 0 ? totaisDaVitrine(votacoes) : null} comResultados={concluidas.length > 0} />
        <EventosAgora />
        {concluidas.length > 0 && <VotacoesConcluidas votacoes={concluidas} />}
        <VitrineIdentidade resumos={votacoes.map((v) => ({ slug: v.slug, participantes: v.participantes, votos: v.votos.total }))} />
        <ComoFunciona />
        <Recursos />
        <Seguranca />
        <Perguntas />
        <Fechamento contatoUrl={contatoUrl} />
      </main>
      <Rodape links={links} />
    </TemaDaLanding>
  );
}

function linksDaPagina(comResultados: boolean): [string, string][] {
  return [
    ...(comResultados ? [["#resultados", "Resultados"] as [string, string]] : []),
    ["#identidade", "A cara do evento"],
    ["#como-funciona", "Como funciona"],
    ["#recursos", "Recursos"],
    ["#perguntas", "Perguntas"],
  ];
}

function Topo({ links }: { links: [string, string][] }) {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-tema-borda/70 bg-tema-fundo/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        {/* Placa branca: o logo é PNG transparente e precisa de fundo claro quando a página veste um tema escuro. */}
        <Link href="/" className="shrink-0 rounded-lg bg-white px-1.5 py-1">
          <LogoVaiVota className="h-9 sm:h-10" prioridade />
        </Link>
        <nav aria-label="Seções da página" className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map(([href, rotulo]) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-tema-texto-suave transition hover:bg-tema-superficie hover:text-tema-texto"
            >
              {rotulo}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-2">
          <AtalhoDoTopo />
          <MenuDaPagina links={links} />
        </div>
      </div>
    </header>
  );
}

/** Convite do fim, para quem organiza. O botão de contato só existe com CONTATO_ORGANIZADORES_URL configurada. */
function Fechamento({ contatoUrl }: { contatoUrl: string | null }) {
  const externo = contatoUrl?.startsWith("https://");
  const contorno =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-base font-semibold text-white ring-1 ring-white/35 transition hover:bg-white/15";
  return (
    <section aria-labelledby="titulo-fechamento" className="w-full bg-tema-fundo px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="vv-surgir vv-palco relative isolate mx-auto max-w-6xl overflow-clip rounded-[2.5rem] px-6 py-14 text-center text-white [--tema-foco:#ffffff] sm:px-12 sm:py-20">
        <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-vv-destaque-claro">
          <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
          Para quem organiza
          <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
        </p>
        <h2 id="titulo-fechamento" className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-5xl sm:leading-[1.05]">
          Seu evento é o próximo.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-white/80">
          Festival, mostra, maratona de projetos ou premiação: a VaiVota cuida da urna, e o seu público fica com a emoção do
          resultado.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          {contatoUrl && (
            <a
              href={contatoUrl}
              {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={classesBotao({ variante: "secundaria", tamanho: "grande", className: "shadow-lg shadow-black/30 hover:-translate-y-0.5" })}
            >
              <Send aria-hidden className="size-5" />
              Quero a VaiVota no meu evento
            </a>
          )}
          <a href="#demonstracao" className={contorno}>
            <Smartphone aria-hidden className="size-5" />
            Experimentar o voto
          </a>
          <a href="#identidade" className={contorno}>
            <Palette aria-hidden className="size-5" />
            Ver a cara do seu evento
          </a>
        </div>
      </div>
    </section>
  );
}

function Rodape({ links }: { links: [string, string][] }) {
  return (
    <footer className="w-full border-t border-tema-borda bg-vv-ceu/60 text-sm text-tema-texto-suave">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <span className="self-start rounded-lg bg-white px-1.5 py-1">
            <LogoVaiVota className="h-9" />
          </span>
          <p className="max-w-xs">Votação ao vivo para eventos, com a identidade de cada evento.</p>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <nav aria-label="Rodapé" className="flex flex-wrap items-center gap-x-5">
            {links.map(([href, rotulo]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center underline underline-offset-2 hover:no-underline">
                {rotulo}
              </a>
            ))}
            <AvisoPrivacidade />
          </nav>
          <p>© {new Date().getFullYear()} VaiVota</p>
        </div>
      </div>
    </footer>
  );
}
