import type { EstadoApp, EstadoUi, EstadoUiApresentacao } from "../tipos";

// Etapa 8 (D4, seção 5.2): leitura filtrada da revelação gravada em ui.apresentacao.

export type Revelacao = NonNullable<EstadoUiApresentacao["revelacao"]>;

export function chaveApresentacao(usuarioId: string, eventoId: string): string {
  return `${usuarioId}:${eventoId}`;
}

/** De quem é a apresentação nesta aba: o usuário da sessão ou, no telão pareado (sem login, 25/11/2026), o admin que o pareou. */
export function donoDaApresentacao(estado: Pick<EstadoApp, "ui" | "sessao">): string | null {
  return estado.ui.donoApresentacao ?? estado.sessao.usuarioId;
}

export function lerRevelacao(
  ui: Pick<EstadoUi, "apresentacao">,
  usuarioId: string | null,
  eventoId: string,
  assinaturaAtual: string | null,
): { revelacao: Revelacao | null; motivoDescartada: "RESULTADO_MUDOU" | null } {
  const { chave, revelacao } = ui.apresentacao;
  if (!usuarioId || !revelacao || chave !== chaveApresentacao(usuarioId, eventoId) || revelacao.eventoId !== eventoId)
    return { revelacao: null, motivoDescartada: null };
  if (revelacao.assinatura !== assinaturaAtual) return { revelacao: null, motivoDescartada: "RESULTADO_MUDOU" };
  return { revelacao, motivoDescartada: null };
}
