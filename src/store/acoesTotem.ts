import type { EstadoApp, EstadoDispositivo, EstadoUiTotem } from "@/dominio/tipos";
import { obterAmbiente } from "./ambiente";

// Totem (rev. 4, A7): única escrita em `ui.totem` e ações da seção Totem da toolbar.
// O pareamento real (código de uso único → token) fica para o planner "Totem"; aqui a toolbar escolhe o aparelho.

/** PIN de saída dos totens do seed, para a toolbar mostrar (componentes não importam mocks). */
export { PIN_TOTEM_SEED } from "@/mocks/seed/dispositivos";

function comTotem(estado: EstadoApp, mudanca: Partial<EstadoUiTotem>): EstadoApp {
  const atual = estado.ui.totem;
  if (Object.entries(mudanca).every(([k, v]) => atual[k as keyof EstadoUiTotem] === v)) return estado;
  return { ...estado, ui: { ...estado.ui, totem: { ...atual, ...mudanca } } };
}

/** "Este aparelho é o totem…" (toolbar). null desfaz o pareamento. */
export function parearTotem(dispositivoId: string | null): void {
  obterAmbiente().store.atualizar((e) => comTotem(e, { dispositivoId }));
}

/** O quiosque liga ao montar e desliga ao sair (a toolbar some em AUTO, como no palco). */
export function definirQuiosqueAtivo(quiosqueAtivo: boolean): void {
  obterAmbiente().store.atualizar((e) => comTotem(e, { quiosqueAtivo }));
}

/** Força o estado de um totem (toolbar). Sem auditoria: a pausa e a revogação reais são do painel de dispositivos. */
export function forcarEstadoDispositivo(dispositivoId: string, estado: EstadoDispositivo): void {
  obterAmbiente().store.atualizar((e) => {
    const atual = e.banco.dispositivos.find((d) => d.id === dispositivoId);
    if (!atual || atual.estado === estado) return e;
    return {
      ...e,
      banco: { ...e.banco, dispositivos: e.banco.dispositivos.map((d) => (d.id === dispositivoId ? { ...d, estado } : d)) },
    };
  });
}
