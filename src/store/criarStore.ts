import type { EstadoApp } from "@/dominio/tipos";

// D1: store externo (useSyncExternalStore), criado por montagem dentro do AppProvider. Nunca singleton de módulo.

export type Receita = (atual: EstadoApp) => EstadoApp;

export type Store = {
  getState: () => EstadoApp;
  /** Aplica uma receita pura. Se ela devolver o mesmo objeto, ninguém é notificado. */
  atualizar: (receita: Receita) => void;
  subscribe: (ouvinte: () => void) => () => void;
};

export function criarStore(inicial: EstadoApp): Store {
  let estado = inicial;
  const ouvintes = new Set<() => void>();

  return {
    getState: () => estado,
    atualizar(receita) {
      const proximo = receita(estado);
      if (proximo === estado) return;
      estado = proximo;
      for (const ouvinte of ouvintes) ouvinte();
    },
    subscribe(ouvinte) {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
  };
}
