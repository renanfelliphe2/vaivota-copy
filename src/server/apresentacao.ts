import "server-only";
import { assinaturaDoResultado } from "@/dominio/apresentacao/assinatura";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import { MINIMO_ITENS_ENSAIO, montarDadosEnsaio } from "@/dominio/apresentacao/ensaio";
import { tamanhoDoPodio } from "@/dominio/apresentacao/cerimonia";
import type { AcaoApresentacao, CandidatoPalco, CategoriaPalco, DadosEnsaio, DadosRevelacao, EstadoAoVivo, StatusResultado } from "@/dominio/apresentacao/tipos";
import type { DadosResultado, MotivoResultado } from "@/dominio/tipos";
import { resolverFaseConfig } from "@/dominio/travas";
import { contarVotosPopulares } from "./apuracao";
import { registrarAuditoria } from "./auditoria";
import { faseComResultado } from "./dashboard";
import { db } from "./db";
import { hashDoIp } from "./ip";
import { apresentacaoParaDominio, instante } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// Telão (sala de controle, palco, ensaio e revelação). Tudo é do admin do evento. O resultado só sai por `carregarRevelacao` (com a
// urna encerrada, da maior versão oficial: a leitura nunca recalcula) e por `obterDadosEnsaio` (um resultado inventado que não
// lê voto nenhum). A sala só pergunta `obterStatusResultado` (existe? qual a assinatura?) e nunca vê o resultado.

type ResultadoLinha = { versao: number; motivo: string; calculadoEm: Date; pesoPopular: number; pesoJuri: number; pesoInfantil: number; dados: unknown };

/** Maior versão do resultado oficial, ou null. */
async function resultadoAtual(eventoId: string): Promise<ResultadoLinha | null> {
  return db().resultadoOficial.findFirst({ where: { eventoId }, orderBy: { versao: "desc" } });
}

function assinaturaDe(r: ResultadoLinha, fuso: string): string {
  return assinaturaDoResultado({
    versao: r.versao,
    motivo: r.motivo as MotivoResultado,
    calculadoEm: instante(r.calculadoEm, fuso),
    pesoPopular: r.pesoPopular,
    pesoJuri: r.pesoJuri,
    pesoInfantil: r.pesoInfantil,
    dados: r.dados as DadosResultado,
  });
}

/** As categorias como a cerimônia as usa (25/11/2026): ordem, pódio e os rótulos dos campos (para o crédito do vencedor). */
async function categoriasDaCerimonia(eventoId: string): Promise<CategoriaPalco[]> {
  const [categorias, campos] = await Promise.all([
    db().categoria.findMany({ where: { eventoId }, orderBy: [{ ordem: "asc" }, { id: "asc" }] }),
    db().campoCandidato.findMany({ where: { eventoId }, select: { categoriaId: true, chave: true, rotulo: true } }),
  ]);
  return categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    premio: c.premio,
    canal: c.canal,
    ordem: c.ordem,
    podioTamanho: tamanhoDoPodio(c.podioTamanho),
    podioVotos: c.podioVotos ?? [],
    campos: campos.filter((x) => x.categoriaId === c.id).map((x) => ({ chave: x.chave, rotulo: x.rotulo })),
  }));
}

function extrasDe(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"));
}

/** Cerimônia (25/11/2026): uma revelação só para o evento inteiro; o status é do resultado do evento. */
export async function obterStatusResultado(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<StatusResultado>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  try {
    // Sem resultado fora das fases de encerramento: a versão só existe depois que a urna fecha.
    const atual = faseComResultado(evento) ? await resultadoAtual(eventoId) : null;
    return sucesso({
      existe: atual !== null,
      versao: atual?.versao ?? null,
      assinatura: atual ? assinaturaDe(atual, evento.fusoHorario) : null,
    });
  } catch (e) {
    return falhaInterna(e, "obterStatusResultado");
  }
}

/** Itens que disputam (publicados e não desqualificados), na ordem do evento. */
async function candidatosVotaveis(eventoId: string) {
  return db().candidato.findMany({
    where: { eventoId, publicado: true, desqualificado: false },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
    select: { id: true, titulo: true, imagemUrl: true, ordem: true, categoriaId: true, camposExtras: true },
  });
}

/**
 * Telão com a urna aberta: o total de votos de todos os grupos ligados (jurados contam uma vez, quando já registraram algo) e, só se o
 * admin liberou o parcial ao vivo, o público por item. Fora da urna aberta o parcial nunca sai.
 */
export async function obterEstadoAoVivo(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<EstadoAoVivo>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  try {
    const [config, popular, jurados, infantis] = await Promise.all([
      db().configApresentacao.findUnique({ where: { eventoId }, select: { parcialAoVivo: true } }),
      contarVotosPopulares(db(), eventoId),
      evento.moduloJuri ? db().participacao.count({ where: { eventoId, papel: "JURADO", votou: true } }) : Promise.resolve(0),
      evento.moduloInfantil ? db().votoInfantil.count({ where: { eventoId } }) : Promise.resolve(0),
    ]);
    const totalGeral = Object.values(popular).reduce((s, n) => s + n, 0) + jurados + infantis;
    const liberado = Boolean(config?.parcialAoVivo) && resolverFaseConfig(evento).fase === "URNA_ABERTA";
    const parcial = liberado ? (await candidatosVotaveis(eventoId)).map((c) => ({ candidatoId: c.id, votos: popular[c.id] ?? 0 })) : null;
    return sucesso({ totalGeral, parcial });
  } catch (e) {
    return falhaInterna(e, "obterEstadoAoVivo");
  }
}

/**
 * Uma vez por cerimônia: o resultado oficial como o palco o lê (a versão mais recente, com os itens publicados no momento). Cerimônia
 * (25/11/2026): o evento inteiro de uma vez (a ordem da revelação atravessa as categorias), com a configuração de cada categoria.
 */
export async function carregarRevelacao(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<DadosRevelacao>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  if (!faseComResultado(evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "revelação fora da fase" });
  try {
    const [atual, config, publicados, categorias] = await Promise.all([
      resultadoAtual(eventoId),
      db().configApresentacao.findUnique({ where: { eventoId } }),
      db().candidato.findMany({
        where: { eventoId, publicado: true },
        orderBy: [{ ordem: "asc" }, { id: "asc" }],
        select: { id: true, titulo: true, imagemUrl: true, ordem: true, categoriaId: true, camposExtras: true },
      }),
      categoriasDaCerimonia(eventoId),
    ]);
    if (!atual || !config) return falha("RESULTADO_INDISPONIVEL", { detalhe: "sem versão" });
    const dados = atual.dados as unknown as DadosResultado;
    const fuso = evento.fusoHorario;
    return sucesso({
      versao: atual.versao,
      motivo: atual.motivo as MotivoResultado,
      calculadoEm: instante(atual.calculadoEm, fuso),
      assinatura: assinaturaDe(atual, fuso),
      pesos: { POPULAR: atual.pesoPopular, JURI: atual.pesoJuri, INFANTIL: atual.pesoInfantil },
      dados,
      candidatos: publicados.map((c) => ({ ...c, camposExtras: extrasDe(c.camposExtras) })),
      categorias,
      config: apresentacaoParaDominio(config, fuso),
      modulos: { juri: evento.moduloJuri, infantil: evento.moduloInfantil },
      candidatosNaDisputa: dados.ranking.length,
    });
  } catch (e) {
    return falhaInterna(e, "carregarRevelacao");
  }
}

/** Ensaio: um resultado inventado em cima dos itens e dos módulos do evento. Não lê nem grava voto, resultado ou auditoria. */
export async function obterDadosEnsaio(usuario: UsuarioSessao | null, eventoId: string, cenarioId: string): Promise<Resultado<DadosEnsaio>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  const modulos = { juri: evento.moduloJuri, infantil: evento.moduloInfantil };
  if (!cenariosDoEnsaio(modulos).includes(cenarioId))
    return falha("VALIDACAO", { mensagem: "Este cenário não está disponível neste evento.", detalhe: cenarioId });
  try {
    const [config, votaveis, categorias] = await Promise.all([
      db().configApresentacao.findUnique({ where: { eventoId } }),
      candidatosVotaveis(eventoId),
      categoriasDaCerimonia(eventoId),
    ]);
    if (!config) return falha("NAO_ENCONTRADO", { detalhe: "evento sem ConfigApresentacao" });
    if (votaveis.length < MINIMO_ITENS_ENSAIO)
      return falha("VALIDACAO", { mensagem: `Publique pelo menos ${MINIMO_ITENS_ENSAIO} itens para ensaiar a cerimônia.`, detalhe: `${votaveis.length} votáveis` });
    const candidatos: CandidatoPalco[] = votaveis.map((c) => ({ ...c, camposExtras: extrasDe(c.camposExtras) }));
    const dados = montarDadosEnsaio({
      cenarioId,
      candidatos,
      categorias,
      modulos,
      config: apresentacaoParaDominio(config, evento.fusoHorario),
      calculadoEm: instante(new Date(), evento.fusoHorario),
    });
    if (!dados) return falha("ERRO_INTERNO", { detalhe: `ensaio ${cenarioId} sem dados` });
    return sucesso(dados);
  } catch (e) {
    return falhaInterna(e, "obterDadosEnsaio");
  }
}

/**
 * Trilha da cerimônia (início, conclusão, refeita, emergência). `detalhes` leva só a versão e o índice da cena, nunca vencedores,
 * pontuações ou votos. Só vale com um resultado oficial dessa versão: o palco nunca audita uma cerimônia que não existe.
 */
export async function registrarAcaoApresentacao(
  usuario: UsuarioSessao | null,
  eventoId: string,
  acao: AcaoApresentacao,
  info: { versao: number; cena?: number },
  ctx: { ip: string },
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  if (!faseComResultado(evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "cerimônia fora da fase" });
  try {
    const existe = await db().resultadoOficial.findUnique({ where: { eventoId_versao: { eventoId, versao: info.versao } }, select: { versao: true } });
    if (!existe) return falha("VALIDACAO", { detalhe: `versão ${info.versao} do resultado não existe` });
    await registrarAuditoria(db(), {
      eventoId,
      usuarioId,
      acao,
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: info.cena === undefined ? { versao: info.versao } : { versao: info.versao, cena: info.cena },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso(null);
  } catch (e) {
    return falhaInterna(e, "registrarAcaoApresentacao");
  }
}
