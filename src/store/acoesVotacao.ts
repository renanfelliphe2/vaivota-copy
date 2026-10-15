import { chaveVinculo } from "@/dominio/aplicarVoto";
import type { EstadoApp, EstadoUiVotacao } from "@/dominio/tipos";
import { criarVotacaoInicial } from "./estadoInicial";
import { obterAmbiente } from "./ambiente";

// Etapa 5 (seção 5.1): única escrita em `ui.votacao`. Toda escrita grava a chave atual
// (`${usuarioId}:${eventoId}`) e zera o que pertencia a outra chave (D1).

type Mudanca = Partial<Omit<EstadoUiVotacao, "chave">>;

function comVotacao(estado: EstadoApp, eventoId: string, mudar: (atual: EstadoUiVotacao) => Mudanca): EstadoApp {
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return estado;
  const chave = chaveVinculo(usuarioId, eventoId);
  const atual = estado.ui.votacao.chave === chave ? estado.ui.votacao : { ...criarVotacaoInicial(), chave };
  return { ...estado, ui: { ...estado.ui, votacao: { ...atual, ...mudar(atual), chave } } };
}

function atualizar(eventoId: string, mudar: (atual: EstadoUiVotacao) => Mudanca): void {
  obterAmbiente().store.atualizar((e) => comVotacao(e, eventoId, mudar));
}

/** Escolhe (ou limpa) o candidato; zera aviso e falha. */
export function selecionarCandidato(eventoId: string, candidatoId: string | null): void {
  atualizar(eventoId, () => ({ selecaoId: candidatoId, aviso: null, falhaEnvio: null }));
}

/**
 * Trava síncrona contra duplo clique (seção 5.6, passo 1): devolve false se já há envio em andamento.
 * Grava ENVIANDO antes de qualquer `await`.
 */
export function iniciarEnvio(eventoId: string): boolean {
  const { store } = obterAmbiente();
  const estado = store.getState();
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return false;
  const v = estado.ui.votacao;
  if (v.chave === chaveVinculo(usuarioId, eventoId) && v.envio !== "OCIOSO") return false;
  store.atualizar((e) => comVotacao(e, eventoId, () => ({ envio: "ENVIANDO", falhaEnvio: null, aviso: null })));
  return true;
}

/** Um único `atualizar` por conclusão (seção 5.6, passo 3). */
export function concluirEnvio(eventoId: string, parcial: Mudanca): void {
  atualizar(eventoId, () => parcial);
}

/** "Alterar meu voto" (jurado): sai do sucesso. */
export function descartarSucesso(eventoId: string): void {
  atualizar(eventoId, () => ({ ultimoVoto: null }));
}

/**
 * "Resetar meu voto" (toolbar, D15): só com a urna aberta. Público pelo `dev.vinculosVoto`; júri pela
 * participação (VotoJuri e histórico, notas e escolhas por critério). Limpa `ui.votacao`. Devolve a mensagem para a toolbar.
 */
export function resetarMeuVoto(eventoId: string): string {
  const { store } = obterAmbiente();
  const estado = store.getState();
  const usuarioId = estado.sessao.usuarioId;
  if (!usuarioId) return "Entre como um usuário antes.";
  const evento = estado.banco.eventos.find((e) => e.id === eventoId);
  if (!evento || evento.estadoUrna !== "ABERTA") return "Recusado: a urna não está aberta.";
  const participacao = estado.banco.participacoes.find((p) => p.usuarioId === usuarioId && p.eventoId === eventoId);
  if (!participacao?.votou) return "Este usuário não tem voto neste evento.";

  const chave = chaveVinculo(usuarioId, eventoId);
  store.atualizar((e) => {
    let banco = e.banco;
    let vinculosVoto = e.dev.vinculosVoto;
    if (participacao.papel === "PUBLICO") {
      const votoId = vinculosVoto[chave];
      banco = { ...banco, votos: banco.votos.filter((v) => v.id !== votoId) };
      vinculosVoto = Object.fromEntries(Object.entries(vinculosVoto).filter(([k]) => k !== chave));
    } else if (participacao.papel === "JURADO") {
      // Todos os modos do júri: voto único, notas e escolhas por critério (08/10/2026).
      const ids = new Set(banco.votosJuri.filter((v) => v.participacaoId === participacao.id).map((v) => v.id));
      banco = {
        ...banco,
        votosJuri: banco.votosJuri.filter((v) => !ids.has(v.id)),
        historicoVotosJuri: banco.historicoVotosJuri.filter((h) => !ids.has(h.votoJuriId)),
        notasJuri: banco.notasJuri.filter((n) => n.participacaoId !== participacao.id),
        escolhasCriterioJuri: banco.escolhasCriterioJuri.filter((x) => x.participacaoId !== participacao.id),
      };
    }
    banco = { ...banco, participacoes: banco.participacoes.map((p) => (p.id === participacao.id ? { ...p, votou: false } : p)) };
    return {
      ...e,
      banco,
      ui: { ...e.ui, votacao: criarVotacaoInicial() },
      dev: { ...e.dev, vinculosVoto },
    };
  });
  return "Voto removido.";
}
