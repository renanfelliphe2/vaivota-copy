import { assinaturaDoResultado } from "@/dominio/apresentacao/assinatura";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import type { DadosEnsaio, DadosRevelacao } from "@/dominio/apresentacao/tipos";
import { votaveis } from "@/dominio/candidatos";
import { contarVotos, totalDoGrupo } from "@/dominio/contagens";
import { verificarInvariantes } from "@/dominio/invariantes";
import { resultadoAtual } from "@/dominio/resultado";
import { totalDoPonto } from "@/dominio/serie";
import { resolverFaseConfig } from "@/dominio/travas";
import type { AcaoAuditoria, EstadoApp, Evento } from "@/dominio/tipos";
import { CENARIOS } from "@/mocks/cenarios";
import { registrarAuditoria } from "@/store/auditoria";
import { obterAmbiente } from "@/store/ambiente";
import { exigirAdmin, IP_HASH, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { faseComResultado, serieDoEvento } from "./dashboard";
import { falha, registrarLog, simularFalha, sucesso, type Resultado } from "./resultado";

// Etapa 8 (D2, D6, D7, seção 5.3): fronteira de leitura do palco. Leituras obedecem só a simularErroRede;
// o resultado só sai por carregarRevelacao (depois de iniciar) e obterDadosEnsaio (cópia descartável).

export type StatusResultado = { existe: boolean; versao: number | null; assinatura: string | null };

export async function obterStatusResultado(eventoId: string): Promise<Resultado<StatusResultado>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const atual = resultadoAtual(estado.banco.resultados, eventoId);
  return sucesso({ existe: Boolean(atual), versao: atual?.versao ?? null, assinatura: atual ? assinaturaDoResultado(atual) : null });
}

export type EstadoAoVivo = { totalGeral: number; parcial: { candidatoId: string; votos: number }[] | null };

export async function obterEstadoAoVivo(eventoId: string): Promise<Resultado<EstadoAoVivo>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento } = admin.dados;
  const votos = contarVotos(estado.banco, eventoId);
  const totalGeral =
    totalDoGrupo(votos.POPULAR) + (evento.moduloJuri ? totalDoGrupo(votos.JURI) : 0) + (evento.moduloInfantil ? totalDoGrupo(votos.INFANTIL) : 0);
  const config = estado.banco.configsApresentacao.find((c) => c.eventoId === eventoId);
  const liberado = Boolean(config?.parcialAoVivo) && resolverFaseConfig(evento).fase === "URNA_ABERTA";
  return sucesso({
    totalGeral,
    parcial: liberado
      ? votaveis(estado.banco.candidatos.filter((c) => c.eventoId === eventoId)).map((c) => ({ candidatoId: c.id, votos: votos.POPULAR[c.id] ?? 0 }))
      : null,
  });
}

/** Monta o DTO da revelação a partir de um estado (real ou cópia do ensaio). */
function montarDadosRevelacao(estado: EstadoApp, evento: Evento): DadosRevelacao | null {
  const atual = resultadoAtual(estado.banco.resultados, evento.id);
  const config = estado.banco.configsApresentacao.find((c) => c.eventoId === evento.id);
  if (!atual || !config) return null;
  return {
    versao: atual.versao,
    motivo: atual.motivo,
    calculadoEm: atual.calculadoEm,
    assinatura: assinaturaDoResultado(atual),
    pesos: { POPULAR: atual.pesoPopular, JURI: atual.pesoJuri, INFANTIL: atual.pesoInfantil },
    dados: atual.dados,
    candidatos: estado.banco.candidatos
      .filter((c) => c.eventoId === evento.id && c.publicado)
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => ({ id: c.id, titulo: c.titulo, imagemUrl: c.imagemUrl, ordem: c.ordem })),
    config,
    modulos: { juri: evento.moduloJuri, infantil: evento.moduloInfantil },
    candidatosNaDisputa: atual.dados.ranking.length,
  };
}

/** Uma vez por cerimônia (D2). Não chama obterVotosJuri (rev. 4, E21). */
export async function carregarRevelacao(eventoId: string): Promise<Resultado<DadosRevelacao>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  if (!faseComResultado(admin.dados.evento)) return falha("RESULTADO_INDISPONIVEL", { detalhe: "revelação fora da fase" });
  const dados = montarDadosRevelacao(estado, admin.dados.evento);
  if (!dados) return falha("RESULTADO_INDISPONIVEL", { detalhe: "sem versão" });
  return sucesso(dados);
}

/** Ensaio (D5): aplica o cenário numa cópia e a descarta; nunca chama `atualizar`. */
export async function obterDadosEnsaio(eventoId: string, cenarioId: string): Promise<Resultado<DadosEnsaio>> {
  const erro = await iniciarServico({ leitura: true });
  if (erro) return erro;
  const { estado, agoraMs } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  if (!cenariosDoEnsaio(eventoId).includes(cenarioId)) return falha("VALIDACAO", { mensagem: "Este cenário não é deste evento.", detalhe: cenarioId });
  const cenario = CENARIOS.find((c) => c.id === cenarioId);
  if (!cenario) return falha("NAO_ENCONTRADO", { detalhe: cenarioId });
  const copia = cenario.aplicar(structuredClone(estado), { eventoId, agoraMs });
  const violacoes = verificarInvariantes(copia);
  if (violacoes.length > 0) return falha("ERRO_INTERNO", { detalhe: `ensaio ${cenarioId}: ${violacoes.join("; ")}` });
  const evento = copia.banco.eventos.find((e) => e.id === eventoId)!;
  const dados = montarDadosRevelacao(copia, evento);
  if (!dados) return falha("ERRO_INTERNO", { detalhe: `ensaio ${cenarioId} sem resultado` });
  const serie = serieDoEvento(copia, evento, agoraMs);
  const pontos = serie.pontos.map(totalDoPonto);
  return sucesso({ ...dados, totalGeral: pontos.reduce((s, n) => s + n, 0), votosPorMinutoSimulados: pontos });
}

export type AcaoApresentacao = Extract<AcaoAuditoria, "REVELACAO_INICIADA" | "REVELACAO_CONCLUIDA" | "REVELACAO_REFEITA" | "EMERGENCIA_ACIONADA">;

/**
 * Fire and forget (D6): sem atraso; só simularErroRede; não consome a falha pontual. `detalhes` só com
 * versão e índice da cena, nunca vencedores, pontuações ou votos.
 */
export function registrarAcaoApresentacao(eventoId: string, acao: AcaoApresentacao, info: { versao: number; cena?: number }): Resultado<null> {
  const rede = simularFalha({ consumirPontual: false });
  if (rede) return rede;
  const { store, relogio } = obterAmbiente();
  const estado = store.getState();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) {
    registrarLog(`auditoria da apresentação recusada: ${admin.erro.codigo}`);
    return admin;
  }
  store.atualizar((e) =>
    registrarAuditoria(e, {
      eventoId,
      usuarioId: admin.dados.usuarioId,
      acao,
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: info.cena === undefined ? { versao: info.versao } : { versao: info.versao, cena: info.cena },
      ipHash: IP_HASH,
      criadoEm: instanteDoEvento(e, eventoId, relogio.getAgora()),
    }),
  );
  return sucesso(null);
}
