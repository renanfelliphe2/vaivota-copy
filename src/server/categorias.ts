import "server-only";
import { randomBytes } from "node:crypto";
import { validarCategorias } from "@/dominio/categorias";
import { exigirAcao } from "@/dominio/travas";
import { registrarAuditoria } from "./auditoria";
import { invalidarEstadoPublico } from "./estadoPublico";
import { comEventoTravado } from "./eventoTravado";
import { hashDoIp } from "./ip";
import { falha, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Categorias do evento (Festival, 09/11/2026). O admin salva a lista inteira, na ordem recebida, como os parceiros.
// Estrutura (criar, remover, trocar o endereço) trava com a urna aberta: o voto de cada pessoa é por categoria e o QR Code
// aponta para o endereço. Nome, prêmio e ordem são livres até concluir. Categoria com item ou voto não é removida.

/** `id` null: categoria nova. `premio` vazio: sem prêmio. */
export type CategoriaEditadaServidor = { id: string | null; nome: string; premio: string; slug: string };

export async function salvarCategorias(
  usuario: UsuarioSessao | null,
  eventoId: string,
  lista: readonly CategoriaEditadaServidor[],
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "CATEGORIAS_ROTULO");
  if (!trava.ok) return trava;
  const limpa = lista.map((c) => ({ id: c.id, nome: c.nome.trim(), premio: c.premio.trim(), slug: c.slug.trim() }));
  const campos = validarCategorias(limpa);
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });
  const ids = limpa.flatMap((c) => (c.id ? [c.id] : []));
  if (new Set(ids).size !== ids.length) return falha("VALIDACAO", { detalhe: "categoria repetida na lista" });

  const r = await comEventoTravado(eventoId, "CATEGORIAS_ROTULO", async (tx, evento) => {
    const atuais = await tx.categoria.findMany({ where: { eventoId } });
    const porId = new Map(atuais.map((c) => [c.id, c]));
    const desconhecida = limpa.find((c) => c.id !== null && !porId.has(c.id));
    if (desconhecida)
      return falha("CONFLITO", { mensagem: "A lista mudou. Atualize a tela e tente de novo.", detalhe: `categoria ${desconhecida.id} não existe em ${eventoId}` });

    const mantidas = new Set(ids);
    const removidas = atuais.filter((c) => !mantidas.has(c.id));
    const novas = limpa.filter((c) => c.id === null);
    const enderecoTrocado = limpa.filter((c) => c.id !== null && porId.get(c.id)!.slug !== c.slug);
    if (removidas.length || novas.length || enderecoTrocado.length) {
      const estrutura = exigirAcao(evento, "CATEGORIAS_ESTRUTURA");
      if (!estrutura.ok) return estrutura;
    }

    if (removidas.length) {
      const idsRemovidas = removidas.map((c) => c.id);
      const [itens, votos] = await Promise.all([
        tx.candidato.count({ where: { categoriaId: { in: idsRemovidas } } }),
        tx.participacaoCategoria.count({ where: { categoriaId: { in: idsRemovidas } } }),
      ]);
      if (itens > 0 || votos > 0)
        return falha("CONFLITO", {
          mensagem: "Uma categoria com itens não pode ser removida. Mude os itens de categoria (ou remova-os) antes.",
          detalhe: `categorias removidas com ${itens} item(ns) e ${votos} voto(s)`,
        });
      await tx.categoria.deleteMany({ where: { id: { in: idsRemovidas } } });
    }
    // Troca de endereço em duas etapas: dois endereços trocados entre si não colidem no índice único (evento, endereço).
    for (const c of enderecoTrocado) await tx.categoria.update({ where: { id: c.id! }, data: { slug: `x${randomBytes(8).toString("hex")}` } });
    for (const [i, c] of limpa.entries()) {
      const dados = { nome: c.nome, premio: c.premio || null, slug: c.slug, ordem: i + 1 };
      if (c.id) await tx.categoria.update({ where: { id: c.id }, data: dados });
      else await tx.categoria.create({ data: { eventoId, ...dados } });
    }

    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "categoria",
      entidadeId: eventoId,
      detalhes: {
        quantidade: limpa.length,
        adicionadas: novas.map((c) => c.nome),
        removidas: removidas.map((c) => c.nome),
        enderecosTrocados: enderecoTrocado.map((c) => ({ de: porId.get(c.id!)!.slug, para: c.slug })),
      },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
