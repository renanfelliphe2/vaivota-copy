import "server-only";
import type { Evento as EventoLinha, Prisma } from "@/generated/prisma/client";
import { chaveValida, gerarChave } from "@/dominio/camposExtras";
import type { OrdemCandidatos, TipoCampo } from "@/dominio/tipos";
import { exigirAcao, resolverFaseConfig, type AcaoConfig } from "@/dominio/travas";
import {
  LIMITES,
  normalizarValorCampo,
  validarCandidato,
  validarMotivo,
  validarRotuloCampo,
  validarValorCampo,
  type DadosCandidato,
} from "@/dominio/validacoesConfig";
import { congelarResultado } from "./apuracao";
import { registrarAuditoria } from "./auditoria";
import { db, type Transacao } from "./db";
import { invalidarEstadoPublico } from "./estadoPublico";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";
import { urlDeImagemValida } from "./storage";

// ST2: candidatos (os "projetos" da Maratona Tech Tivit) e campos extras (equipe, tecnologias). Só o admin do evento chama.
// A imagem vem do upload (src/server/upload.ts): aqui `imagemUrl` só aceita o que o próprio sistema gravou.

type CampoDoItem = { chave: string; tipo: TipoCampo };

/** Só os campos da categoria, sem os vazios, com o valor normalizado pelo tipo (link ganha "https://"). */
function limparCampos(camposDaCategoria: readonly CampoDoItem[], valores: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(valores).flatMap(([k, v]) => {
      const campo = camposDaCategoria.find((c) => c.chave === k);
      const valor = campo ? normalizarValorCampo(campo.tipo, v) : "";
      return valor ? [[k, valor]] : [];
    }),
  );
}

/** D1 (25/11/2026): os campos são da categoria do item. Item sem categoria não tem campos. */
async function camposDoItem(categoriaId: string | null, cliente: Pick<Transacao, "campoCandidato"> = db()): Promise<CampoDoItem[]> {
  if (!categoriaId) return [];
  return cliente.campoCandidato.findMany({ where: { categoriaId }, select: { chave: true, tipo: true } });
}

function imagemInvalida(eventoId: string, imagemUrl: string | null) {
  if (imagemUrl === null || urlDeImagemValida(imagemUrl, eventoId)) return null;
  return falha("VALIDACAO", { campos: { imagemUrl: "Envie a imagem de novo." }, detalhe: `imagemUrl fora do storage: ${imagemUrl.slice(0, 80)}` });
}

/** Categoria escolhida no formulário (09/11/2026): precisa ser do mesmo evento (a FK composta também confere). */
async function categoriaInvalida(eventoId: string, categoriaId: string | null | undefined) {
  if (!categoriaId) return null;
  const existe = await db().categoria.findFirst({ where: { id: categoriaId, eventoId }, select: { id: true } });
  return existe ? null : falha("VALIDACAO", { campos: { categoriaId: "Escolha uma categoria da lista." }, detalhe: `categoria ${categoriaId} fora de ${eventoId}` });
}

/**
 * Roda a ação com a linha do evento TRAVADA e a trava da fase conferida de novo sobre o estado relido. Sem isso, a fase lida
 * antes (em `exigirAdmin`) pode já ter mudado quando a ação grava: um projeto despublicado enquanto outro admin abria a urna,
 * ou uma desqualificação que não gera a versão nova do resultado porque a urna fechou no meio.
 */
async function comEventoTravado<T>(
  eventoId: string,
  acao: AcaoConfig,
  fn: (tx: Transacao, evento: EventoLinha) => Promise<Resultado<T>>,
): Promise<Resultado<T>> {
  try {
    return await db().$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      const evento = await tx.evento.findUniqueOrThrow({ where: { id: eventoId } });
      const trava = exigirAcao(evento, acao);
      if (!trava.ok) return trava;
      return fn(tx, evento);
    });
  } catch (e) {
    return falhaInterna(e, `candidatos: ${acao}`);
  }
}

/** Trava a linha do evento: publicar, remover e editar campos extras não se atropelam. */
async function travarEvento(tx: Transacao, eventoId: string) {
  await tx.$queryRaw`SELECT id FROM evento WHERE id = ${eventoId} FOR NO KEY UPDATE`;
}

export async function criarCandidato(usuario: UsuarioSessao | null, eventoId: string, dados: DadosCandidato): Promise<Resultado<{ id: string }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  const recusaCategoria = await categoriaInvalida(eventoId, dados.categoriaId);
  if (recusaCategoria) return recusaCategoria;
  // 25/11/2026: no evento de categoria única (ex.: "Melhor Projeto"), o item novo já entra nela; com várias, o admin escolhe.
  const categorias = dados.categoriaId ? [] : await db().categoria.findMany({ where: { eventoId }, select: { id: true }, take: 2 });
  const categoriaId = dados.categoriaId ?? (categorias.length === 1 ? categorias[0].id : null);
  const campos = await camposDoItem(categoriaId);
  const erros = validarCandidato(dados, { naVotacao: false, campos });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const recusaImagem = imagemInvalida(eventoId, dados.imagemUrl);
  if (recusaImagem) return recusaImagem;

  const r = await comEventoTravado(eventoId, "CANDIDATOS_PUBLICACAO", async (tx) => {
    const maior = await tx.candidato.aggregate({ where: { eventoId }, _max: { ordem: true } });
    const chaves = await camposDoItem(categoriaId, tx);
    const novo = await tx.candidato.create({
      data: {
        eventoId,
        titulo: dados.titulo.trim(),
        imagemUrl: dados.imagemUrl,
        publicado: false, // sempre nasce como rascunho
        ordem: (maior._max.ordem ?? 0) + 1,
        camposExtras: limparCampos(chaves, dados.camposExtras),
        categoriaId,
      },
      select: { id: true },
    });
    return sucesso({ id: novo.id });
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/** Nunca altera `publicado`, `desqualificado` nem `ordem`. Com a urna aberta ou encerrada, audita a correção. */
export async function salvarCandidato(
  usuario: UsuarioSessao | null,
  eventoId: string,
  candidatoId: string,
  dados: DadosCandidato,
  motivo?: string,
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CANDIDATOS_CORRIGIR");
  if (!trava.ok) return trava;
  const atual = await db().candidato.findFirst({ where: { id: candidatoId, eventoId } });
  if (!atual) return falha("NAO_ENCONTRADO");
  // Mudar de categoria (09/11/2026) é estrutura: trava com a urna aberta (o voto de cada pessoa é por categoria).
  const categoriaId = dados.categoriaId === undefined ? atual.categoriaId : dados.categoriaId;
  const campos = await camposDoItem(categoriaId);
  const erros = validarCandidato(dados, { naVotacao: atual.publicado, campos });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const recusaImagem = imagemInvalida(eventoId, dados.imagemUrl);
  if (recusaImagem) return recusaImagem;
  if (categoriaId !== atual.categoriaId) {
    const travaCategoria = exigirAcao(evento, "CATEGORIAS_ESTRUTURA");
    if (!travaCategoria.ok) return travaCategoria;
    const recusaCategoria = await categoriaInvalida(eventoId, categoriaId);
    if (recusaCategoria) return recusaCategoria;
    if (categoriaId === null && atual.publicado && (await db().categoria.count({ where: { eventoId } })) > 0)
      return falha("VALIDACAO", { campos: { categoriaId: "Na votação, o item precisa de uma categoria." } });
  }

  try {
    // D1: os campos da categoria (a nova, se mudou: os que ela não tem se perdem, depois da pergunta na tela). Item sem categoria
    // não tem campos na tela, e os valores que ele já tinha ficam guardados até entrar numa categoria.
    const camposExtras =
      categoriaId === null
        ? ((atual.camposExtras as Record<string, string> | null) ?? {})
        : limparCampos(campos, dados.camposExtras);
    const titulo = dados.titulo.trim();
    const alterados: string[] = [];
    if (titulo !== atual.titulo) alterados.push("titulo");
    if (dados.imagemUrl !== atual.imagemUrl) alterados.push("imagemUrl");
    if (JSON.stringify(camposExtras) !== JSON.stringify(atual.camposExtras ?? {})) alterados.push("camposExtras");
    if (categoriaId !== atual.categoriaId) alterados.push("categoriaId");
    if (alterados.length === 0) return sucesso(null);

    const { fase } = resolverFaseConfig(evento);
    await db().$transaction(async (tx) => {
      await tx.candidato.update({
        where: { id: candidatoId },
        data: { titulo, imagemUrl: dados.imagemUrl, camposExtras, categoriaId },
      });
      if (fase === "URNA_ABERTA" || fase === "URNA_ENCERRADA") {
        await registrarAuditoria(tx, {
          eventoId,
          usuarioId,
          acao: "CANDIDATO_CORRIGIDO",
          entidade: "candidato",
          entidadeId: candidatoId,
          detalhes: { campos: alterados, fase, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) },
        });
      }
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarCandidato");
  }
}

/** Colocar ou tirar da votação. Colocar exige imagem (invariante 8: o banco também confere, por CHECK). */
export async function alterarPublicacao(usuario: UsuarioSessao | null, eventoId: string, candidatoId: string, publicado: boolean): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  const atual = await db().candidato.findFirst({ where: { id: candidatoId, eventoId } });
  if (!atual) return falha("NAO_ENCONTRADO");
  if (publicado && atual.desqualificado) return falha("CONFLITO", { mensagem: "Item fora da disputa não volta para a votação." });
  if (publicado && !atual.imagemUrl)
    return falha("VALIDACAO", {
      mensagem: "Sem imagem: obrigatória para colocar na votação.",
      campos: { imagemUrl: "Sem imagem: obrigatória para colocar na votação." },
    });
  // Evento com categorias (09/11/2026): item sem categoria não aparece em página nenhuma.
  if (publicado && !atual.categoriaId && (await db().categoria.count({ where: { eventoId } })) > 0)
    return falha("VALIDACAO", {
      mensagem: "Sem categoria: vincule o item a uma categoria (seção Categorias) antes de colocar na votação.",
      campos: { categoriaId: "Vincule o item a uma categoria (seção Categorias) antes de colocar na votação." },
    });
  if (atual.publicado === publicado) return sucesso(null);
  const r = await comEventoTravado(eventoId, "CANDIDATOS_PUBLICACAO", async (tx) => {
    // Relê o candidato com o evento travado: a imagem pode ter sido tirada ou o item desqualificado entre as duas leituras.
    const agora = await tx.candidato.findFirst({ where: { id: candidatoId, eventoId } });
    if (!agora) return falha("NAO_ENCONTRADO");
    if (publicado && (agora.desqualificado || !agora.imagemUrl)) return falha("CONFLITO", { mensagem: "O item mudou. Atualize a tela e tente de novo." });
    await tx.candidato.update({ where: { id: candidatoId }, data: { publicado } });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/**
 * Ordem dos candidatos na votação (19/10/2026, no lugar da reordenação manual): ALEATORIA (padrão) embaralha a cada carga
 * da página; ALFABETICA mostra A–Z. Livre até concluir, sempre com registro na auditoria.
 */
export async function salvarOrdemCandidatos(usuario: UsuarioSessao | null, eventoId: string, ordem: OrdemCandidatos): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CANDIDATOS_ORDEM");
  if (!trava.ok) return trava;
  if (evento.ordemCandidatos === ordem) return sucesso(null);
  try {
    await db().$transaction(async (tx) => {
      await tx.evento.update({ where: { id: eventoId }, data: { ordemCandidatos: ordem } });
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CONFIG_ALTERADA",
        entidade: "evento",
        entidadeId: eventoId,
        detalhes: { campos: ["ordemCandidatos"], de: evento.ordemCandidatos, para: ordem },
      });
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarOrdemCandidatos");
  }
}

/** Recusa (CONFLITO) se o candidato tem qualquer voto (o banco também recusa: FK sem exclusão em cascata). */
export async function removerCandidato(usuario: UsuarioSessao | null, eventoId: string, candidatoId: string): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const trava = exigirAcao(admin.dados.evento, "CANDIDATOS_PUBLICACAO");
  if (!trava.ok) return trava;
  const atual = await db().candidato.findFirst({ where: { id: candidatoId, eventoId }, select: { id: true } });
  if (!atual) return falha("NAO_ENCONTRADO");
  const r = await comEventoTravado(eventoId, "CANDIDATOS_PUBLICACAO", async (tx) => {
    // Qualquer rastro de voto (popular, júri em qualquer modo ou histórico de alteração do júri) impede a remoção.
    const [populares, juri, notas, escolhas, historico] = await Promise.all([
      tx.voto.count({ where: { candidatoId } }),
      tx.votoJuri.count({ where: { candidatoId } }),
      tx.notaJuri.count({ where: { candidatoId } }),
      tx.escolhaCriterioJuri.count({ where: { candidatoId } }),
      tx.historicoVotoJuri.count({ where: { OR: [{ candidatoAnteriorId: candidatoId }, { candidatoNovoId: candidatoId }] } }),
    ]);
    const votos = populares + juri + notas + escolhas + historico;
    if (votos > 0)
      return falha("CONFLITO", {
        detalhe: `candidato ${candidatoId} tem votos`,
        mensagem: "Este item já recebeu voto e não pode ser removido. Tire da votação em vez de remover.",
      });
    await tx.candidato.delete({ where: { id: candidatoId } });
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/** Irreversível. Com a urna encerrada, gera nova versão do resultado (DESQUALIFICACAO) na mesma transação. */
export async function desqualificarCandidato(
  usuario: UsuarioSessao | null,
  eventoId: string,
  candidatoId: string,
  motivo: string,
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const trava = exigirAcao(evento, "CANDIDATOS_DESQUALIFICAR");
  if (!trava.ok) return trava;
  const erroMotivo = validarMotivo(motivo, true);
  if (erroMotivo) return falha("VALIDACAO", { campos: { motivo: erroMotivo } });
  const atual = await db().candidato.findFirst({ where: { id: candidatoId, eventoId } });
  if (!atual) return falha("NAO_ENCONTRADO");
  if (atual.desqualificado) return falha("CONFLITO", { mensagem: "Este item já está fora da disputa." });

  void evento;
  const r = await comEventoTravado(eventoId, "CANDIDATOS_DESQUALIFICAR", async (tx, eventoRelido) => {
    // A fase vem do evento relido COM a linha travada: se a urna fechou entre a leitura e aqui, a versão nova nasce.
    const { fase } = resolverFaseConfig(eventoRelido);
    await tx.candidato.update({ where: { id: candidatoId }, data: { desqualificado: true } });
    await registrarAuditoria(tx, {
      eventoId,
      usuarioId,
      acao: "CANDIDATO_DESQUALIFICADO",
      entidade: "candidato",
      entidadeId: candidatoId,
      detalhes: { motivo: motivo.trim(), fase },
    });
    if (eventoRelido.estadoUrna === "ENCERRADA") await congelarResultado(tx, eventoId, "DESQUALIFICACAO", usuarioId);
    return sucesso(null);
  });
  if (r.ok) invalidarEstadoPublico();
  return r;
}

/**
 * `chave` de um campo que a categoria já tem: renomeia ou reordena. `chave` ausente: campo novo, com a chave gerada do rótulo.
 * D1: `chave` que a categoria ainda não tem (copiar campos de outra categoria): campo novo com essa mesma chave, para o valor
 * continuar valendo quando o item muda entre as duas.
 */
export type CampoEditado = { chave?: string; rotulo: string; tipo?: TipoCampo };

/**
 * Cria, renomeia, reordena e remove os campos extras de UMA categoria (D1, 25/11/2026). Remover apaga os valores nos itens da
 * categoria na mesma operação. Estrutura (adicionar, remover e trocar o tipo) trava com a urna aberta; rótulo e ordem são
 * corrigíveis com auditoria. Trocar o tipo (24/11/2026) é recusado se algum item tem valor que não serve ao tipo novo; os que
 * servem são normalizados (ex.: o link ganha "https://").
 */
export async function salvarCamposExtras(
  usuario: UsuarioSessao | null,
  eventoId: string,
  categoriaId: string,
  campos: CampoEditado[],
  motivo?: string,
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const categoria = await db().categoria.findFirst({ where: { id: categoriaId, eventoId }, select: { id: true, nome: true } });
  if (!categoria) return falha("NAO_ENCONTRADO", { detalhe: `categoria ${categoriaId} fora de ${eventoId}` });
  const atuais = await db().campoCandidato.findMany({ where: { categoriaId }, orderBy: { ordem: "asc" } });
  const existente = (c: CampoEditado) => (c.chave ? atuais.find((a) => a.chave === c.chave) : undefined);
  const chavesNovas = new Set(campos.filter((c) => c.chave).map((c) => c.chave!));
  const removidos = atuais.filter((c) => !chavesNovas.has(c.chave)).map((c) => c.chave);
  const adicionados = campos.filter((c) => !existente(c)).map((c) => c.rotulo.trim());
  const renomeados = campos.filter((c) => existente(c) && existente(c)!.rotulo !== c.rotulo.trim()).map((c) => c.chave!);
  const reordenado =
    campos.filter((c) => existente(c)).map((c) => c.chave).join() !== atuais.filter((a) => chavesNovas.has(a.chave)).map((a) => a.chave).join();
  const tipoDe = (c: CampoEditado): TipoCampo => c.tipo ?? existente(c)?.tipo ?? "TEXTO";
  const tipoTrocado = campos.filter((c) => existente(c) && existente(c)!.tipo !== tipoDe(c)).map((c) => ({ chave: c.chave!, tipo: tipoDe(c) }));

  if (removidos.length || adicionados.length || tipoTrocado.length) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ESTRUTURA");
    if (!trava.ok) return trava;
  }
  if (renomeados.length || reordenado) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ROTULO");
    if (!trava.ok) return trava;
  }
  if (!removidos.length && !adicionados.length && !renomeados.length && !reordenado && !tipoTrocado.length) return sucesso(null);

  if (campos.length > LIMITES.maxCampos) return falha("VALIDACAO", { campos: { campos: `Use no máximo ${LIMITES.maxCampos} campos.` } });
  if (new Set(campos.filter((c) => c.chave).map((c) => c.chave)).size !== campos.filter((c) => c.chave).length)
    return falha("VALIDACAO", { detalhe: "campo repetido na lista" });
  const erros: Record<string, string> = {};
  campos.forEach((c, i) => {
    const outros = campos.filter((_, k) => k !== i).map((o) => o.rotulo);
    const e = validarRotuloCampo(c.rotulo, outros);
    if (e) erros[`rotulo:${i}`] = e;
  });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  // Tipo trocado: todos os valores já preenchidos precisam servir ao tipo novo.
  const valoresDe = (v: Prisma.JsonValue | null) => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {});
  if (tipoTrocado.length) {
    const itens = await db().candidato.findMany({ where: { eventoId, categoriaId }, select: { camposExtras: true } });
    for (const { chave, tipo } of tipoTrocado) {
      const ruins = itens.filter((it) => {
        const v = valoresDe(it.camposExtras)[chave];
        return typeof v === "string" && validarValorCampo(chave, tipo, v) !== null;
      }).length;
      const i = campos.findIndex((c) => c.chave === chave);
      if (ruins) erros[`tipo:${i}`] = `${ruins} item(ns) têm um valor que não serve a este tipo. Corrija o valor antes de trocar o tipo.`;
    }
    if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  }

  try {
    await db().$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      if (removidos.length) await tx.campoCandidato.deleteMany({ where: { categoriaId, chave: { in: removidos } } });
      // As chaves que ficam e as pedidas (copiadas) não podem ser tomadas por uma gerada.
      const chaves = [...atuais.map((a) => a.chave), ...campos.flatMap((c) => (c.chave && !existente(c) ? [c.chave] : []))];
      for (const [i, c] of campos.entries()) {
        const atual = existente(c);
        if (atual) {
          await tx.campoCandidato.update({ where: { id: atual.id }, data: { rotulo: c.rotulo.trim(), tipo: tipoDe(c), ordem: i + 1 } });
        } else {
          const chave = c.chave && chaveValida(c.chave) ? c.chave : gerarChave(c.rotulo, chaves);
          chaves.push(chave);
          await tx.campoCandidato.create({ data: { eventoId, categoriaId, chave, rotulo: c.rotulo.trim(), tipo: tipoDe(c), ordem: i + 1 } });
        }
      }
      if (removidos.length || tipoTrocado.length) {
        const candidatos = await tx.candidato.findMany({ where: { eventoId, categoriaId }, select: { id: true, camposExtras: true } });
        for (const c of candidatos) {
          const valores = valoresDe(c.camposExtras);
          const novos = Object.fromEntries(
            Object.entries(valores)
              .filter(([k]) => !removidos.includes(k))
              .map(([k, v]) => {
                const trocado = tipoTrocado.find((t) => t.chave === k);
                return [k, trocado && typeof v === "string" ? normalizarValorCampo(trocado.tipo, v) : v];
              }),
          );
          if (JSON.stringify(novos) === JSON.stringify(valores)) continue;
          await tx.candidato.update({ where: { id: c.id }, data: { camposExtras: novos as Prisma.InputJsonValue } });
        }
      }
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CONFIG_ALTERADA",
        entidade: "campo_candidato",
        entidadeId: categoriaId,
        detalhes: {
          categoria: categoria.nome,
          adicionados,
          removidos,
          renomeados,
          reordenado,
          ...(tipoTrocado.length ? { tipos: tipoTrocado } : {}),
          ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
        },
      });
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarCamposExtras");
  }
}
