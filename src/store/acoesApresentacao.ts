import { chaveApresentacao, type Revelacao } from "@/dominio/apresentacao/revelacao";
import type { EstadoApp, EstadoUiApresentacao, ModoAvanco } from "@/dominio/tipos";
import { paraInstante } from "@/lib/tempo";
import { criarApresentacaoInicial } from "@/mocks/criarEstadoNucleo";
import { obterAmbiente } from "./ambiente";

// Etapa 8 (seção 5.2): única escrita em ui.apresentacao (só no modo real; o ensaio nunca grava).
// Toda escrita grava a chave `${usuarioId}:${eventoId}` e zera o que pertencia a outra chave.

function comApresentacao(estado: EstadoApp, eventoId: string, mudar: (atual: EstadoUiApresentacao) => Partial<EstadoUiApresentacao>): EstadoApp {
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return estado;
  const chave = chaveApresentacao(usuarioId, eventoId);
  const atual = estado.ui.apresentacao.chave === chave ? estado.ui.apresentacao : { ...criarApresentacaoInicial(), chave };
  return { ...estado, ui: { ...estado.ui, apresentacao: { ...atual, ...mudar(atual), chave } } };
}

function atualizar(eventoId: string, mudar: (atual: EstadoUiApresentacao) => Partial<EstadoUiApresentacao>): void {
  obterAmbiente().store.atualizar((e) => comApresentacao(e, eventoId, mudar));
}

export function definirModoSala(eventoId: string, modoSala: "REAL" | "ENSAIO"): void {
  atualizar(eventoId, () => ({ modoSala }));
}

export function definirCenarioEnsaio(eventoId: string, cenarioEnsaioId: string): void {
  atualizar(eventoId, () => ({ cenarioEnsaioId }));
}

export function definirModoAvancoLocal(eventoId: string, modoAvancoLocal: ModoAvanco): void {
  atualizar(eventoId, () => ({ modoAvancoLocal }));
}

export function iniciarRevelacao(eventoId: string, assinatura: string): void {
  const { relogio, store } = obterAmbiente();
  const fuso = store.getState().banco.eventos.find((e) => e.id === eventoId)?.fusoHorario;
  atualizar(eventoId, () => ({
    revelacao: {
      eventoId,
      assinatura,
      situacao: "EM_ANDAMENTO",
      cena: 0,
      passo: 0,
      pausado: false,
      emergencia: false,
      iniciadaEm: paraInstante(relogio.getAgora(), fuso),
    },
  }));
}

/** Grava o progresso do motor real (cena, passo, pausa, situação, emergência). */
export function gravarProgresso(eventoId: string, progresso: Partial<Pick<Revelacao, "cena" | "passo" | "pausado" | "situacao" | "emergencia">>): void {
  atualizar(eventoId, (atual) => (atual.revelacao ? { revelacao: { ...atual.revelacao, ...progresso } } : {}));
}

export function concluirRevelacao(eventoId: string, emergencia = false): void {
  gravarProgresso(eventoId, { situacao: "CONCLUIDA", emergencia });
}

/** Zera a revelação (Recomeçar / Refazer; quem chama audita REVELACAO_REFEITA). */
export function refazerRevelacao(eventoId: string): void {
  atualizar(eventoId, () => ({ revelacao: null }));
}

/** Toolbar "Resetar apresentação": zera ui.apresentacao, sem auditoria. */
export function limparApresentacao(): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, ui: { ...e.ui, apresentacao: criarApresentacaoInicial() } }));
}

export function definirPalcoAtivo(palcoAtivo: boolean): void {
  obterAmbiente().store.atualizar((e) => (e.ui.palcoAtivo === palcoAtivo ? e : { ...e, ui: { ...e.ui, palcoAtivo } }));
}
