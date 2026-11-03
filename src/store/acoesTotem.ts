import { obterAmbiente } from "./ambiente";

// Totem (rev. 4, A7): única escrita em `ui.totem`. O pareamento, o estado do aparelho e o PIN são do servidor
// (src/server/totem.ts e src/server/dispositivos.ts); aqui só o estado de tela do quiosque.

/** O quiosque liga ao montar e desliga ao sair (a toolbar some em AUTO, como no palco). */
export function definirQuiosqueAtivo(quiosqueAtivo: boolean): void {
  obterAmbiente().store.atualizar((e) => (e.ui.totem.quiosqueAtivo === quiosqueAtivo ? e : { ...e, ui: { ...e.ui, totem: { quiosqueAtivo } } }));
}
