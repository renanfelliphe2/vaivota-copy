"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Anunciar = (mensagem: string, prioridade?: "polite" | "assertive") => void;

const LiveRegionContext = createContext<Anunciar>(() => {});

/** Região viva única para anúncios de leitor de tela (Toast e mudanças de estado). */
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [educado, setEducado] = useState("");
  const [assertivo, setAssertivo] = useState("");

  const anunciar = useCallback<Anunciar>((mensagem, prioridade = "polite") => {
    const definir = prioridade === "assertive" ? setAssertivo : setEducado;
    // Limpa antes para o leitor anunciar de novo uma mensagem repetida.
    definir("");
    setTimeout(() => definir(mensagem), 50);
  }, []);

  return (
    <LiveRegionContext.Provider value={anunciar}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {educado}
      </div>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {assertivo}
      </div>
    </LiveRegionContext.Provider>
  );
}

export function useAnunciar(): Anunciar {
  return useContext(LiveRegionContext);
}
