import "server-only";
import { motivoDaAuditoria } from "@/dominio/auditoria";
import {
  arquivosDisponiveis,
  nomeArquivoCsv,
  planilhaAuditoria,
  planilhaResultadoCandidatos,
  planilhaResumoEvento,
  planilhaVotosPorMinuto,
  redigirEmails,
  redigirLinhas,
  type ArquivoExportacao,
  type Planilha,
} from "@/dominio/exportacao";
import type { AcaoAuditoria } from "@/dominio/tipos";
import { resolverFaseConfig } from "@/dominio/travas";
import type { CelulaCsv } from "@/lib/csv";
import { paraInstante } from "@/lib/tempo";
import { registrarAuditoria } from "./auditoria";
import { auditoriaDoEvento, faseComResultado, itensDeAuditoria, montarResultadoVisao, serieDoEvento } from "./dashboard";
import { db } from "./db";
import { hashDoIp } from "./ip";
import { eventoParaDominio } from "./mapeadores";
import { falha, falhaInterna, sucesso, type Resultado } from "./resultado";
import { exigirAdmin, type UsuarioSessao } from "./sessao";

// ST5: monta as linhas dos CSV no servidor e registra EXPORTACAO_CSV na auditoria. O download (montarCsv + baixarCsv) é
// do navegador. Falha não registra nada. Nenhum arquivo traz e-mail (redigirEmails é a rede de proteção).

export type ArquivoPreparado = { nome: string; cabecalho: string[]; linhas: CelulaCsv[][] };

export async function prepararExportacao(
  usuario: UsuarioSessao | null,
  eventoId: string,
  arquivo: ArquivoExportacao,
  ctx: { ip: string },
): Promise<Resultado<ArquivoPreparado>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  try {
    const { fase } = resolverFaseConfig(evento);
    const agoraMs = Date.now();
    const resultado = faseComResultado(evento) ? await montarResultadoVisao(evento, agoraMs) : null;
    const disponibilidade = arquivosDisponiveis(fase, resultado !== null, { juri: evento.moduloJuri, infantil: evento.moduloInfantil }).find(
      (a) => a.id === arquivo,
    );
    if (!disponibilidade) return falha("VALIDACAO", { mensagem: "Este arquivo não existe para os módulos ligados.", detalhe: arquivo });
    if (!disponibilidade.disponivel)
      return falha("RESULTADO_INDISPONIVEL", { mensagem: disponibilidade.motivo ?? undefined, detalhe: `${arquivo} em ${fase}` });

    const modulos = { juri: evento.moduloJuri, infantil: evento.moduloInfantil };
    let planilha: Planilha | null = null;
    if (arquivo === "votos_por_minuto") {
      planilha = planilhaVotosPorMinuto(await serieDoEvento(evento, agoraMs), modulos);
    } else if (arquivo === "auditoria") {
      const linhas = await auditoriaDoEvento(eventoId);
      const itens = await itensDeAuditoria(evento, linhas);
      planilha = planilhaAuditoria(
        linhas.map((a, i) => ({
          criadoEm: itens[i].criadoEm,
          acao: a.acao,
          entidade: a.entidade,
          descricao: itens[i].descricao,
          ator: itens[i].ator,
          motivo: motivoDaAuditoria((a.detalhes as Record<string, unknown> | null) ?? null),
        })),
      );
    } else if (resultado) {
      const candidatos = await db().candidato.findMany({ where: { eventoId }, select: { id: true, titulo: true } });
      const titulos = new Map(candidatos.map((c) => [c.id, c.titulo]));
      const titulo = (id: string) => titulos.get(id) ?? id;
      planilha = arquivo === "resumo_evento" ? planilhaResumoEvento(eventoParaDominio(evento), resultado) : planilhaResultadoCandidatos(resultado, titulo);
    }
    if (!planilha) return falha("RESULTADO_INDISPONIVEL", { detalhe: "sem versão calculada" });

    await registrarAuditoria(db(), {
      eventoId,
      usuarioId,
      acao: "EXPORTACAO_CSV" satisfies AcaoAuditoria,
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { arquivo },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso({
      nome: nomeArquivoCsv(evento.slug, arquivo, paraInstante(Date.now(), evento.fusoHorario)),
      cabecalho: planilha.cabecalho.map(redigirEmails),
      linhas: redigirLinhas(planilha.linhas),
    });
  } catch (e) {
    return falhaInterna(e, "prepararExportacao");
  }
}

/** Imprimir o relatório registra RELATORIO_GERADO com a versão; Ctrl+P direto não passa por aqui. */
export async function registrarRelatorioGerado(
  usuario: UsuarioSessao | null,
  eventoId: string,
  ctx: { ip: string },
): Promise<Resultado<{ versao: number }>> {
  const admin = await exigirAdmin(usuario, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  try {
    const atual = await db().resultadoOficial.aggregate({ where: { eventoId }, _max: { versao: true } });
    const versao = atual._max.versao;
    if (!faseComResultado(evento) || versao === null) return falha("RESULTADO_INDISPONIVEL", { detalhe: "relatório sem resultado" });
    await registrarAuditoria(db(), {
      eventoId,
      usuarioId,
      acao: "RELATORIO_GERADO",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { versao },
      ipHash: hashDoIp(ctx.ip),
    });
    return sucesso({ versao });
  } catch (e) {
    return falhaInterna(e, "registrarRelatorioGerado");
  }
}
