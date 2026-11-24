import "server-only";
import { validarGrupos } from "@/dominio/gruposParceiros";
import { exigirAcao } from "@/dominio/travas";
import { normalizarLinkSite, validarParceiros } from "@/dominio/validacoesConfig";
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
// 25/11/2026 (demanda C1): junto vão os grupos (Patrocínio, Realização…), na ordem, e em quais grupos cada parceiro está (um
// parceiro pode estar em vários). Grupo removido só tira os parceiros dele; os parceiros continuam cadastrados.

/** `id` null: grupo novo. `chave`: como os parceiros apontam para o grupo (o id, se já existe; senão uma chave local). */
export type GrupoEditado = { id: string | null; chave: string; nome: string };

/** `id` null: parceiro novo. `grupos`: as chaves dos grupos em que ele está. */
export type ParceiroEditado = { id: string | null; nome: string; logoUrl: string | null; linkUrl?: string | null; grupos?: string[] };

export type DadosParceiros = { grupos: GrupoEditado[]; parceiros: ParceiroEditado[] };

export async function salvarParceiros(
  usuario: UsuarioSessao | null,
  eventoId: string,
  dados: DadosParceiros,
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  const trava = exigirAcao(admin.dados.evento, "TEMA");
  if (!trava.ok) return trava;
  const lista = dados.parceiros;
  const campos = {
    ...validarParceiros(lista.map((p) => p.nome), lista.map((p) => p.linkUrl)),
    ...validarGrupos(dados.grupos.map((g) => g.nome)),
  };
  if (Object.keys(campos).length > 0) return falha("VALIDACAO", { campos });
  const chaves = new Set(dados.grupos.map((g) => g.chave));
  if (chaves.size !== dados.grupos.length) return falha("VALIDACAO", { detalhe: "chave de grupo repetida" });
  if (lista.some((p) => (p.grupos ?? []).some((c) => !chaves.has(c)))) return falha("VALIDACAO", { detalhe: "parceiro em grupo que não está na lista" });
  // Já validado acima: aqui só se grava o endereço normalizado (https:// incluído); vazio vira null.
  const links = lista.map((p) => {
    const l = normalizarLinkSite(p.linkUrl ?? "");
    return l.ok ? l.url : null;
  });

  const r = await comEventoTravado(eventoId, "TEMA", async (tx) => {
    const [atuais, gruposAtuais] = await Promise.all([tx.parceiro.findMany({ where: { eventoId } }), tx.grupoParceiro.findMany({ where: { eventoId } })]);
    const porId = new Map(atuais.map((p) => [p.id, p]));
    const gruposPorId = new Map(gruposAtuais.map((g) => [g.id, g]));
    const conflito = (detalhe: string) => falha("CONFLITO", { mensagem: "A lista mudou. Atualize a tela e tente de novo.", detalhe });

    for (const g of dados.grupos) if (g.id !== null && !gruposPorId.has(g.id)) return conflito(`grupo ${g.id} não existe em ${eventoId}`);
    if (new Set(dados.grupos.flatMap((g) => (g.id ? [g.id] : []))).size !== dados.grupos.filter((g) => g.id).length)
      return falha("VALIDACAO", { detalhe: "grupo repetido na lista" });
    for (const [i, p] of lista.entries()) {
      if (p.id !== null && !porId.has(p.id)) return conflito(`parceiro ${p.id} não existe em ${eventoId}`);
      if (p.logoUrl === null) continue;
      // Logo: o que já está salvo neste parceiro ou um arquivo enviado ao evento.
      const igualAoSalvo = p.id !== null && porId.get(p.id)?.logoUrl === p.logoUrl;
      if (!igualAoSalvo && !urlDeImagemValida(p.logoUrl, eventoId))
        return falha("VALIDACAO", { campos: { [`parceiro-${i}`]: "Envie o logo de novo." }, detalhe: `logoUrl fora do storage: ${p.logoUrl.slice(0, 80)}` });
    }
    if (new Set(lista.flatMap((p) => (p.id ? [p.id] : []))).size !== lista.filter((p) => p.id).length)
      return falha("VALIDACAO", { detalhe: "parceiro repetido na lista" });

    // Grupos: os que saíram são removidos (as ligações com parceiros caem em cascata); os demais, gravados na ordem.
    const gruposMantidos = new Set(dados.grupos.flatMap((g) => (g.id ? [g.id] : [])));
    const gruposRemovidos = gruposAtuais.filter((g) => !gruposMantidos.has(g.id)).map((g) => g.id);
    if (gruposRemovidos.length) await tx.grupoParceiro.deleteMany({ where: { id: { in: gruposRemovidos } } });
    const idDaChave = new Map<string, string>();
    for (const [i, g] of dados.grupos.entries()) {
      const d = { nome: g.nome.trim(), ordem: i + 1 };
      const salvo = g.id ? await tx.grupoParceiro.update({ where: { id: g.id }, data: d }) : await tx.grupoParceiro.create({ data: { eventoId, ...d } });
      idDaChave.set(g.chave, salvo.id);
    }

    const mantidos = new Set(lista.flatMap((p) => (p.id ? [p.id] : [])));
    const removidos = atuais.filter((p) => !mantidos.has(p.id)).map((p) => p.id);
    if (removidos.length) await tx.parceiro.deleteMany({ where: { id: { in: removidos } } });
    const ligacoes: { grupoId: string; parceiroId: string }[] = [];
    for (const [i, p] of lista.entries()) {
      const d = { nome: p.nome.trim(), logoUrl: p.logoUrl, linkUrl: links[i], ordem: i + 1 };
      const salvo = p.id ? await tx.parceiro.update({ where: { id: p.id }, data: d }) : await tx.parceiro.create({ data: { eventoId, ...d } });
      for (const chave of new Set(p.grupos ?? [])) ligacoes.push({ grupoId: idDaChave.get(chave)!, parceiroId: salvo.id });
    }
    // As ligações são reescritas inteiras: é a lista que o admin acabou de ver.
    await tx.parceiroGrupo.deleteMany({ where: { grupo: { eventoId } } });
    if (ligacoes.length) await tx.parceiroGrupo.createMany({ data: ligacoes });

    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "PARCEIROS_ALTERADOS",
      entidade: "parceiro",
      entidadeId: eventoId,
      detalhes: { quantidade: lista.length, grupos: dados.grupos.map((g) => g.nome.trim()) },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}
