import "server-only";
import { randomBytes } from "node:crypto";
import { enderecosDasCategorias, validarCategorias } from "@/dominio/categorias";
import type { CanalCategoria } from "@/dominio/tipos";
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
// 24/11/2026: o endereço não é mais digitado: o servidor o gera do nome a cada salvamento (renomear muda o endereço). Com a
// urna aberta, as categorias mantêm o endereço que têm (o QR Code já está em uso), mesmo renomeadas.

/**
 * `id` null: categoria nova. `premio`/`descricao` vazios: sem prêmio/descrição. `descricao` ausente: mantém a salva. `slug`, se
 * vier (clientes antigos), é ignorado.
 */
export type CategoriaEditadaServidor = {
  id: string | null;
  nome: string;
  premio: string;
  descricao?: string;
  canal?: CanalCategoria;
  slug?: string;
  /** D1 (25/11/2026): só na categoria nova, a categoria (do mesmo evento) de onde copiar os campos extras. */
  copiarCamposDe?: string | null;
};

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
  const limpa = lista.map((c) => ({ id: c.id, nome: c.nome.trim(), premio: c.premio.trim(), descricao: c.descricao?.trim(), canal: c.canal, copiarCamposDe: c.copiarCamposDe }));
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

    // Endereços do nome; com a estrutura travada (urna aberta), as que já existem ficam com o endereço atual.
    const estruturaLivre = exigirAcao(evento, "CATEGORIAS_ESTRUTURA").ok;
    const manter = new Map<number, string>();
    if (!estruturaLivre) limpa.forEach((c, i) => c.id && manter.set(i, porId.get(c.id)!.slug));
    const slugs = enderecosDasCategorias(limpa.map((c) => c.nome), manter);
    // Canal (25/11/2026): ausente, a salva mantém o dela e a nova nasce ONLINE.
    const comSlug = limpa.map((c, i) => ({ ...c, slug: slugs[i], canal: c.canal ?? (c.id ? porId.get(c.id)!.canal : "ONLINE") }));

    const mantidas = new Set(ids);
    const removidas = atuais.filter((c) => !mantidas.has(c.id));
    const novas = comSlug.filter((c) => c.id === null);
    const enderecoTrocado = comSlug.filter((c) => c.id !== null && porId.get(c.id)!.slug !== c.slug);
    const canalTrocado = comSlug.filter((c) => c.id !== null && porId.get(c.id)!.canal !== c.canal);
    if (removidas.length || novas.length || enderecoTrocado.length || canalTrocado.length) {
      const estrutura = exigirAcao(evento, "CATEGORIAS_ESTRUTURA");
      if (!estrutura.ok) return estrutura;
    }

    // Categoria que deixa o totem (removida ou passada para a página) não pode estar num totem em uso: ele ficaria sem ela.
    const saemDoTotem = [...removidas, ...canalTrocado.map((c) => porId.get(c.id!)!)].filter((c) => c.canal === "TOTEM");
    if (saemDoTotem.length) {
      const idsSaem = saemDoTotem.map((c) => c.id);
      const emUso = await tx.dispositivoCategoria.findMany({
        where: { categoriaId: { in: idsSaem }, dispositivo: { estado: { not: "REVOGADO" } } },
        select: { categoria: { select: { nome: true } }, dispositivo: { select: { nome: true } } },
      });
      if (emUso.length)
        return falha("CONFLITO", {
          mensagem: `${emUso[0].categoria.nome} está no totem ${emUso[0].dispositivo.nome}. Tire a categoria do totem (seção Totens) antes.`,
          detalhe: `categorias em totens: ${emUso.length}`,
        });
      // Totens revogados não votam mais: a ligação deles some junto.
      await tx.dispositivoCategoria.deleteMany({ where: { categoriaId: { in: idsSaem } } });
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
    // D1: a categoria nova pode nascer com os campos extras de outra (que continue no evento), com as mesmas chaves.
    const origem = (c: (typeof comSlug)[number]) => (c.id === null && c.copiarCamposDe && porId.has(c.copiarCamposDe) && mantidas.has(c.copiarCamposDe) ? c.copiarCamposDe : null);
    const copias = new Map<string, { chave: string; rotulo: string; ordem: number }[]>();
    for (const c of comSlug) {
      const de = origem(c);
      if (de && !copias.has(de))
        copias.set(de, await tx.campoCandidato.findMany({ where: { categoriaId: de }, select: { chave: true, rotulo: true, ordem: true }, orderBy: { ordem: "asc" } }));
    }
    const camposCopiados: { categoria: string; de: string; campos: number }[] = [];
    for (const [i, c] of comSlug.entries()) {
      const dados = { nome: c.nome, premio: c.premio || null, ...(c.descricao !== undefined && { descricao: c.descricao || null }), slug: c.slug, canal: c.canal, ordem: i + 1 };
      if (c.id) await tx.categoria.update({ where: { id: c.id }, data: dados });
      else {
        const nova = await tx.categoria.create({ data: { eventoId, ...dados }, select: { id: true } });
        const de = origem(c);
        const campos = de ? (copias.get(de) ?? []) : [];
        if (campos.length) {
          await tx.campoCandidato.createMany({ data: campos.map((k) => ({ eventoId, categoriaId: nova.id, chave: k.chave, rotulo: k.rotulo, ordem: k.ordem })) });
          camposCopiados.push({ categoria: c.nome, de: porId.get(de!)!.nome, campos: campos.length });
        }
      }
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
        canaisTrocados: canalTrocado.map((c) => ({ categoria: c.nome, para: c.canal })),
        ...(camposCopiados.length && { camposCopiados }),
      },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/**
 * Curtas de uma categoria (24/11/2026): a seção Categorias manda a lista inteira de itens da categoria. Quem entra e estava em
 * outra categoria muda de categoria; quem sai fica sem categoria. Mudar item de categoria é estrutura (trava com a urna aberta,
 * como na edição do item). Item na votação não sai para "sem categoria": no evento com categorias, ele sumiria de todas as páginas.
 */
export async function vincularCandidatosCategoria(
  usuario: UsuarioSessao | null,
  eventoId: string,
  categoriaId: string,
  candidatoIds: readonly string[],
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "CATEGORIAS_ESTRUTURA");
  if (!trava.ok) return trava;
  const ids = [...new Set(candidatoIds)];

  const r = await comEventoTravado(eventoId, "CATEGORIAS_ESTRUTURA", async (tx) => {
    const categoria = await tx.categoria.findFirst({ where: { id: categoriaId, eventoId }, select: { id: true, nome: true } });
    if (!categoria) return falha("CONFLITO", { mensagem: "A categoria não existe mais. Atualize a tela.", detalhe: `categoria ${categoriaId} fora de ${eventoId}` });
    const doEvento = await tx.candidato.findMany({ where: { id: { in: ids }, eventoId }, select: { id: true } });
    if (doEvento.length !== ids.length)
      return falha("CONFLITO", { mensagem: "A lista mudou. Atualize a tela e tente de novo.", detalhe: `itens fora de ${eventoId}` });

    const atuais = await tx.candidato.findMany({ where: { eventoId, categoriaId }, select: { id: true, titulo: true, publicado: true } });
    const ficam = new Set(ids);
    const saem = atuais.filter((c) => !ficam.has(c.id));
    const naVotacao = saem.filter((c) => c.publicado);
    if (naVotacao.length)
      return falha("VALIDACAO", {
        mensagem: `${naVotacao.map((c) => `"${c.titulo}"`).join(", ")} ${naVotacao.length === 1 ? "está" : "estão"} na votação: tire da votação ou mova para outra categoria antes.`,
        detalhe: `itens publicados sairiam sem categoria: ${naVotacao.map((c) => c.id).join(", ")}`,
      });
    const jaEstavam = new Set(atuais.map((c) => c.id));
    const entram = ids.filter((id) => !jaEstavam.has(id));
    if (!entram.length && !saem.length) return sucesso(null);

    if (saem.length) await tx.candidato.updateMany({ where: { id: { in: saem.map((c) => c.id) } }, data: { categoriaId: null } });
    // D1 (25/11/2026): quem entra fica só com os valores dos campos que esta categoria tem (a tela perguntou antes). Quem sai
    // para "sem categoria" guarda os valores: não há campos para comparar.
    let camposPerdidos = 0;
    if (entram.length) {
      const chaves = new Set((await tx.campoCandidato.findMany({ where: { categoriaId }, select: { chave: true } })).map((c) => c.chave));
      const vindos = await tx.candidato.findMany({ where: { id: { in: entram } }, select: { id: true, camposExtras: true } });
      for (const c of vindos) {
        const valores = (c.camposExtras as Record<string, string> | null) ?? {};
        const ficam = Object.fromEntries(Object.entries(valores).filter(([k]) => chaves.has(k)));
        const perdidos = Object.keys(valores).length - Object.keys(ficam).length;
        camposPerdidos += perdidos;
        await tx.candidato.update({ where: { id: c.id }, data: { categoriaId, ...(perdidos > 0 && { camposExtras: ficam }) } });
      }
    }

    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CONFIG_ALTERADA",
      entidade: "categoria",
      entidadeId: categoriaId,
      detalhes: { categoria: categoria.nome, entraram: entram.length, sairam: saem.length, ...(camposPerdidos > 0 && { valoresApagados: camposPerdidos }) },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
