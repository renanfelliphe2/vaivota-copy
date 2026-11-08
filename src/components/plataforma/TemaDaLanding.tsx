"use client";

import { RotateCcw } from "lucide-react";
import { createContext, useContext, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { TemaEvento } from "@/components/evento/TemaEvento";
import type { Evento, Tema } from "@/dominio/tipos";
import { momentoDaVotacao, statusNaVitrine, votacaoJaAconteceu } from "@/dominio/vitrineEventos";
import type { CoresTema } from "@/lib/tema";
import { useEventos, useTemas } from "@/store/seletores/evento";

/**
 * Identidade da plataforma em "/", a única tela fora do tema de um evento: as cores do logo (marinho e âmbar; o turquesa
 * do pássaro é a terceira cor e vive em `.vv-pagina[data-tema="vaivota"]`, no globals.css).
 */
export const TEMA_VAIVOTA: CoresTema = {
  corPrimaria: "#054573",
  corSecundaria: "#FBAA38",
  corFundo: "#FFFFFF",
  corTexto: "#0B1F33",
  fonte: "Poppins",
};

export function coresDoTema(tema: Pick<Tema, keyof CoresTema>): CoresTema {
  const { corPrimaria, corSecundaria, corFundo, corTexto, fonte } = tema;
  return { corPrimaria, corSecundaria, corFundo, corTexto, fonte };
}

type Origem = { x: number; y: number };

/** O evento que veste a página, com o que a demonstração da abertura usa dele. */
export type EventoNaPagina = { slug: string; nome: string; rotuloCandidato: string };

type ContextoTema = {
  /** Evento cujo tema veste a página; null = cores da VaiVota. */
  evento: EventoNaPagina | null;
  aplicar: (slug: string | null, origem?: Origem) => void;
};

const Contexto = createContext<ContextoTema>({ evento: null, aplicar: () => {} });

export type VotacaoRealizada = { evento: Evento; tema: Tema; nome: string };

/**
 * Votações que já aconteceram, com o tema de cada uma (vitrine "A cara do seu evento" e botões de tema da abertura): a
 * urna já abriu alguma vez ou o evento foi concluído; rascunho nunca. Aberta primeiro, depois a mais recente.
 */
export function useVotacoesRealizadas(): VotacaoRealizada[] {
  const eventos = useEventos();
  const temas = useTemas();
  return useMemo(
    () =>
      eventos
        .filter(votacaoJaAconteceu)
        .flatMap((evento) => {
          const tema = temas.find((t) => t.eventoId === evento.id);
          return tema ? [{ evento, tema, nome: tema.nomeExibicao?.trim() || evento.nome }] : [];
        })
        .sort(
          (a, b) =>
            statusNaVitrine(a.evento).prioridade - statusNaVitrine(b.evento).prioridade ||
            momentoDaVotacao(b.evento) - momentoDaVotacao(a.evento),
        ),
    [eventos, temas],
  );
}

export function useTemaDaLanding(): ContextoTema {
  return useContext(Contexto);
}

/** De onde o novo tema se abre: o ponto do clique ou, pelo teclado, o centro do botão. */
export function origemDoClique(evento: MouseEvent<HTMLElement>): Origem {
  if (evento.detail > 0) return { x: evento.clientX, y: evento.clientY };
  const r = evento.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Troca o tema com um círculo que se abre a partir da origem (View Transitions). Sem suporte no navegador ou com
 * prefers-reduced-motion, troca direto. O CSS da transição fica em `.vv-trocando-tema` (globals.css).
 */
function revelar(trocar: () => void, origem?: Origem) {
  const semMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (typeof document.startViewTransition !== "function" || semMovimento) {
    trocar();
    return;
  }
  const raiz = document.documentElement;
  const x = origem?.x ?? window.innerWidth / 2;
  const y = origem?.y ?? window.innerHeight / 2;
  const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  raiz.classList.add("vv-trocando-tema");
  const transicao = document.startViewTransition(trocar);
  transicao.ready
    .then(() => {
      raiz.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transicao.finished.finally(() => raiz.classList.remove("vv-trocando-tema"));
}

/**
 * Tema da landing (07/11/2026): começa com as cores da VaiVota e, pela vitrine "A cara do seu evento", veste a página
 * inteira com o tema de um evento (cores e fonte). Os temas vêm do estado público que o layout já entregou. Só vale nesta
 * visita: recarregar volta às cores da VaiVota.
 */
export function TemaDaLanding({ children }: { children: ReactNode }) {
  const [slugEscolhido, setSlugEscolhido] = useState<string | null>(null);
  const eventos = useEventos();
  const temas = useTemas();
  const anunciar = useAnunciar();

  const nomeDe = (slug: string) => {
    const evento = eventos.find((e) => e.slug === slug);
    const tema = evento ? temas.find((t) => t.eventoId === evento.id) : undefined;
    return evento && tema ? { nome: tema.nomeExibicao?.trim() || evento.nome, tema } : null;
  };
  // Se o evento sair do estado público (polling), a página volta sozinha às cores da VaiVota.
  const escolhido = slugEscolhido ? nomeDe(slugEscolhido) : null;
  const slug = escolhido ? slugEscolhido : null;

  const aplicar = (novo: string | null, origem?: Origem) => {
    if (novo === slug) return;
    const destino = novo ? nomeDe(novo) : null;
    if (novo && !destino) return;
    revelar(() => flushSync(() => setSlugEscolhido(novo)), origem);
    anunciar(destino ? `A página agora está com as cores de ${destino.nome}.` : "A página voltou às cores da VaiVota.");
  };

  const evento: EventoNaPagina | null =
    escolhido && slug ? { slug, nome: escolhido.nome, rotuloCandidato: escolhido.tema.rotuloCandidato } : null;

  return (
    <Contexto.Provider value={{ evento, aplicar }}>
      <TemaEvento
        tema={escolhido ? coresDoTema(escolhido.tema) : TEMA_VAIVOTA}
        data-tema={escolhido ? "evento" : "vaivota"}
        className="vv-pagina flex flex-1 flex-col"
      >
        {children}
        {escolhido && (
          <>
            {/* Espaço para a barra fixa não cobrir o fim do rodapé. */}
            <div aria-hidden className="h-20" />
            <AvisoDoTema nome={escolhido.nome} tema={escolhido.tema} aoVoltar={(origem) => aplicar(null, origem)} />
          </>
        )}
      </TemaEvento>
    </Contexto.Provider>
  );
}

/** Barra fixa enquanto a página veste o tema de um evento: de qualquer ponto da página dá para voltar ao original. */
function AvisoDoTema({ nome, tema, aoVoltar }: { nome: string; tema: Tema; aoVoltar: (origem: Origem) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-tema-texto py-1.5 pl-2 pr-1.5 text-tema-fundo shadow-2xl shadow-black/30 [--tema-foco:var(--tema-fundo)]">
        <span aria-hidden className="flex shrink-0">
          {[tema.corPrimaria, tema.corSecundaria].map((cor, i) => (
            <span key={cor + i} className="-ml-1.5 size-6 rounded-full ring-2 ring-tema-texto first:ml-0" style={{ backgroundColor: cor }} />
          ))}
        </span>
        <p className="min-w-0 truncate text-sm font-semibold">
          <span className="hidden sm:inline">Página com a cara de </span>
          <span className="sm:hidden">Tema: </span>
          {nome}
        </p>
        <button
          type="button"
          onClick={(e) => aoVoltar(origemDoClique(e))}
          aria-label="Voltar esta página às cores da VaiVota"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-tema-fundo px-4 text-sm font-bold text-tema-texto transition hover:opacity-90"
        >
          <RotateCcw aria-hidden className="size-4" />
          <span className="hidden sm:inline">Voltar às cores da VaiVota</span>
          <span className="sm:hidden">Original</span>
        </button>
      </div>
    </div>
  );
}
