import type { CodigoErro } from "./resultado";

// Mensagens genéricas ao usuário (pt-BR). O detalhe técnico vai só ao console.
// Textos provisórios: dependem de aprovação da organização (Etapa 3, P6).

export type ParametrosMensagem = Record<string, string | number>;

const MENSAGENS: Record<CodigoErro, string> = {
  VALIDACAO: "Confira os campos destacados.",
  NAO_ENCONTRADO: "Não encontramos o que você procurava.",
  NAO_AUTORIZADO: "Você não tem acesso a esta ação.",
  CONFLITO: "Aguarde alguns segundos para reenviar.",
  REDE: "Não foi possível conectar. Tente novamente.",
  ERRO_INTERNO: "Algo deu errado. Tente novamente.",

  CREDENCIAIS_INVALIDAS: "Código incorreto ou expirado.",
  EMAIL_NAO_VERIFICADO: "Confirme seu e-mail para continuar.",
  CADASTRO_NAO_CONCLUIDO: "Não foi possível criar a conta com estes dados. Se você já tem conta, entre.",

  // D4 (Etapa 3): mensagem única para qualquer código recusado; o motivo exato vai só para a auditoria.
  CODIGO_INVALIDO: "Código inválido ou expirado. Fale com a organização.",
  CODIGO_USADO: "Código inválido ou expirado. Fale com a organização.",
  CODIGO_REVOGADO: "Código inválido ou expirado. Fale com a organização.",
  CODIGO_EXPIRADO: "Código inválido ou expirado. Fale com a organização.",
  LIMITE_TENTATIVAS: "Muitas tentativas. Tente novamente em {n}s.",
  JA_VOTOU_COMO_PUBLICO: "Você já votou como público neste evento e não pode se tornar jurado.",
  JA_E_JURADO: "Você já é jurado neste evento.",

  EVENTO_INDISPONIVEL: "Este evento ainda não está disponível.",
  EVENTO_CONCLUIDO: "Este evento foi concluído e não aceita novos cadastros nem convites.",
  URNA_NAO_ABERTA: "A votação ainda não está aberta.",
  URNA_ENCERRADA: "A votação deste evento foi encerrada.",
  RESULTADO_INDISPONIVEL: "O resultado ainda não está disponível.",
  TRAVADO: "Esta configuração está travada no estado atual do evento.",

  JA_VOTOU: "Você já votou neste evento.",
  PAPEL_INVALIDO: "Contas administrativas não resgatam convite.",
  CANDIDATO_INDISPONIVEL: "Esta opção não está mais disponível.",
  MODO_JURI_DIFERENTE: "A forma de votação do júri mudou. Volte à lista e tente de novo.",
  VOTO_PROPRIO: "Você não pode votar na própria candidatura.",

  DISPOSITIVO_INATIVO: "Este totem não está liberado para votar. Chame a organização.",
};

export function mensagemDe(codigo: CodigoErro, parametros: ParametrosMensagem = {}): string {
  return MENSAGENS[codigo].replace(/\{(\w+)\}/g, (_, chave: string) => String(parametros[chave] ?? `{${chave}}`));
}
