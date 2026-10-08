import { resultadoAtual } from "@/dominio/resultado";
import { registrarAuditoria } from "@/store/auditoria";
import { exigirAdmin, IP_HASH, iniciarServico, instanteDoEvento, lerAmbiente } from "./apoio";
import { faseComResultado } from "./dashboard";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 7 (D17, seção 5.11): o relatório lê `obterResultado` (sem votos identificados). Imprimir registra
// RELATORIO_GERADO com a versão; Ctrl+P direto não passa por aqui (P14).

export async function registrarRelatorioGerado(eventoId: string): Promise<Resultado<{ versao: number }>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const atual = resultadoAtual(estado.banco.resultados, eventoId);
  if (!faseComResultado(evento) || !atual) return falha("RESULTADO_INDISPONIVEL", { detalhe: "relatório sem resultado" });
  store.atualizar((e) =>
    registrarAuditoria(e, {
      eventoId,
      usuarioId,
      acao: "RELATORIO_GERADO",
      entidade: "evento",
      entidadeId: eventoId,
      detalhes: { versao: atual.versao },
      ipHash: IP_HASH,
      criadoEm: instanteDoEvento(estado, eventoId, agoraMs),
    }),
  );
  return sucesso({ versao: atual.versao });
}
