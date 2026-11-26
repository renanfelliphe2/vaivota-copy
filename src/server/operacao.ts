import "server-only";
import type { Evento as EventoLinha } from "@/generated/prisma/client";
import { avaliarChecklist, checklistTemBloqueio, contarCategorias, contarCategoriasTotem, type EntradaChecklist } from "@/dominio/checklistAtivacao";
import { avaliarContrasteTema } from "@/dominio/contrasteTema";
import type { OrigemEncerramento } from "@/dominio/tipos";
import { normalizarOpcoesReset, type OpcoesReset } from "@/dominio/resetEvento";
import { resolverFaseConfig } from "@/dominio/travas";
import { registrarAuditoria } from "./auditoria";
import { congelarResultado } from "./apuracao";
import { db, type Banco, type Transacao } from "./db";
import { invalidarEstadoPublico } from "./estadoPublico";
import { invalidarVotacoesEncerradas } from "./votacoesEncerradas";
import { eventoParaDominio, temaParaDominio } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// ST4: ativar, abrir, encerrar e concluir. Encerrar e congelar o resultado acontecem na MESMA transação, com a linha do
// evento travada: os votos em andamento terminam antes e nenhum voto entra depois. O encerramento é sempre manual
// (`encerramentoAutomatico = false`): nada aqui olha o relógio para fechar a urna.

type Acao = "ATIVAR" | "ABRIR" | "ENCERRAR" | "CONCLUIR";

const FASE_EXIGIDA = { ATIVAR: "RASCUNHO", ABRIR: "ATIVO_NAO_INICIADA", ENCERRAR: "URNA_ABERTA", CONCLUIR: "URNA_ENCERRADA" } as const;

/** Entrada do checklist de ativação, montada com contagens e valores públicos (mesma avaliação que a tela usa). */
export async function entradaDoChecklist(
  eventoId: string,
  agoraMs = Date.now(),
  cliente: Banco | Transacao = db(),
): Promise<EntradaChecklist | null> {
  const evento = await cliente.evento.findUnique({
    where: { id: eventoId },
    include: { tema: true, configPlacar: true, configApresentacao: true },
  });
  if (!evento?.tema || !evento.configPlacar) return null;
  const qtdVotaveis = await cliente.candidato.count({ where: { eventoId, publicado: true, desqualificado: false } });
  // Convite que conta: usado, ou disponível e ainda dentro da validade (revogado e expirado não contam).
  const convitesUtilizaveis = evento.moduloJuri
    ? await cliente.conviteJurado.count({
        where: {
          eventoId,
          OR: [{ estado: "USADO" }, { estado: "DISPONIVEL", OR: [{ validadeAte: null }, { validadeAte: { gte: new Date(agoraMs) } }] }],
        },
      })
    : 0;
  const dominio = eventoParaDominio(evento);
  const dispositivosAtivos = evento.moduloInfantil ? await cliente.dispositivo.count({ where: { eventoId, estado: "ATIVO" } }) : 0;
  // Categorias que os totens ativos exibem (25/11/2026): o checklist avisa a categoria do totem que nenhum totem mostra.
  const totensAtivos = (
    await cliente.dispositivo.findMany({ where: { eventoId, estado: "ATIVO" }, select: { estado: true, categorias: { select: { categoriaId: true } } } })
  ).map((d) => ({ estado: d.estado, categoriaIds: d.categorias.map((c) => c.categoriaId) }));
  const [categorias, votaveis] = await Promise.all([
    cliente.categoria.findMany({ where: { eventoId }, select: { id: true, canal: true } }),
    cliente.candidato.findMany({ where: { eventoId, publicado: true, desqualificado: false }, select: { categoriaId: true } }),
  ]);
  return {
    agoraMs,
    qtdVotaveis,
    pesos: { POPULAR: evento.configPlacar.pesoPopular, JURI: evento.configPlacar.pesoJuri, INFANTIL: evento.configPlacar.pesoInfantil },
    moduloJuri: evento.moduloJuri,
    moduloInfantil: evento.moduloInfantil,
    janelaInicioMs: evento.janelaInicio?.getTime() ?? null,
    janelaFimMs: evento.janelaFim?.getTime() ?? null,
    convitesUtilizaveis,
    temaAprovado: avaliarContrasteTema(temaParaDominio(evento.tema, dominio.fusoHorario)).aprovado,
    dispositivosAtivos,
    trailerConfigurado: false,
    categorias: contarCategorias(
      categorias.map((c) => c.id),
      votaveis.map((c) => c.categoriaId),
    ),
    totem: contarCategoriasTotem(categorias, totensAtivos),
  };
}

/**
 * Trava a linha do evento para a transação e devolve o estado já relido. `FOR NO KEY UPDATE`: espera os votos em andamento
 * (que seguram `FOR SHARE`) e barra as outras operações, mas NÃO bloqueia quem só referencia o evento (um cadastro novo cria
 * a participação, que aponta para o evento por chave estrangeira).
 */
async function travarEvento(tx: Transacao, eventoId: string): Promise<EventoLinha> {
  await tx.$queryRaw`SELECT id FROM evento WHERE id = ${eventoId} FOR NO KEY UPDATE`;
  return tx.evento.findUniqueOrThrow({ where: { id: eventoId } });
}

class OperacaoRecusada extends Error {
  constructor(readonly resposta: ReturnType<typeof falha>) {
    super("operação recusada");
  }
}

function recusaDeFase(evento: Pick<EventoLinha, "estado" | "estadoUrna">, acao: Acao) {
  const { fase, incoerente } = resolverFaseConfig(evento);
  if (fase === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (incoerente) return falha("CONFLITO", { mensagem: "Combinação criada fora do fluxo normal. Fale com a equipe técnica." });
  if (fase !== FASE_EXIGIDA[acao]) {
    if (acao === "ENCERRAR" && fase === "URNA_ENCERRADA") return falha("URNA_ENCERRADA");
    if (acao === "ENCERRAR" || acao === "CONCLUIR") return falha("URNA_NAO_ABERTA", { detalhe: `${acao} em ${fase}` });
    return falha("CONFLITO", { mensagem: "Esta ação não está disponível no estado atual do evento.", detalhe: `${acao} em ${fase}` });
  }
  return null;
}

async function executar(
  usuario: UsuarioSessao | null,
  eventoId: string,
  acao: Acao,
  aplicar: (tx: Transacao, evento: EventoLinha, usuarioId: string, agora: Date) => Promise<void>,
  extra?: (evento: EventoLinha) => ReturnType<typeof falha> | null,
): Promise<Resultado<null>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;

  const antes = recusaDeFase(admin.dados.evento, acao);
  if (antes) return antes;
  if (acao === "ATIVAR" || acao === "ABRIR") {
    const entrada = await entradaDoChecklist(eventoId);
    if (!entrada) return falha("NAO_ENCONTRADO", { detalhe: "evento sem tema ou placar" });
    if (checklistTemBloqueio(avaliarChecklist(entrada)))
      return falha("VALIDACAO", { mensagem: "Resolva as pendências do checklist antes de continuar." });
  }
  const recusaExtra = extra?.(admin.dados.evento);
  if (recusaExtra) return recusaExtra;

  try {
    await db().$transaction(async (tx) => {
      // Relê já com a linha travada: duas pessoas clicando juntas, ou um voto em andamento, não passam por cima.
      const evento = await travarEvento(tx, eventoId);
      const recusa = recusaDeFase(evento, acao);
      if (recusa) throw new OperacaoRecusada(recusa);
      // O checklist também vale com a linha travada: um projeto despublicado agora há pouco não pode passar.
      if (acao === "ATIVAR" || acao === "ABRIR") {
        const entrada = await entradaDoChecklist(eventoId, Date.now(), tx);
        if (!entrada || checklistTemBloqueio(avaliarChecklist(entrada)))
          throw new OperacaoRecusada(falha("VALIDACAO", { mensagem: "Resolva as pendências do checklist antes de continuar." }));
      }
      await aplicar(tx, evento, usuarioId, new Date());
    });
  } catch (e) {
    if (e instanceof OperacaoRecusada) return e.resposta;
    return falhaInterna(e, `operacao ${acao}`);
  }
  invalidarEstadoPublico();
  return sucesso(null);
}

export function ativarEvento(usuario: UsuarioSessao | null, eventoId: string) {
  return executar(usuario, eventoId, "ATIVAR", async (tx, evento, usuarioId) => {
    await tx.evento.update({ where: { id: eventoId }, data: { estado: "ATIVO" } });
    await registrarAuditoria(tx, { eventoId, usuarioId, acao: "EVENTO_ATIVADO", entidade: "evento", entidadeId: evento.id });
  });
}

export function abrirUrna(usuario: UsuarioSessao | null, eventoId: string) {
  return executar(usuario, eventoId, "ABRIR", async (tx, evento, usuarioId, agora) => {
    await tx.evento.update({ where: { id: eventoId }, data: { estadoUrna: "ABERTA", urnaAbertaEm: agora } });
    await registrarAuditoria(tx, { eventoId, usuarioId, acao: "URNA_ABERTA", entidade: "evento", entidadeId: evento.id });
  });
}

/** Encerra a urna e congela o resultado oficial (versão 1) na mesma transação. */
export async function encerrarNaTransacao(
  tx: Transacao,
  evento: Pick<EventoLinha, "id">,
  usuarioId: string | null,
  agora: Date,
  origem: OrigemEncerramento,
): Promise<{ versao: number }> {
  await tx.evento.update({ where: { id: evento.id }, data: { estadoUrna: "ENCERRADA", urnaEncerradaEm: agora } });
  const { versao } = await congelarResultado(tx, evento.id, "ENCERRAMENTO", usuarioId);
  await registrarAuditoria(tx, {
    eventoId: evento.id,
    usuarioId,
    acao: "URNA_ENCERRADA",
    entidade: "evento",
    entidadeId: evento.id,
    detalhes: { origem },
  });
  return { versao };
}

export function encerrarUrna(usuario: UsuarioSessao | null, eventoId: string) {
  return executar(usuario, eventoId, "ENCERRAR", async (tx, evento, usuarioId, agora) => {
    await encerrarNaTransacao(tx, evento, usuarioId, agora, "MANUAL");
  });
}

/** Quantas linhas cada parte do reset apagou (vai na auditoria; nunca quem votou em quem). */
export type ContagemReset = {
  votosPublico: number;
  votosJuri: number;
  notasJuri: number;
  escolhasJuri: number;
  votosTotem: number;
  resultados: number;
  participacoesPublico: number;
  participacoesJurado: number;
  convitesJurado: number;
  totens: number;
  codigosPareamento: number;
};

/**
 * Demanda E1 (25/11/2026): volta o evento para rascunho com a urna não iniciada, em qualquer estado (inclusive concluído). A
 * configuração fica; só sai o que o admin marcou (com a dependência de `normalizarOpcoesReset`). Exige digitar o nome do evento.
 * Tudo numa transação com a linha do evento travada: um voto em andamento termina antes, e nenhum entra no meio do reset.
 */
export async function resetarEvento(
  usuario: UsuarioSessao | null,
  eventoId: string,
  confirmacaoNome: string,
  opcoesBrutas: OpcoesReset,
): Promise<Resultado<ContagemReset>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { usuarioId } = admin.dados;
  if (confirmacaoNome.trim() !== admin.dados.evento.nome) return falha("VALIDACAO", { mensagem: "O nome digitado não confere." });
  const opcoes = normalizarOpcoesReset(opcoesBrutas);

  try {
    const contagem = await db().$transaction(
      async (tx) => {
        const evento = await travarEvento(tx, eventoId);
        const c: ContagemReset = {
          votosPublico: 0,
          votosJuri: 0,
          notasJuri: 0,
          escolhasJuri: 0,
          votosTotem: 0,
          resultados: 0,
          participacoesPublico: 0,
          participacoesJurado: 0,
          convitesJurado: 0,
          totens: 0,
          codigosPareamento: 0,
        };
        if (opcoes.votos) {
          // Ordem das chaves estrangeiras (todas RESTRICT): histórico antes do voto do júri, marcas antes das participações.
          await tx.historicoVotoJuri.deleteMany({ where: { votoJuri: { eventoId } } });
          c.votosJuri = (await tx.votoJuri.deleteMany({ where: { eventoId } })).count;
          c.notasJuri = (await tx.notaJuri.deleteMany({ where: { eventoId } })).count;
          c.escolhasJuri = (await tx.escolhaCriterioJuri.deleteMany({ where: { eventoId } })).count;
          await tx.participacaoCategoria.deleteMany({ where: { eventoId } });
          c.votosPublico = (await tx.voto.deleteMany({ where: { eventoId } })).count;
          c.votosTotem = (await tx.votoInfantil.deleteMany({ where: { eventoId } })).count;
          // As sessões do totem só agrupam votos: sem os votos, não sobra o que agrupar.
          await tx.sessaoTotem.deleteMany({ where: { eventoId } });
          c.resultados = (await tx.resultadoOficial.deleteMany({ where: { eventoId } })).count;
          await tx.participacao.updateMany({ where: { eventoId, votou: true }, data: { votou: false } });
        }
        if (opcoes.totens) {
          c.codigosPareamento = (await tx.codigoPareamento.deleteMany({ where: { eventoId } })).count;
          // As categorias do totem saem em cascata; a auditoria fica (o ator do aparelho vira nulo). As sessões (RESTRICT) antes.
          await tx.sessaoTotem.deleteMany({ where: { eventoId, votos: { none: {} } } });
          c.totens = (await tx.dispositivo.deleteMany({ where: { eventoId } })).count;
        }
        if (opcoes.jurados) {
          c.convitesJurado = (await tx.conviteJurado.deleteMany({ where: { eventoId } })).count;
          c.participacoesJurado = (await tx.participacao.deleteMany({ where: { eventoId, papel: "JURADO" } })).count;
        }
        if (opcoes.contasPublico) {
          c.participacoesPublico = (await tx.participacao.deleteMany({ where: { eventoId, papel: "PUBLICO" } })).count;
        }
        await tx.evento.update({
          where: { id: eventoId },
          data: { estado: "RASCUNHO", estadoUrna: "NAO_INICIADA", urnaAbertaEm: null, urnaEncerradaEm: null, concluidoEm: null },
        });
        await registrarAuditoria(tx, {
          eventoId,
          usuarioId,
          acao: "EVENTO_RESETADO",
          entidade: "evento",
          entidadeId: evento.id,
          detalhes: { faseAnterior: resolverFaseConfig(evento).fase, zerado: opcoes, quantidades: c },
        });
        return c;
      },
      { timeout: 30_000 },
    );
    invalidarEstadoPublico();
    invalidarVotacoesEncerradas();
    return sucesso(contagem);
  } catch (e) {
    return falhaInterna(e, "operacao RESETAR");
  }
}

/** Exige digitar o nome do evento. */
export function concluirEvento(usuario: UsuarioSessao | null, eventoId: string, confirmacaoNome: string) {
  return executar(
    usuario,
    eventoId,
    "CONCLUIR",
    async (tx, evento, usuarioId, agora) => {
      await tx.evento.update({ where: { id: eventoId }, data: { estado: "CONCLUIDO", concluidoEm: agora } });
      await registrarAuditoria(tx, { eventoId, usuarioId, acao: "EVENTO_CONCLUIDO", entidade: "evento", entidadeId: evento.id });
    },
    (evento) => (confirmacaoNome.trim() === evento.nome ? null : falha("VALIDACAO", { mensagem: "O nome digitado não confere." })),
  );
}
