import { obterAmbiente } from "@/store/ambiente";
import { recarregarEstado } from "@/store/servidor";
import { chamar } from "./rpc";
import { atraso, falha, simularFalha, sucesso, type Resultado } from "./resultado";

/**
 * Só toolbar do protótipo ("Entrar como" um usuário seed). Não existe no MVP da Maratona Tech Tivit: a sessão é a do cookie do
 * Better Auth e o estado vem do servidor.
 */
export async function entrarComo(usuarioId: string): Promise<Resultado<{ usuarioId: string }>> {
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  const { store } = obterAmbiente();
  if (!store.getState().banco.usuarios.some((u) => u.id === usuarioId)) {
    return falha("NAO_ENCONTRADO", { detalhe: `usuário ${usuarioId} não existe` });
  }
  store.atualizar((e) => ({ ...e, sessao: { usuarioId }, ui: { ...e.ui, loginPendente: null } }));
  return sucesso({ usuarioId });
}

/** Encerra a sessão (a participação continua no banco). */
export async function sair(): Promise<Resultado<null>> {
  const r = await chamar<null>("sair");
  if (!r.ok) return r;
  // Limpa o que era da pessoa (seleção de voto, e-mail pendente) e busca o estado de visitante.
  obterAmbiente().store.atualizar((e) => ({ ...e, ui: { ...e.ui, loginPendente: null, votacao: { ...e.ui.votacao, chave: null, selecaoId: null } } }));
  await recarregarEstado();
  return sucesso(null);
}
