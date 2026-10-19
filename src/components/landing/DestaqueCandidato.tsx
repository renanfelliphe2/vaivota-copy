"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Destaque de um candidato (19/10/2026): uma casa do mosaico do hero leva até o cartão dele na lista, que fica em destaque
// e os demais em tons de cinza. Qualquer clique fora desse cartão (ou Esc) desfaz. Atributos que ligam as pontas:
//  - `data-cartao-candidato="<id>"` no cartão da lista (CartaoCandidato);
//  - `data-gatilho-destaque` nas casas do mosaico: clicar numa delas troca o destaque em vez de desfazer.

type Destaque = { destaqueId: string | null; destacar: (candidatoId: string) => void };

const DestaqueContext = createContext<Destaque>({ destaqueId: null, destacar: () => {} });

const seletorCartao = (candidatoId: string) => `[data-cartao-candidato="${CSS.escape(candidatoId)}"]`;

export function DestaqueCandidatoProvider({ children }: { children: ReactNode }) {
  const [destaqueId, setDestaqueId] = useState<string | null>(null);

  useEffect(() => {
    if (!destaqueId) return;
    // O React pode registrar este ouvinte ainda durante o clique que destacou: por isso o clique numa casa do mosaico
    // (que também é "fora do cartão") é ignorado aqui.
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target instanceof Element ? e.target : null;
      if (alvo?.closest(`${seletorCartao(destaqueId)}, [data-gatilho-destaque]`)) return;
      setDestaqueId(null);
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDestaqueId(null);
    };
    document.addEventListener("click", aoClicar);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("click", aoClicar);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [destaqueId]);

  function destacar(candidatoId: string) {
    setDestaqueId(candidatoId);
    const cartao = document.querySelector<HTMLElement>(seletorCartao(candidatoId));
    if (!cartao) return;
    // O foco vai junto (o teclado e o leitor de tela continuam dali), sem salto: a rolagem suave do CSS leva o cartão
    // ao meio da tela (e vira instantânea com prefers-reduced-motion).
    cartao.querySelector<HTMLElement>("[data-candidato-id]")?.focus({ preventScroll: true });
    cartao.scrollIntoView({ block: "center" });
  }

  return <DestaqueContext.Provider value={{ destaqueId, destacar }}>{children}</DestaqueContext.Provider>;
}

/** Fora do provider, sem destaque e `destacar` sem efeito. */
export function useDestaqueCandidato(): Destaque {
  return useContext(DestaqueContext);
}
