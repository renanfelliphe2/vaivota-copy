import type { EstadoApp } from "./tipos";

// Abas sincronizadas (08/10/2026): a apresentação abre em outra aba, que vai para o telão (tela estendida), e o
// admin segue operando na primeira. Todas as abas do protótipo compartilham o banco e quase toda a `ui` e o `dev`;
// o que é da janela fica com ela. Pura: a troca de mensagens fica em store/sincronizarAbas.

/**
 * Funde o estado recebido de outra aba com o desta. Ficam desta aba: o palco no ar, o totem (cada aba é um
 * aparelho), o diálogo de acesso, a escolha de voto em andamento, o resultado revelado no painel e a visibilidade
 * da toolbar. A sessão vem da outra aba só ao abrir (`comSessao`): depois, trocar de usuário numa aba (ex.: entrar
 * como jurado na demonstração) não tira o admin do telão.
 */
export function mesclarEstadoRemoto(local: EstadoApp, remoto: EstadoApp, opcoes: { comSessao: boolean }): EstadoApp {
  return {
    banco: remoto.banco,
    sessao: opcoes.comSessao ? remoto.sessao : local.sessao,
    ui: {
      ...remoto.ui,
      palcoAtivo: local.ui.palcoAtivo,
      totem: local.ui.totem,
      acesso: local.ui.acesso,
      votacao: local.ui.votacao,
      dashboard: local.ui.dashboard,
    },
    dev: {
      ...remoto.dev,
      toolbarModo: local.dev.toolbarModo,
      toolbarRecolhida: local.dev.toolbarRecolhida,
      toolbarAvancadas: local.dev.toolbarAvancadas,
    },
  };
}
