import { obterAmbiente } from "@/store/ambiente";
import { atraso, falha, simularFalha, sucesso, type Resultado } from "./resultado";

/** Abre a sessão de um usuário existente (a Etapa 3 usa ao confirmar o código; a toolbar usa forcarSessao). */
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
  await atraso();
  const erro = simularFalha();
  if (erro) return erro;
  obterAmbiente().store.atualizar((e) => ({ ...e, sessao: { usuarioId: null }, ui: { ...e.ui, loginPendente: null } }));
  return sucesso(null);
}
