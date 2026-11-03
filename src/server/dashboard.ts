import "server-only";
import type { Auditoria as AuditoriaLinha, Evento as EventoLinha } from "@/generated/prisma/client";
import { descreverAuditoria, grupoDaAcao, resumirAuditoria, type GrupoAuditoria } from "@/dominio/auditoria";
import type { Participantes } from "@/dominio/contagens";
import { resumirConvites } from "@/dominio/convites";
import type { ItemAuditoria, OperacaoDados, ResultadoVisao, VotosJuriVisao } from "@/dominio/painel";
import { resumirApuracao } from "@/dominio/resultado";
import { montarSerie } from "@/dominio/serie";
import { resolverSituacaoEvento } from "@/dominio/situacaoEvento";
import type { AcaoAuditoria, DadosResultado, Grupo, MotivoResultado } from "@/dominio/tipos";
import { resolverFaseConfig } from "@/dominio/travas";
import { paraInstante } from "@/lib/tempo";
import { contarVotosJuri } from "./apuracao";
import { db } from "./db";
import { totensDoEvento } from "./dispositivos";
import { apresentacaoParaDominio, eventoParaDominio, instante } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// ST5: leituras do painel. Cálculo e filtro no servidor: durante a votação NUNCA sai contagem por projeto (nem pela
// resposta de rede). Só o total, os participantes e a série no tempo. O resultado por projeto só existe depois do
// encerramento e vem da maior versão do resultado oficial (a leitura nunca recalcula). Nenhum DTO carrega e-mail.

const LIMITE_AUDITORIA = 50;
const LIMITE_MAXIMO_AUDITORIA = 200;
/** Linhas de auditoria lidas para o resumo e os filtros (o evento tem poucas centenas de entradas). */
const LEITURA_AUDITORIA = 2000;

/** Fase do painel permite resultado (encerrada ou concluído). */
export function faseComResultado(evento: Pick<EventoLinha, "estado" | "estadoUrna">): boolean {
  const { fase } = resolverFaseConfig(evento);
  return fase === "URNA_ENCERRADA" || fase === "CONCLUIDO";
}

/** Instante do PRIMEIRO registro de cada jurado (voto único, nota ou escolha): é o que entra na série do júri. */
async function primeirosRegistrosDoJuri(eventoId: string): Promise<string[]> {
  const linhas = await db().$queryRaw<{ em: Date }[]>`
    SELECT MIN(criado_em) AS em FROM (
      SELECT participacao_id, criado_em FROM voto_juri WHERE evento_id = ${eventoId}
      UNION ALL SELECT participacao_id, criado_em FROM nota_juri WHERE evento_id = ${eventoId}
      UNION ALL SELECT participacao_id, criado_em FROM escolha_criterio_juri WHERE evento_id = ${eventoId}
    ) t GROUP BY participacao_id`;
  return linhas.map((l) => l.em.toISOString());
}

/** Série de votos: de urnaAbertaEm até agora (aberta) ou urnaEncerradaEm. */
export async function serieDoEvento(evento: EventoLinha, agoraMs: number) {
  const ateMs = evento.urnaEncerradaEm ? evento.urnaEncerradaEm.getTime() : agoraMs;
  const votos = evento.urnaAbertaEm
    ? await db().voto.findMany({ where: { eventoId: evento.id }, select: { criadoEm: true } })
    : [];
  const juri = evento.urnaAbertaEm && evento.moduloJuri ? await primeirosRegistrosDoJuri(evento.id) : [];
  const infantis =
    evento.urnaAbertaEm && evento.moduloInfantil
      ? await db().votoInfantil.findMany({ where: { eventoId: evento.id }, select: { criadoEm: true } })
      : [];
  return montarSerie({
    abertaEm: evento.urnaAbertaEm ? evento.urnaAbertaEm.toISOString() : null,
    ateMs,
    votos: { popular: votos.map((v) => v.criadoEm.toISOString()), juri, infantil: infantis.map((v) => v.criadoEm.toISOString()) },
    paraInstante: (ms) => paraInstante(ms, evento.fusoHorario),
  });
}

type JuradoLinha = { participacaoId: string; nome: string; rotulo: string | null; votou: boolean };

/** Jurados pelo rótulo do convite USADO ligado à participação; pendentes primeiro, depois por rótulo. */
async function juradosDoEvento(eventoId: string): Promise<JuradoLinha[]> {
  const linhas = await db().participacao.findMany({
    where: { eventoId, papel: "JURADO" },
    select: { id: true, votou: true, usuario: { select: { nome: true } }, conviteJurado: { select: { rotulo: true, estado: true } } },
  });
  return linhas
    .map((p) => ({
      participacaoId: p.id,
      nome: p.usuario.nome,
      rotulo: p.conviteJurado?.estado === "USADO" ? p.conviteJurado.rotulo : null,
      votou: p.votou,
    }))
    .sort(
      (a, b) =>
        Number(a.votou) - Number(b.votou) ||
        (a.rotulo ?? "").localeCompare(b.rotulo ?? "", "pt-BR", { numeric: true }) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

/** Cadastrados e que votaram por papel (ADMIN não conta). */
export async function contarParticipantesDoEvento(eventoId: string): Promise<Participantes> {
  const grupos = await db().participacao.groupBy({
    by: ["papel", "votou"],
    where: { eventoId, papel: { not: "ADMIN" } },
    _count: { _all: true },
  });
  const r: Participantes = { publico: { cadastrados: 0, votaram: 0 }, jurado: { cadastrados: 0, votaram: 0 } };
  for (const g of grupos) {
    const alvo = g.papel === "PUBLICO" ? r.publico : r.jurado;
    alvo.cadastrados += g._count._all;
    if (g.votou) alvo.votaram += g._count._all;
  }
  return r;
}

/** Ator exibido: nome do admin do evento; "Participante" para os demais; "Sistema" sem ator. */
async function atoresDe(eventoId: string, linhas: AuditoriaLinha[]): Promise<(l: AuditoriaLinha) => string> {
  const ids = [...new Set(linhas.map((l) => l.atorUsuarioId).filter((id): id is string => id !== null))];
  const admins = ids.length
    ? await db().participacao.findMany({ where: { eventoId, usuarioId: { in: ids }, papel: "ADMIN" }, select: { usuarioId: true } })
    : [];
  const nomes = admins.length
    ? await db().usuario.findMany({ where: { id: { in: admins.map((a) => a.usuarioId) } }, select: { id: true, nome: true } })
    : [];
  const nomeDoAdmin = new Map(nomes.map((u) => [u.id, u.nome]));
  return (l) => {
    if (l.atorDispositivoId) return "Totem";
    if (!l.atorUsuarioId) return "Sistema";
    return nomeDoAdmin.get(l.atorUsuarioId) ?? "Participante";
  };
}

function itemAuditoria(l: AuditoriaLinha, fuso: string, ator: (l: AuditoriaLinha) => string): ItemAuditoria {
  const entrada = { acao: l.acao as AcaoAuditoria, detalhes: (l.detalhes as Record<string, unknown> | null) ?? null, entidade: l.entidade };
  return {
    id: l.id,
    criadoEm: instante(l.criadoEm, fuso),
    acao: l.acao,
    grupo: grupoDaAcao(l.acao),
    descricao: descreverAuditoria(entrada),
    ator: ator(l),
  };
}

/** Entradas do evento, mais recentes primeiro. */
export async function auditoriaDoEvento(eventoId: string, limite = LEITURA_AUDITORIA): Promise<AuditoriaLinha[]> {
  return db().auditoria.findMany({ where: { eventoId }, orderBy: [{ criadoEm: "desc" }, { id: "desc" }], take: limite });
}

export async function itensDeAuditoria(evento: EventoLinha, linhas: AuditoriaLinha[]): Promise<ItemAuditoria[]> {
  const ator = await atoresDe(evento.id, linhas);
  return linhas.map((l) => itemAuditoria(l, evento.fusoHorario, ator));
}

export async function obterOperacao(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<OperacaoDados>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  try {
    const agoraMs = Date.now();
    const configApresentacao = await db().configApresentacao.findUnique({ where: { eventoId } });
    if (!configApresentacao) return falha("NAO_ENCONTRADO", { detalhe: "evento sem ConfigApresentacao" });
    const { fase, incoerente } = resolverFaseConfig(evento);
    const dominio = eventoParaDominio(evento);

    const [totalPopular, participantes, serie, auditoria, temResultado, juri, jurados, convites, totalInfantil, totens] = await Promise.all([
      db().voto.count({ where: { eventoId } }),
      contarParticipantesDoEvento(eventoId),
      serieDoEvento(evento, agoraMs),
      auditoriaDoEvento(eventoId),
      db().resultadoOficial.count({ where: { eventoId } }),
      evento.moduloJuri ? contarVotosJuri(db(), eventoId) : Promise.resolve({} as Record<string, number>),
      evento.moduloJuri ? juradosDoEvento(eventoId) : Promise.resolve([] as JuradoLinha[]),
      db().conviteJurado.findMany({ where: { eventoId }, select: { estado: true, validadeAte: true } }),
      evento.moduloInfantil ? db().votoInfantil.count({ where: { eventoId } }) : Promise.resolve(0),
      evento.moduloInfantil ? totensDoEvento(db(), eventoId, evento.fusoHorario) : Promise.resolve([] as OperacaoDados["totens"]),
    ]);
    // Total bruto do júri pelo modo ativo (a mesma conta do resultado oficial): sem parcial por candidato, só o total.
    // O infantil também: durante a votação nenhuma contagem por candidato sai do servidor.
    const totais: Record<Grupo, number> = { POPULAR: totalPopular, JURI: Object.values(juri).reduce((s, n) => s + n, 0), INFANTIL: totalInfantil };
    const itens = await itensDeAuditoria(evento, auditoria.slice(0, LIMITE_AUDITORIA));

    return sucesso({
      eventoId,
      fase,
      incoerente,
      situacao: resolverSituacaoEvento(dominio, apresentacaoParaDominio(configApresentacao, evento.fusoHorario), agoraMs, {
        ignorarRascunho: true,
      }),
      janela: { inicio: dominio.janelaInicio, fim: dominio.janelaFim, encerramentoAutomatico: evento.encerramentoAutomatico },
      urna: { abertaEm: dominio.urnaAbertaEm, encerradaEm: dominio.urnaEncerradaEm },
      modulos: { juri: evento.moduloJuri, infantil: evento.moduloInfantil },
      totais,
      participantes,
      serie,
      jurados: jurados.map((j) => ({ rotulo: j.rotulo, nome: j.nome, votou: j.votou })),
      totens,
      convites: resumirConvites(
        convites.map((c) => ({ estado: c.estado, validadeAte: c.validadeAte ? instante(c.validadeAte, evento.fusoHorario) : null })),
        agoraMs,
      ),
      auditoria: {
        resumo: resumirAuditoria(auditoria.map((a) => ({ acao: a.acao as AcaoAuditoria, criadoEm: instante(a.criadoEm, evento.fusoHorario) }))),
        itens,
      },
      // Sem parcial por projeto durante a votação (decisão 5 do MVP): a contagem por projeto nem sai do servidor.
      parcialAoVivo: false,
      parcial: null,
      resultadoDisponivel: faseComResultado(evento) && temResultado > 0,
      geradoEm: paraInstante(agoraMs, evento.fusoHorario),
    });
  } catch (e) {
    return falhaInterna(e, "obterOperacao");
  }
}

/** Visão da maior versão do resultado oficial (sem recalcular). Usada também pela exportação e pelo relatório. */
export async function montarResultadoVisao(evento: EventoLinha, agoraMs: number): Promise<ResultadoVisao | null> {
  const versoes = await db().resultadoOficial.findMany({ where: { eventoId: evento.id }, orderBy: { versao: "desc" } });
  const atual = versoes[0];
  if (!atual) return null;
  const dados = atual.dados as unknown as DadosResultado;
  const pesos: Record<Grupo, number> = { POPULAR: atual.pesoPopular, JURI: atual.pesoJuri, INFANTIL: atual.pesoInfantil };
  const [participantes, serie] = await Promise.all([contarParticipantesDoEvento(evento.id), serieDoEvento(evento, agoraMs)]);
  const fuso = evento.fusoHorario;
  return {
    eventoId: evento.id,
    versao: atual.versao,
    motivo: atual.motivo as MotivoResultado,
    calculadoEm: instante(atual.calculadoEm, fuso),
    pesos,
    dados,
    derivados: resumirApuracao(dados, pesos),
    versoes: versoes.map((r) => ({ versao: r.versao, motivo: r.motivo as MotivoResultado, calculadoEm: instante(r.calculadoEm, fuso) })),
    evento: {
      inicio: evento.urnaAbertaEm ? instante(evento.urnaAbertaEm, fuso) : null,
      fim: evento.urnaEncerradaEm ? instante(evento.urnaEncerradaEm, fuso) : null,
      candidatosNaDisputa: dados.ranking.length,
    },
    participantes,
    serie,
  };
}

export async function obterResultado(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<ResultadoVisao>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  if (!faseComResultado(evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "fase sem resultado" });
  try {
    const visao = await montarResultadoVisao(evento, Date.now());
    if (!visao) return falha("RESULTADO_INDISPONIVEL", { detalhe: "nenhuma versão calculada" });
    return sucesso(visao);
  } catch (e) {
    return falhaInterna(e, "obterResultado");
  }
}

/** Votos identificados do júri (voto único com histórico, notas ou escolhas por critério). Só o admin, só depois do encerramento. */
export async function montarVotosJuri(evento: EventoLinha): Promise<VotosJuriVisao> {
  const eventoId = evento.id;
  const fuso = evento.fusoHorario;
  const [placar, criterios, jurados, votos, notas, escolhas] = await Promise.all([
    db().configPlacar.findUnique({ where: { eventoId }, select: { modoVotoJuri: true } }),
    db().criterioJuri.findMany({ where: { eventoId }, orderBy: [{ ordem: "asc" }, { id: "asc" }], select: { id: true, nome: true } }),
    juradosDoEvento(eventoId),
    db().votoJuri.findMany({ where: { eventoId }, include: { historico: { orderBy: { id: "asc" } } } }),
    db().notaJuri.findMany({ where: { eventoId }, select: { participacaoId: true, candidatoId: true, criterioId: true, nota: true } }),
    db().escolhaCriterioJuri.findMany({ where: { eventoId }, select: { participacaoId: true, criterioId: true, candidatoId: true } }),
  ]);
  const votoDe = new Map(votos.map((v) => [v.participacaoId, v]));
  return {
    modo: placar?.modoVotoJuri ?? "VOTO_UNICO",
    criterios,
    jurados: jurados.map((j) => {
      const voto = votoDe.get(j.participacaoId);
      const avaliacaoNotas: Record<string, Record<string, number>> = {};
      for (const n of notas)
        if (n.participacaoId === j.participacaoId) avaliacaoNotas[n.candidatoId] = { ...avaliacaoNotas[n.candidatoId], [n.criterioId]: n.nota };
      const avaliacaoEscolhas: Record<string, string> = {};
      for (const e of escolhas) if (e.participacaoId === j.participacaoId) avaliacaoEscolhas[e.criterioId] = e.candidatoId;
      return {
        nome: j.nome,
        rotulo: j.rotulo,
        votou: j.votou,
        candidatoId: voto?.candidatoId ?? null,
        atualizadoEm: voto ? instante(voto.atualizadoEm, fuso) : null,
        historico: (voto?.historico ?? []).map((h) => ({
          candidatoAnteriorId: h.candidatoAnteriorId,
          candidatoId: h.candidatoNovoId,
          em: instante(h.criadoEm, fuso),
        })),
        notas: avaliacaoNotas,
        escolhas: avaliacaoEscolhas,
      };
    }),
  };
}

export async function obterVotosJuri(usuario: UsuarioSessao | null, eventoId: string): Promise<Resultado<VotosJuriVisao>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  if (!faseComResultado(evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "votos do júri antes do encerramento" });
  try {
    return sucesso(await montarVotosJuri(evento));
  } catch (e) {
    return falhaInterna(e, "obterVotosJuri");
  }
}

export async function listarAuditoria(
  usuario: UsuarioSessao | null,
  eventoId: string,
  opcoes: { grupo?: GrupoAuditoria; limite?: number } = {},
): Promise<Resultado<ItemAuditoria[]>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const limite = Math.min(LIMITE_MAXIMO_AUDITORIA, Math.max(1, Math.trunc(opcoes.limite ?? LIMITE_AUDITORIA)));
  try {
    const linhas = (await auditoriaDoEvento(eventoId)).filter((a) => !opcoes.grupo || grupoDaAcao(a.acao) === opcoes.grupo).slice(0, limite);
    return sucesso(await itensDeAuditoria(admin.dados.evento, linhas));
  } catch (e) {
    return falhaInterna(e, "listarAuditoria");
  }
}
