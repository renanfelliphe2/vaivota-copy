import "server-only";
import { exigirAcao } from "@/dominio/travas";
import { validarParceiros } from "@/dominio/validacoesConfig";
import { registrarAuditoria } from "./auditoria";
import { invalidarEstadoPublico } from "./estadoPublico";
import { comEventoTravado } from "./eventoTravado";
import { hashDoIp } from "./ip";
import { falha, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";
import { urlDeImagemValida } from "./storage";

// Parceiros do evento: faixa do telão antes da revelação e página do evento. Identidade visual, então segue a trava do tema (livre
// até o evento ser concluído). O admin salva a lista inteira, na ordem recebida; o logo só vale se foi enviado por este sistema
// (upload em /api/candidatos/imagem) ou se já era o logo salvo do parceiro: nada de endereço externo digitado.

/** `id` null: parceiro novo. */
export type ParceiroEditado = { id: string | null; nome: string; logoUrl: string | null };

export async function salvarParceiros(
  usuario: UsuarioSessao | null,
  eventoId: string,
  lista: readonly ParceiroEditado[],
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "TEMA");
  if (!trava.ok) return trava;
  const campos = validarParceiros(lista.map((p) => p.nome));
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });

  const r = await comEventoTravado(eventoId, "TEMA", async (tx) => {
    const atuais = await tx.parceiro.findMany({ where: { eventoId } });
    const porId = new Map(atuais.map((p) => [p.id, p]));

    for (const [i, p] of lista.entries()) {
      if (p.id !== null && !porId.has(p.id)) return falha("CONFLITO", { mensagem: "A lista mudou. Atualize a tela e tente de novo.", detalhe: `parceiro ${p.id} não existe em ${eventoId}` });
      if (p.logoUrl === null) continue;
      // Logo: o que já está salvo neste parceiro ou um arquivo enviado ao evento.
      const igualAoSalvo = p.id !== null && porId.get(p.id)?.logoUrl === p.logoUrl;
      if (!igualAoSalvo && !urlDeImagemValida(p.logoUrl, eventoId))
        return falha("VALIDACAO", { campos: { [`parceiro-${i}`]: "Envie o logo de novo." }, detalhe: `logoUrl fora do storage: ${p.logoUrl.slice(0, 80)}` });
    }
    if (new Set(lista.flatMap((p) => (p.id ? [p.id] : []))).size !== lista.filter((p) => p.id).length)
      return falha("VALIDACAO", { detalhe: "parceiro repetido na lista" });

    const mantidos = new Set(lista.flatMap((p) => (p.id ? [p.id] : [])));
    const removidos = atuais.filter((p) => !mantidos.has(p.id)).map((p) => p.id);
    if (removidos.length) await tx.parceiro.deleteMany({ where: { id: { in: removidos } } });
    for (const [i, p] of lista.entries()) {
      const dados = { nome: p.nome.trim(), logoUrl: p.logoUrl, ordem: i + 1 };
      if (p.id) await tx.parceiro.update({ where: { id: p.id }, data: dados });
      else await tx.parceiro.create({ data: { eventoId, ...dados } });
    }

    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "PARCEIROS_ALTERADOS",
      entidade: "parceiro",
      entidadeId: eventoId,
      detalhes: { quantidade: lista.length },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
