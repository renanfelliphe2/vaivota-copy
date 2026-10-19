import "server-only";
import type { Evento as EventoLinha, Prisma } from "@/generated/prisma/client";
import { gerarChave } from "@/dominio/camposExtras";
import type { OrdemCandidatos } from "@/dominio/tipos";
import { exigirAcao, resolverFaseConfig, type AcaoConfig } from "@/dominio/travas";
import { LIMITES, validarCandidato, validarMotivo, validarRotuloCampo, type DadosCandidato } from "@/dominio/validacoesConfig";
import { congelarResultado } from "./apuracao";
import { registrarAuditoria } from "./auditoria";
import { db, type Transacao } from "./db";
import { invalidarEstadoPublico } from "./estadoPublico";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";
import { urlDeImagemValida } from "./storage";

// ST2: candidatos (os "projetos" da Maratona Tech Tivit) e campos extras (equipe, tecnologias). Só o admin do evento chama.
// A imagem vem do upload (src/server/upload.ts): aqui `imagemUrl` só aceita o que o próprio sistema gravou.

function limparCampos(chavesDoEvento: Set<string>, campos: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(campos)
      .filter(([k, v]) => chavesDoEvento.has(k) && v.trim() !== "")
      .map(([k, v]) => [k, v.trim()]),
  );
}

async function chavesDosCampos(eventoId: string): Promise<Set<string>> {
  const campos = await db().campoCandidato.findMany({ where: { eventoId }, select: { chave: true } });
  return new Set(campos.map((c) => c.chave));
}

function imagemInvalida(eventoId: string, imagemUrl: string | null) {
  if (imagemUrl === null || urlDeImagemValida(imagemUrl, eventoId)) return null;
  return falha("VALIDACAO", { campos: { imagemUrl: "Envie a imagem de novo." }, detalhe: `imagemUrl fora do storage: ${imagemUrl.slice(0, 80)}` });
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
  const erros = validarCandidato(dados, { naVotacao: false });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const recusaImagem = imagemInvalida(eventoId, dados.imagemUrl);
  if (recusaImagem) return recusaImagem;

  const chaves = await chavesDosCampos(eventoId);
  const r = await comEventoTravado(eventoId, "CANDIDATOS_PUBLICACAO", async (tx) => {
    const maior = await tx.candidato.aggregate({ where: { eventoId }, _max: { ordem: true } });
    const novo = await tx.candidato.create({
      data: {
        eventoId,
        titulo: dados.titulo.trim(),
        imagemUrl: dados.imagemUrl,
        publicado: false, // sempre nasce como rascunho
        ordem: (maior._max.ordem ?? 0) + 1,
        camposExtras: limparCampos(chaves, dados.camposExtras),
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
  const erros = validarCandidato(dados, { naVotacao: atual.publicado });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });
  const recusaImagem = imagemInvalida(eventoId, dados.imagemUrl);
  if (recusaImagem) return recusaImagem;

  try {
    const chaves = await chavesDosCampos(eventoId);
    const camposExtras = limparCampos(chaves, dados.camposExtras);
    const titulo = dados.titulo.trim();
    const alterados: string[] = [];
    if (titulo !== atual.titulo) alterados.push("titulo");
    if (dados.imagemUrl !== atual.imagemUrl) alterados.push("imagemUrl");
    if (JSON.stringify(camposExtras) !== JSON.stringify(atual.camposExtras ?? {})) alterados.push("camposExtras");
    if (alterados.length === 0) return sucesso(null);

    const { fase } = resolverFaseConfig(evento);
    await db().$transaction(async (tx) => {
      await tx.candidato.update({
        where: { id: candidatoId },
        data: { titulo, imagemUrl: dados.imagemUrl, camposExtras },
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
    const votos = await tx.voto.count({ where: { candidatoId } });
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

export type CampoEditado = { chave?: string; rotulo: string };

/**
 * Cria, renomeia, reordena e remove campos extras. Remover apaga os valores nos candidatos na mesma operação.
 * Estrutura (adicionar e remover) trava com a urna aberta; rótulo e ordem são corrigíveis com auditoria.
 */
export async function salvarCamposExtras(
  usuario: UsuarioSessao | null,
  eventoId: string,
  campos: CampoEditado[],
  motivo?: string,
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const atuais = await db().campoCandidato.findMany({ where: { eventoId }, orderBy: { ordem: "asc" } });
  const chavesNovas = new Set(campos.filter((c) => c.chave).map((c) => c.chave!));
  const removidos = atuais.filter((c) => !chavesNovas.has(c.chave)).map((c) => c.chave);
  const adicionados = campos.filter((c) => !c.chave).map((c) => c.rotulo.trim());
  const renomeados = campos.filter((c) => c.chave && atuais.find((a) => a.chave === c.chave)?.rotulo !== c.rotulo.trim()).map((c) => c.chave!);
  const reordenado =
    campos.filter((c) => c.chave).map((c) => c.chave).join() !== atuais.filter((a) => chavesNovas.has(a.chave)).map((a) => a.chave).join();

  if (removidos.length || adicionados.length) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ESTRUTURA");
    if (!trava.ok) return trava;
  }
  if (renomeados.length || reordenado) {
    const trava = exigirAcao(evento, "CAMPOS_EXTRAS_ROTULO");
    if (!trava.ok) return trava;
  }
  if (!removidos.length && !adicionados.length && !renomeados.length && !reordenado) return sucesso(null);

  if (campos.length > LIMITES.maxCampos) return falha("VALIDACAO", { campos: { campos: `Use no máximo ${LIMITES.maxCampos} campos.` } });
  const erros: Record<string, string> = {};
  campos.forEach((c, i) => {
    const outros = campos.filter((_, k) => k !== i).map((o) => o.rotulo);
    const e = validarRotuloCampo(c.rotulo, outros);
    if (e) erros[`rotulo:${i}`] = e;
  });
  if (Object.keys(erros).length) return falha("VALIDACAO", { campos: erros });

  try {
    await db().$transaction(async (tx) => {
      await travarEvento(tx, eventoId);
      const chaves = atuais.map((a) => a.chave);
      for (const [i, c] of campos.entries()) {
        const existente = c.chave ? atuais.find((a) => a.chave === c.chave) : undefined;
        if (existente) {
          await tx.campoCandidato.update({ where: { id: existente.id }, data: { rotulo: c.rotulo.trim(), ordem: i + 1 } });
        } else {
          const chave = gerarChave(c.rotulo, chaves);
          chaves.push(chave);
          await tx.campoCandidato.create({ data: { eventoId, chave, rotulo: c.rotulo.trim(), ordem: i + 1 } });
        }
      }
      if (removidos.length) {
        await tx.campoCandidato.deleteMany({ where: { eventoId, chave: { in: removidos } } });
        const candidatos = await tx.candidato.findMany({ where: { eventoId }, select: { id: true, camposExtras: true } });
        for (const c of candidatos) {
          const valores = c.camposExtras as Record<string, string> | null;
          if (!valores || !removidos.some((k) => k in valores)) continue;
          const restantes = Object.fromEntries(Object.entries(valores).filter(([k]) => !removidos.includes(k)));
          await tx.candidato.update({ where: { id: c.id }, data: { camposExtras: restantes as Prisma.InputJsonValue } });
        }
      }
      await registrarAuditoria(tx, {
        eventoId,
        usuarioId,
        acao: "CONFIG_ALTERADA",
        entidade: "campo_candidato",
        detalhes: { adicionados, removidos, renomeados, reordenado, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) },
      });
    });
    invalidarEstadoPublico();
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "salvarCamposExtras");
  }
}
