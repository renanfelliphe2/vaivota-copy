// Etapa 6 (seção 5.10): motivo visível ao lado de cada controle travado. Textos provisórios (P20, E30).

export type FaseTexto = "RASCUNHO" | "ATIVO_NAO_INICIADA" | "URNA_ABERTA" | "URNA_ENCERRADA" | "CONCLUIDO";

export const TEXTOS_TRAVAS = {
  concluido: "Travado: o evento foi concluído.",
  urnaAberta: "Travado: a urna já foi aberta.",
  urnaEncerrada: "Travado: a urna foi encerrada.",
  slug: "Travado: o endereço já foi divulgado quando o evento é ativado.",
  juriComConvite: "Travado: já existe jurado com convite resgatado.",
  desqualificarIndisponivel: "Disponível só com a urna aberta ou encerrada.",
  estender: "Com a urna aberta, o fim da janela só pode ser estendido (pede motivo).",
  auditado: "Com a urna aberta ou encerrada, a alteração pede confirmação e fica registrada.",
  excepcional: "Ação excepcional: exige motivo e fica registrada.",
} as const;

/** Motivo genérico de "travado" pela fase (sem a regra específica da ação). */
export function motivoDaFase(fase: FaseTexto): string | null {
  if (fase === "CONCLUIDO") return TEXTOS_TRAVAS.concluido;
  if (fase === "URNA_ABERTA") return TEXTOS_TRAVAS.urnaAberta;
  if (fase === "URNA_ENCERRADA") return TEXTOS_TRAVAS.urnaEncerrada;
  return null;
}
