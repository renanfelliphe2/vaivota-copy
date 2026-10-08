import { descreverAuditoria, grupoDaAcao, resumirAuditoria, type GrupoAuditoria } from "@/dominio/auditoria";
import { avaliacaoDoJurado, criteriosDoEvento, modoVotoJuriDoEvento } from "@/dominio/avaliacaoJuri";
import { votaveis } from "@/dominio/candidatos";
import { contarParticipantes, contarVotos, totalDoGrupo } from "@/dominio/contagens";
import { resumirConvites } from "@/dominio/convites";
import type { ItemAuditoria, OperacaoDados, ResultadoVisao, VotosJuriVisao } from "@/dominio/painel";
import { resultadoAtual, resumirApuracao } from "@/dominio/resultado";
import { montarSerie } from "@/dominio/serie";
import { resolverSituacaoEvento } from "@/dominio/situacaoEvento";
import { resolverFaseConfig } from "@/dominio/travas";
import type { Auditoria, EstadoApp, Evento, Grupo } from "@/dominio/tipos";
import { paraInstante, paraMs } from "@/lib/tempo";
import { exigirAdmin, iniciarServico, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 7 (D5, seção 5.4): leituras do painel. Obedecem só a `simularErroRede` (não consomem a falha
// pontual), revalidam ADMIN do evento e nunca mutam nem recalculam o resultado (leem a maior versão).
// Nenhum DTO carrega e-mail, hash de código nem ipHash.

const LIMITE_AUDITORIA = 50;
const LIMITE_MAXIMO_AUDITORIA = 200;

/** Fase do painel permite resultado (encerrada ou concluído). */
export function faseComResultado(evento: Pick<Evento, "estado" | "estadoUrna">): boolean {
  const { fase } = resolverFaseConfig(evento);
  return fase === "URNA_ENCERRADA" || fase === "CONCLUIDO";
}

/** Série do evento: de urnaAbertaEm até agora (aberta) ou urnaEncerradaEm. Júri pelo primeiro registro. */
export function serieDoEvento(estado: EstadoApp, evento: Evento, agoraMs: number) {
  const ate = evento.urnaEncerradaEm ? paraMs(evento.urnaEncerradaEm) : agoraMs;
  const doEvento = <T extends { eventoId: string }>(lista: T[]) => lista.filter((x) => x.eventoId === evento.id);
  return montarSerie({
    abertaEm: evento.urnaAbertaEm,
    ateMs: ate,
    votos: {
      popular: doEvento(estado.banco.votos).map((v) => v.criadoEm),
      juri: evento.moduloJuri ? doEvento(estado.banco.votosJuri).map((v) => v.criadoEm) : [],
      infantil: evento.moduloInfantil ? doEvento(estado.banco.votosInfantis).map((v) => v.criadoEm) : [],
    },
    paraInstante: (ms) => paraInstante(ms, evento.fusoHorario),
  });
}

/** Ator exibido (5.4): nome do ADMIN do evento; "Jurado" ou "Participante" para os demais; "Sistema" sem ator. */
function atorDe(estado: EstadoApp, eventoId: string, a: Pick<Auditoria, "atorUsuarioId" | "atorDispositivoId">): string {
  if (a.atorDispositivoId) return "Totem";
  if (!a.atorUsuarioId) return "Sistema";
  const papel = estado.banco.participacoes.find((p) => p.usuarioId === a.atorUsuarioId && p.eventoId === eventoId)?.papel;
  if (papel === "ADMIN") return estado.banco.usuarios.find((u) => u.id === a.atorUsuarioId)?.nome ?? "Organização";
  return papel === "JURADO" ? "Jurado" : "Participante";
}

/** Entradas do evento, mais recentes primeiro. */
export function auditoriaDoEvento(estado: EstadoApp, eventoId: string): Auditoria[] {
  return estado.banco.auditoria
    .filter((a) => a.eventoId === eventoId)
    .sort((a, b) => paraMs(b.criadoEm) - paraMs(a.criadoEm) || b.id - a.id);
}

export function itemAuditoria(estado: EstadoApp, eventoId: string, a: Auditoria): ItemAuditoria {
  return {
    id: a.id,
    criadoEm: a.criadoEm,
    acao: a.acao,
    grupo: grupoDaAcao(a.acao),
    descricao: descreverAuditoria(a),
    ator: atorDe(estado, eventoId, a),
  };
}

/** Jurados pelo rótulo do convite USADO ligado à participação; pendentes primeiro, depois por rótulo. */
function juradosDoEvento(estado: EstadoApp, eventoId: string) {
  return estado.banco.participacoes
    .filter((p) => p.eventoId === eventoId && p.papel === "JURADO")
    .map((p) => ({
      participacao: p,
      rotulo: estado.banco.convitesJurado.find((c) => c.participacaoId === p.id && c.estado === "USADO")?.rotulo ?? null,
      nome: estado.banco.usuarios.find((u) => u.id === p.usuarioId)?.nome ?? "Jurado",
    }))
    .sort(
      (a, b) =>
        Number(a.participacao.votou) - Number(b.participacao.votou) ||
        (a.rotulo ?? "").localeCompare(b.rotulo ?? "", "pt-BR", { numeric: true }) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
}

export async function obterOperacao(eventoId: string): Promise<Resultado<OperacaoDados>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado, agoraMs } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  const { fase, incoerente } = resolverFaseConfig(evento);
  const configApresentacao = estado.banco.configsApresentacao.find((c) => c.eventoId === eventoId);
  if (!configApresentacao) return falha("NAO_ENCONTRADO", { detalhe: "evento sem ConfigApresentacao" });

  const votos = contarVotos(estado.banco, eventoId);
  const totais: Record<Grupo, number> = {
    POPULAR: totalDoGrupo(votos.POPULAR),
    JURI: evento.moduloJuri ? totalDoGrupo(votos.JURI) : 0,
    INFANTIL: evento.moduloInfantil ? totalDoGrupo(votos.INFANTIL) : 0,
  };
  const auditoria = auditoriaDoEvento(estado, eventoId);
  // Sigilo (D8): só com a flag ligada E a urna aberta; senão o número nem sai do serviço.
  const parcialLiberado = configApresentacao.parcialAoVivo && evento.estadoUrna === "ABERTA" && fase === "URNA_ABERTA";
  const parcial = parcialLiberado
    ? votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId)).map((c) => ({
        candidatoId: c.id,
        votos: votos.POPULAR[c.id] ?? 0,
      }))
    : null;

  return sucesso({
    eventoId,
    fase,
    incoerente,
    situacao: resolverSituacaoEvento(evento, configApresentacao, agoraMs, { ignorarRascunho: true }),
    janela: { inicio: evento.janelaInicio, fim: evento.janelaFim, encerramentoAutomatico: evento.encerramentoAutomatico },
    urna: { abertaEm: evento.urnaAbertaEm, encerradaEm: evento.urnaEncerradaEm },
    modulos: { juri: evento.moduloJuri, infantil: evento.moduloInfantil },
    totais,
    participantes: contarParticipantes(estado.banco, eventoId),
    serie: serieDoEvento(estado, evento, agoraMs),
    jurados: evento.moduloJuri
      ? juradosDoEvento(estado, eventoId).map((j) => ({ rotulo: j.rotulo, nome: j.nome, votou: j.participacao.votou }))
      : [],
    totens: evento.moduloInfantil
      ? estado.banco.dispositivos
          .filter((d) => d.eventoId === eventoId)
          .map((d) => ({
            nome: d.nome,
            estado: d.estado,
            ultimoUso: d.ultimoUsoEm,
            votos: estado.banco.votosInfantis.filter((v) => v.dispositivoId === d.id).length,
          }))
      : [],
    convites: resumirConvites(
      estado.banco.convitesJurado.filter((c) => c.eventoId === eventoId),
      agoraMs,
    ),
    auditoria: {
      resumo: resumirAuditoria(auditoria),
      itens: auditoria.slice(0, LIMITE_AUDITORIA).map((a) => itemAuditoria(estado, eventoId, a)),
    },
    parcialAoVivo: configApresentacao.parcialAoVivo,
    parcial,
    resultadoDisponivel: faseComResultado(evento) && resultadoAtual(estado.banco.resultados, eventoId) !== undefined,
    geradoEm: paraInstante(agoraMs, evento.fusoHorario),
  });
}

/** Monta a visão da maior versão (sem recalcular). Usada também pela exportação e pelo relatório. */
export function montarResultadoVisao(estado: EstadoApp, evento: Evento, agoraMs: number): ResultadoVisao | null {
  const atual = resultadoAtual(estado.banco.resultados, evento.id);
  if (!atual) return null;
  const pesos = { POPULAR: atual.pesoPopular, JURI: atual.pesoJuri, INFANTIL: atual.pesoInfantil };
  const versoes = estado.banco.resultados
    .filter((r) => r.eventoId === evento.id)
    .sort((a, b) => b.versao - a.versao)
    .map((r) => ({ versao: r.versao, motivo: r.motivo, calculadoEm: r.calculadoEm }));
  return {
    eventoId: evento.id,
    versao: atual.versao,
    motivo: atual.motivo,
    calculadoEm: atual.calculadoEm,
    pesos,
    dados: atual.dados,
    derivados: resumirApuracao(atual.dados, pesos),
    versoes,
    evento: { inicio: evento.urnaAbertaEm, fim: evento.urnaEncerradaEm, candidatosNaDisputa: atual.dados.ranking.length },
    participantes: contarParticipantes(estado.banco, evento.id),
    serie: serieDoEvento(estado, evento, agoraMs),
  };
}

export async function obterResultado(eventoId: string): Promise<Resultado<ResultadoVisao>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado, agoraMs } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  if (!faseComResultado(evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "fase sem resultado" });
  const visao = montarResultadoVisao(estado, evento, agoraMs);
  if (!visao) return falha("RESULTADO_INDISPONIVEL", { detalhe: "nenhuma versão calculada" });
  return sucesso(visao);
}

/** Votos identificados do júri: só depois do encerramento (D8). */
export function montarVotosJuri(estado: EstadoApp, eventoId: string): VotosJuriVisao {
  return {
    modo: modoVotoJuriDoEvento(estado.banco, eventoId),
    criterios: criteriosDoEvento(estado.banco, eventoId).map((c) => ({ id: c.id, nome: c.nome })),
    jurados: juradosDoEvento(estado, eventoId).map(({ participacao, rotulo, nome }) => {
      const { notas, escolhas } = avaliacaoDoJurado(estado.banco, participacao.id, eventoId);
      const voto = estado.banco.votosJuri.find((v) => v.participacaoId === participacao.id && v.eventoId === eventoId);
      const historico = voto
        ? estado.banco.historicoVotosJuri
            .filter((h) => h.votoJuriId === voto.id)
            .sort((a, b) => a.id - b.id)
            .map((h) => ({ candidatoAnteriorId: h.candidatoAnteriorId, candidatoId: h.candidatoNovoId, em: h.criadoEm }))
        : [];
      return {
        nome,
        rotulo,
        votou: participacao.votou,
        candidatoId: voto?.candidatoId ?? null,
        atualizadoEm: voto?.atualizadoEm ?? null,
        historico,
        notas,
        escolhas,
      };
    }),
  };
}

export async function obterVotosJuri(eventoId: string): Promise<Resultado<VotosJuriVisao>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  if (!faseComResultado(admin.dados.evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "votos do júri antes do encerramento" });
  return sucesso(montarVotosJuri(estado, eventoId));
}

export async function listarAuditoria(
  eventoId: string,
  opcoes: { grupo?: GrupoAuditoria; limite?: number } = {},
): Promise<Resultado<ItemAuditoria[]>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const limite = Math.min(LIMITE_MAXIMO_AUDITORIA, Math.max(1, opcoes.limite ?? LIMITE_AUDITORIA));
  return sucesso(
    auditoriaDoEvento(estado, eventoId)
      .filter((a) => !opcoes.grupo || grupoDaAcao(a.acao) === opcoes.grupo)
      .slice(0, limite)
      .map((a) => itemAuditoria(estado, eventoId, a)),
  );
}
