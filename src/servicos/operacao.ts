import { avaliarChecklist, checklistTemBloqueio, montarEntradaChecklist } from "@/dominio/checklistAtivacao";
import { resolverFaseConfig } from "@/dominio/travas";
import type { EstadoApp } from "@/dominio/tipos";
import * as transicoes from "@/store/transicoes";
import { exigirAdmin, iniciarServico, lerAmbiente } from "./apoio";
import { falha, sucesso, type Resultado } from "./resultado";

// Etapa 6 (D20, seção 5.7): envolve store/transicoes com validação. As transições já auditam; nada é
// registrado de novo aqui. Encerrar sempre congela o resultado (D8 da Etapa 0).

type Acao = "ATIVAR" | "ABRIR" | "ENCERRAR" | "CONCLUIR";

const FASE_EXIGIDA = { ATIVAR: "RASCUNHO", ABRIR: "ATIVO_NAO_INICIADA", ENCERRAR: "URNA_ABERTA", CONCLUIR: "URNA_ENCERRADA" } as const;

async function executar(
  eventoId: string,
  acao: Acao,
  receita: (e: EstadoApp, ctx: { agoraMs: number; usuarioId: string }) => EstadoApp,
  extra?: (estado: EstadoApp) => Resultado<null> | null,
): Promise<Resultado<null>> {
  const erro = await iniciarServico();
  if (erro) return erro;
  const { estado, agoraMs, store } = lerAmbiente();
  const admin = exigirAdmin(estado, eventoId);
  if (!admin.ok) return admin;
  const { evento, usuarioId } = admin.dados;
  const { fase, incoerente } = resolverFaseConfig(evento);
  if (fase === "CONCLUIDO") return falha("EVENTO_CONCLUIDO");
  if (incoerente) return falha("CONFLITO", { mensagem: "Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido." });
  if (fase !== FASE_EXIGIDA[acao]) {
    if (acao === "ENCERRAR" && fase === "URNA_ENCERRADA") return falha("URNA_ENCERRADA");
    if (acao === "ENCERRAR" || acao === "CONCLUIR") return falha("URNA_NAO_ABERTA", { detalhe: `${acao} em ${fase}` });
    return falha("CONFLITO", { mensagem: "Esta ação não está disponível no estado atual do evento.", detalhe: `${acao} em ${fase}` });
  }
  if (acao === "ATIVAR" || acao === "ABRIR") {
    const itens = avaliarChecklist(montarEntradaChecklist(estado, eventoId, agoraMs));
    if (checklistTemBloqueio(itens))
      return falha("VALIDACAO", { mensagem: "Resolva as pendências do checklist antes de continuar." });
  }
  const recusa = extra?.(estado);
  if (recusa) return recusa;
  store.atualizar((e) => receita(e, { agoraMs, usuarioId }));
  return sucesso(null);
}

export function ativarEvento(eventoId: string) {
  return executar(eventoId, "ATIVAR", (e, ctx) => transicoes.ativarEvento(e, eventoId, ctx));
}

export function abrirUrna(eventoId: string) {
  return executar(eventoId, "ABRIR", (e, ctx) => transicoes.abrirUrna(e, eventoId, ctx));
}

export function encerrarUrna(eventoId: string) {
  return executar(eventoId, "ENCERRAR", (e, ctx) => transicoes.encerrarUrna(e, eventoId, { ...ctx, origem: "MANUAL" }));
}

/** Exige digitar o nome do evento. */
export function concluirEvento(eventoId: string, confirmacaoNome: string) {
  return executar(
    eventoId,
    "CONCLUIR",
    (e, ctx) => transicoes.concluirEvento(e, eventoId, { ...ctx, origem: "MANUAL" }),
    (estado) => {
      const nome = estado.banco.eventos.find((ev) => ev.id === eventoId)?.nome ?? "";
      return confirmacaoNome.trim() === nome ? null : falha("VALIDACAO", { mensagem: "O nome digitado não confere." });
    },
  );
}
