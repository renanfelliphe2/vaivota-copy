import { obterAmbiente } from "./ambiente";
import type { ConfigSimulador, Grupo, RitmoSimulador } from "@/dominio/tipos";
import { CRIAR_VOTOS_SIMULADOS } from "./simularVotos";

// Etapa 7: ações síncronas do painel e da seção Dashboard da toolbar (protótipo).
// `ui.dashboard` é estado de tela; o resto só existe para a validação (D12, 5.12).

/** "Mostrar resultado" (C17): grava a chave `eventoId:versao` já revelada. */
export function mostrarResultado(chave: string): void {
  obterAmbiente().store.atualizar((e) =>
    e.ui.dashboard.resultadoVisivel === chave ? e : { ...e, ui: { ...e.ui, dashboard: { resultadoVisivel: chave } } },
  );
}

export function definirSimularVotos(ligado: boolean): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, dev: { ...e.dev, simularVotosEntrando: ligado } }));
}

/** Troca o ritmo de um tipo de voto do simulador (ou a configuração inteira, ao restaurar a demonstração). */
export function definirConfigSimulador(config: ConfigSimulador): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, dev: { ...e.dev, simuladorVotos: { ...e.dev.simuladorVotos, ...config } } }));
}

export function definirRitmoSimulador(grupo: Grupo, mudanca: Partial<RitmoSimulador>): void {
  obterAmbiente().store.atualizar((e) => ({
    ...e,
    dev: { ...e.dev, simuladorVotos: { ...e.dev.simuladorVotos, [grupo]: { ...e.dev.simuladorVotos[grupo], ...mudanca } } },
  }));
}

/**
 * Cria `quantidade` votos simulados agora (público, por padrão). Devolve false se nada foi criado: urna fechada,
 * módulo desligado, júri por critério sem critérios ou infantil sem totem ativo.
 */
export function adicionarVotosSimulados(eventoId: string, quantidade: number, grupo: Grupo = "POPULAR"): boolean {
  const { store, relogio } = obterAmbiente();
  const antes = store.getState();
  store.atualizar((e) => CRIAR_VOTOS_SIMULADOS[grupo](e, eventoId, quantidade, relogio.getAgora()));
  return store.getState() !== antes;
}

/** Liga e desliga `ConfigApresentacao.parcialAoVivo` do evento (a flag única, D8; só pela toolbar na Fase 1). */
export function alternarParcialAoVivo(eventoId: string): void {
  obterAmbiente().store.atualizar((e) => ({
    ...e,
    banco: {
      ...e.banco,
      configsApresentacao: e.banco.configsApresentacao.map((c) =>
        c.eventoId === eventoId ? { ...c, parcialAoVivo: !c.parcialAoVivo } : c,
      ),
    },
  }));
}
