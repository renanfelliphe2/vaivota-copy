import type { Relogio } from "./relogio";
import type { Store } from "./criarStore";

// Ponteiro para o store e o relógio da montagem atual, para que serviços e ações da toolbar (funções
// comuns, chamadas por eventos de tela) leiam o estado mais recente depois de cada `await` (D1, regra 2).
// Só é definido no navegador (D18: instância única); no servidor nenhum serviço é chamado.

export type Ambiente = { store: Store; relogio: Relogio };

let atual: Ambiente | null = null;

export function definirAmbiente(ambiente: Ambiente): void {
  atual = ambiente;
}

export function obterAmbiente(): Ambiente {
  if (!atual) throw new Error("Ambiente do protótipo não iniciado: serviços só rodam no navegador, dentro do AppProvider.");
  return atual;
}
