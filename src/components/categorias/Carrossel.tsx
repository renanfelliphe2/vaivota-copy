"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useMovimentoReduzido } from "@/components/apresentacao/hooks";
import { cabeNaLinha, copiasDoCarrossel, normalizarPosicao } from "@/dominio/carrossel";
import { cx } from "@/lib/classes";

/** Pixels por segundo do movimento automático. */
const VELOCIDADE = 40;
/** Depois de um toque, rolagem ou seta, o movimento espera este tanto para voltar. */
const ESPERA_MS = 3500;

type Medida = { largura: number; item: number; gap: number; periodo: number };

export type CarrosselProps<T> = {
  itens: readonly T[];
  chave: (item: T) => string;
  render: (item: T) => ReactNode;
  /** Nome acessível da região ("Filmes de Mostra Infantil"). */
  rotulo: string;
  /** false: nunca se move sozinho (ex.: com a busca aberta); continua rolável à mão quando não cabe. */
  automatico?: boolean;
  /** Largura de cada cartão (classes), a mesma em todos. */
  classeItem: string;
  /** Quantos itens a lista tem sem filtro: `aoMedir` diz se TODOS caberiam na linha (a busca só aparece quando não cabem). */
  total?: number;
  aoMedir?: (cabemTodos: boolean) => void;
};

/**
 * Carrossel horizontal infinito (demanda B1, 25/11/2026). Os cartões saem pela esquerda e voltam pela direita, em ciclo, só
 * quando NÃO cabem na área; se cabem, ficam numa linha fixa. O movimento para com o ponteiro ou o foco dentro dele, e por uns
 * segundos depois de um toque, rolagem ou seta. Com "reduzir movimento" no aparelho, nada se move sozinho: rolagem à mão e setas.
 * As cópias da lista (a de verdade é a do meio) são só visuais: aria-hidden e inert, fora do teclado e do leitor de tela.
 */
export function Carrossel<T>({ itens, chave, render, rotulo, automatico = true, classeItem, total, aoMedir }: CarrosselProps<T>) {
  const area = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const [medida, setMedida] = useState<Medida | null>(null);
  const reduzido = useMovimentoReduzido();
  // Escritos e lidos só em manipuladores e efeitos (React Compiler).
  const sobre = useRef(false);
  const foco = useRef(false);
  const visivel = useRef(true);
  const esperaAte = useRef(0);
  const fimDaRolagem = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cabe = medida ? cabeNaLinha(itens.length, medida.item, medida.gap, medida.largura) : false;
  const modo: "FIXO" | "MANUAL" | "INFINITO" = !medida ? "MANUAL" : cabe ? "FIXO" : automatico && !reduzido ? "INFINITO" : "MANUAL";
  const copias = modo === "INFINITO" && medida ? copiasDoCarrossel(medida.largura, medida.periodo) : 1;
  const meio = (copias - 1) / 2;

  // Medidas: área visível, um cartão, o espaço entre eles e a largura de uma cópia. Refeitas quando algo muda de tamanho.
  useLayoutEffect(() => {
    const caixa = area.current;
    const ul = lista.current;
    if (!caixa || !ul) return;
    const medir = () => {
      const primeiro = ul.querySelector<HTMLElement>(":scope > li");
      if (!primeiro) return;
      const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
      const nova = { largura: caixa.clientWidth, item: primeiro.offsetWidth, gap, periodo: ul.offsetWidth };
      setMedida((m) => (m && m.largura === nova.largura && m.item === nova.item && m.gap === nova.gap && m.periodo === nova.periodo ? m : nova));
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caixa);
    observador.observe(ul);
    return () => observador.disconnect();
  }, [itens.length, modo, copias]);

  const cabemTodos = medida ? cabeNaLinha(total ?? itens.length, medida.item, medida.gap, medida.largura) : true;
  useEffect(() => {
    aoMedir?.(cabemTodos);
  }, [aoMedir, cabemTodos]);

  // Ao entrar no modo infinito (ou mudar o número de cópias), a posição vai para a cópia do meio, mesma imagem na tela.
  useLayoutEffect(() => {
    const caixa = area.current;
    if (modo !== "INFINITO" || !caixa || !medida) return;
    caixa.scrollLeft = normalizarPosicao(caixa.scrollLeft, medida.periodo, copias);
  }, [modo, copias, medida]);

  // Só se move enquanto aparece na tela.
  useEffect(() => {
    const caixa = area.current;
    if (!caixa) return;
    const observador = new IntersectionObserver(([e]) => {
      visivel.current = e.isIntersecting;
    });
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  // O movimento: a posição guardada em fração (o navegador arredonda o scrollLeft) avança a cada quadro e dá a volta numa cópia.
  useEffect(() => {
    const caixa = area.current;
    if (modo !== "INFINITO" || !caixa || !medida) return;
    let posicao = caixa.scrollLeft;
    let definido = caixa.scrollLeft;
    let anterior = performance.now();
    let quadro = requestAnimationFrame(function passo(agora) {
      const dt = Math.min(agora - anterior, 100);
      anterior = agora;
      // Alguém rolou (dedo, roda, trackpad, seta): segue de onde a pessoa deixou, depois da espera.
      if (Math.abs(caixa.scrollLeft - definido) > 1) {
        esperaAte.current = agora + ESPERA_MS;
        posicao = caixa.scrollLeft;
      }
      const parado = sobre.current || foco.current || !visivel.current || agora < esperaAte.current;
      if (!parado) {
        posicao = normalizarPosicao(posicao + (VELOCIDADE * dt) / 1000, medida.periodo, copias);
        caixa.scrollLeft = posicao;
      } else posicao = caixa.scrollLeft;
      definido = caixa.scrollLeft;
      quadro = requestAnimationFrame(passo);
    });
    return () => cancelAnimationFrame(quadro);
  }, [modo, medida, copias]);

  useEffect(() => () => {
    if (fimDaRolagem.current) clearTimeout(fimDaRolagem.current);
  }, []);

  /** Rolagem à mão no modo infinito: quando ela assenta, volta para a cópia do meio (sem salto visível). */
  function aoRolar() {
    if (modo !== "INFINITO" || !medida) return;
    if (fimDaRolagem.current) clearTimeout(fimDaRolagem.current);
    fimDaRolagem.current = setTimeout(() => {
      const caixa = area.current;
      if (caixa && !foco.current) caixa.scrollLeft = normalizarPosicao(caixa.scrollLeft, medida.periodo, copias);
    }, 200);
  }

  function rolar(direcao: 1 | -1) {
    const caixa = area.current;
    if (!caixa || !medida) return;
    esperaAte.current = performance.now() + ESPERA_MS;
    if (modo === "INFINITO") caixa.scrollLeft = normalizarPosicao(caixa.scrollLeft, medida.periodo, copias);
    caixa.scrollBy({ left: direcao * caixa.clientWidth * 0.8, behavior: reduzido ? "auto" : "smooth" });
  }

  if (itens.length === 0) return null;

  const classesLista = cx("flex shrink-0 gap-4 sm:gap-5", modo === "INFINITO" && "pr-4 sm:pr-5");
  const listaDe = (copia: number) => {
    const real = copia === meio;
    return (
      <ul
        key={copia}
        ref={real ? lista : undefined}
        aria-hidden={real ? undefined : true}
        inert={real ? undefined : true}
        className={classesLista}
      >
        {itens.map((item) => (
          <li key={chave(item)} className={cx("flex shrink-0", classeItem)}>
            {render(item)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label={rotulo}
      className="relative"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") sobre.current = true;
      }}
      onPointerLeave={() => {
        sobre.current = false;
      }}
      onPointerDown={() => {
        esperaAte.current = performance.now() + ESPERA_MS;
      }}
      onFocus={() => {
        foco.current = true;
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) foco.current = false;
      }}
    >
      <div
        ref={area}
        onScroll={aoRolar}
        className={cx(
          "carrossel-sem-barra -my-3 flex py-3",
          modo === "FIXO" ? "overflow-visible" : "overflow-x-auto overscroll-x-contain",
          modo !== "FIXO" && "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]",
        )}
      >
        {modo === "INFINITO" ? Array.from({ length: copias }, (_, i) => listaDe(i)) : listaDe(0)}
      </div>
      {modo !== "FIXO" && medida && (
        <>
          <SetaCarrossel lado="esquerda" aoClicar={() => rolar(-1)} />
          <SetaCarrossel lado="direita" aoClicar={() => rolar(1)} />
        </>
      )}
    </div>
  );
}

function SetaCarrossel({ lado, aoClicar }: { lado: "esquerda" | "direita"; aoClicar: () => void }) {
  const Icone = lado === "esquerda" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={aoClicar}
      aria-label={lado === "esquerda" ? "Rolar para a esquerda" : "Rolar para a direita"}
      className={cx(
        "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-tema-fundo/95 text-tema-texto shadow-lg ring-1 ring-tema-borda transition hover:scale-105 hover:ring-tema-primaria sm:inline-flex",
        lado === "esquerda" ? "-left-3" : "-right-3",
      )}
    >
      <Icone aria-hidden className="size-5" />
    </button>
  );
}
