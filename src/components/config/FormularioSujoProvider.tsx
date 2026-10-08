"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";

// Etapa 6 (D2, D5): alteração pendente. A flag é escrita só em manipuladores. A pergunta cobre só a
// navegação interna da tela (seções e fechar o painel de candidato); voltar do navegador e os links do
// AdminShell não são interceptados (P18).

type ContextoSujo = {
  sujo: boolean;
  marcarSujo: (sujo: boolean) => void;
  /** Executa `acao` direto, ou depois de confirmar o descarte se houver alteração pendente. */
  confirmarSaida: (acao: () => void) => void;
};

const SujoContext = createContext<ContextoSujo>({ sujo: false, marcarSujo: () => {}, confirmarSaida: (a) => a() });

export function FormularioSujoProvider({ children }: { children: ReactNode }) {
  const [sujo, setSujo] = useState(false);
  const [pendente, setPendente] = useState(false);
  const acaoPendente = useRef<(() => void) | null>(null);

  const marcarSujo = useCallback((valor: boolean) => setSujo(valor), []);

  const confirmarSaida = useCallback(
    (acao: () => void) => {
      if (!sujo) return acao();
      acaoPendente.current = acao;
      setPendente(true);
    },
    [sujo],
  );

  const descartar = () => {
    const acao = acaoPendente.current;
    acaoPendente.current = null;
    setPendente(false);
    setSujo(false);
    acao?.();
  };

  return (
    <SujoContext.Provider value={{ sujo, marcarSujo, confirmarSaida }}>
      {children}
      <DialogoConfirmacao
        aberto={pendente}
        aoFechar={() => {
          acaoPendente.current = null;
          setPendente(false);
        }}
        aoConfirmar={descartar}
        titulo="Descartar alterações?"
        consequencia="Há alterações que ainda não foram salvas. Se continuar, elas serão perdidas."
        rotuloConfirmar="Descartar"
        rotuloCancelar="Continuar editando"
      />
    </SujoContext.Provider>
  );
}

export function useFormularioSujo(): ContextoSujo {
  return useContext(SujoContext);
}
