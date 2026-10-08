import { exigirAcao } from "@/dominio/travas";
import type { Parceiro } from "@/dominio/tipos";
import { validarParceiros } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "@/store/auditoria";
import { IP_HASH, exigirAdmin, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Parceiros do evento (08/10/2026): faixa do telão antes da revelação e página do evento. Identidade visual, então
// segue a trava do tema (livre até o evento ser concluído). Salva a lista inteira, na ordem recebida.

/** `id` null: parceiro novo. */
export type ParceiroEditado = { id: string | null; nome: string; logoUrl: string | null };

export async function salvarParceiros(eventoId: string, lista: readonly ParceiroEditado[]): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "TEMA");
  if (!trava.ok) return trava;
  const campos = validarParceiros(lista.map((p) => p.nome));
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  const parceiros: Parceiro[] = lista.map((p, i) => ({
    id: p.id ?? crypto.randomUUID(),
    eventoId,
    nome: p.nome.trim(),
    logoUrl: p.logoUrl,
    ordem: i + 1,
  }));
  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  store.atualizar((e) =>
    registrarAuditoria(
      { ...e, banco: { ...e.banco, parceiros: [...e.banco.parceiros.filter((p) => p.eventoId !== eventoId), ...parceiros] } },
      {
        eventoId,
        usuarioId,
        acao: "PARCEIROS_ALTERADOS",
        entidade: "parceiro",
        entidadeId: eventoId,
        detalhes: { quantidade: parceiros.length },
        ipHash: IP_HASH,
        criadoEm: agora,
      },
    ),
  );
  return sucesso(null);
}
