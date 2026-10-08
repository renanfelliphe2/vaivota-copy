import { motivoDaAuditoria } from "@/dominio/auditoria";
import {
  arquivosDisponiveis,
  nomeArquivoCsv,
  planilhaAuditoria,
  planilhaDispositivos,
  planilhaJurados,
  planilhaResultadoCandidatos,
  planilhaResumoEvento,
  planilhaVotosPorMinuto,
  redigirEmails,
  redigirLinhas,
  type ArquivoExportacao,
  type Planilha,
} from "@/dominio/exportacao";
import { resultadoAtual } from "@/dominio/resultado";
import { resolverFaseConfig } from "@/dominio/travas";
import type { EstadoApp, Evento } from "@/dominio/tipos";
import type { CelulaCsv } from "@/lib/csv";
import { registrarAuditoria } from "@/store/auditoria";
import { exigirAdmin, IP_HASH, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { auditoriaDoEvento, faseComResultado, itemAuditoria, montarResultadoVisao, montarVotosJuri, serieDoEvento } from "./dashboard";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 7 (D16, seção 5.10): valida a disponibilidade, monta as linhas e registra EXPORTACAO_CSV num único
// `atualizar`. O download (montarCsv + baixarCsv) é feito pelo componente. Falha não registra nada.

export type ArquivoPreparado = { nome: string; cabecalho: string[]; linhas: CelulaCsv[][] };

function tituloDe(estado: EstadoApp) {
  return (id: string) => estado.banco.candidatos.find((c) => c.id === id)?.titulo ?? id;
}

function montarPlanilha(estado: EstadoApp, evento: Evento, arquivo: ArquivoExportacao, agoraMs: number): Planilha | null {
  const modulos = { juri: evento.moduloJuri, infantil: evento.moduloInfantil };
  switch (arquivo) {
    case "votos_por_minuto":
      return planilhaVotosPorMinuto(serieDoEvento(estado, evento, agoraMs), modulos);
    case "dispositivos":
      return planilhaDispositivos(
        estado.banco.dispositivos
          .filter((d) => d.eventoId === evento.id)
          .map((d) => ({
            nome: d.nome,
            estado: d.estado,
            ultimoUso: d.ultimoUsoEm,
            votos: estado.banco.votosInfantis.filter((v) => v.dispositivoId === d.id).length,
          })),
      );
    case "auditoria":
      return planilhaAuditoria(
        auditoriaDoEvento(estado, evento.id).map((a) => {
          const item = itemAuditoria(estado, evento.id, a);
          return { criadoEm: a.criadoEm, acao: a.acao, entidade: a.entidade, descricao: item.descricao, ator: item.ator, motivo: motivoDaAuditoria(a.detalhes) };
        }),
      );
    case "jurados":
      return planilhaJurados(montarVotosJuri(estado, evento.id), tituloDe(estado));
    case "resumo_evento":
    case "resultado_candidatos": {
      const visao = montarResultadoVisao(estado, evento, agoraMs);
      if (!visao) return null;
      return arquivo === "resumo_evento" ? planilhaResumoEvento(evento, visao) : planilhaResultadoCandidatos(visao, tituloDe(estado));
    }
  }
}

export async function prepararExportacao(eventoId: string, arquivo: ArquivoExportacao): Promise<Resultado<ArquivoPreparado>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const { fase } = resolverFaseConfig(evento);
  const resultadoDisponivel = faseComResultado(evento) && resultadoAtual(estado.banco.resultados, eventoId) !== undefined;
  const disponibilidade = arquivosDisponiveis(fase, resultadoDisponivel, { juri: evento.moduloJuri, infantil: evento.moduloInfantil }).find(
    (a) => a.id === arquivo,
  );
  if (!disponibilidade) return falha("VALIDACAO", { mensagem: "Este arquivo não existe para os módulos ligados.", detalhe: arquivo });
  if (!disponibilidade.disponivel)
    return falha("RESULTADO_INDISPONIVEL", { mensagem: disponibilidade.motivo ?? undefined, detalhe: `${arquivo} em ${fase}` });

  const planilha = montarPlanilha(estado, evento, arquivo, agoraMs);
  if (!planilha) return falha("RESULTADO_INDISPONIVEL", { detalhe: "sem versão calculada" });
  const agora = instanteDoEvento(estado, eventoId, agoraMs);
  store.atualizar((e) =>
    registrarAuditoria(e, {
      eventoId,
      usuarioId,
      acao: "EXPORTACAO_CSV",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { arquivo },
      ipHash: IP_HASH,
      criadoEm: agora,
    }),
  );
  return sucesso({
    nome: nomeArquivoCsv(evento.slug, arquivo, agora),
    cabecalho: planilha.cabecalho.map(redigirEmails),
    linhas: redigirLinhas(planilha.linhas),
  });
}
