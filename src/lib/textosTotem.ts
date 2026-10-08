import type { SituacaoTotem } from "@/dominio/totem";
import type { TextoEstado } from "@/dominio/tipos";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6): textos curtos para crianças, neutros (nada concorda com o
// rótulo do tema). Provisórios: dependem da revisão única de textos (E30) e da pendência §12.

export const TEXTOS_TOTEM = {
  toqueParaVotar: "Toque para votar",
  convite: "Escolha das Crianças",
  pergunta: "De qual você mais gostou?",
  confirmar: "Você escolheu",
  sim: "Sim!",
  nao: "Não, voltar",
  enviando: "Guardando seu voto…",
  obrigado: "Obrigado!",
  votoGuardado: "Seu voto foi guardado.",
  erroTitulo: "Ops! Não deu certo.",
  erroCorpo: "Chame um adulto para ajudar.",
  tentarDeNovo: "Tentar de novo",
  voltarInicio: "Começar de novo",
  sair: "Sair do modo totem",
  pinTitulo: "Sair do modo totem",
  pinDescricao: "Digite o PIN do totem. Só a organização tem o PIN.",
  pinCampo: "PIN",
  pinConfirmar: "Sair",
  pinCancelar: "Cancelar",
} as const;

/** Telas de bloqueio (§6): neutras, sem ação para a criança. */
export function textoBloqueioTotem(situacao: Exclude<SituacaoTotem, "VOTANDO">, rotuloCandidatos: string): TextoEstado {
  switch (situacao) {
    case "NAO_PAREADO":
      return { titulo: "Este aparelho ainda não é um totem", corpo: "A organização precisa parear este aparelho com o evento." };
    case "DISPOSITIVO_REVOGADO":
      return { titulo: "Totem desativado", corpo: "Este aparelho não recebe mais votos. Fale com a organização." };
    case "DISPOSITIVO_PAUSADO":
      return { titulo: "Totem em pausa", corpo: "Já já a votação volta. Chame um adulto da organização." };
    case "MODULO_DESLIGADO":
      return { titulo: "Votação infantil desligada", corpo: "Este evento não tem votação infantil." };
    case "EVENTO_INDISPONIVEL":
      return { titulo: "Ainda não está pronto", corpo: "Este evento ainda está sendo preparado." };
    case "EVENTO_CONCLUIDO":
      return { titulo: "O evento terminou", corpo: "Obrigado por participar!" };
    case "URNA_NAO_INICIADA":
      return { titulo: "A votação ainda não começou", corpo: "Volte daqui a pouco!" };
    case "URNA_ENCERRADA":
      return { titulo: "A votação acabou", corpo: "Obrigado por participar!" };
    case "SEM_CANDIDATOS":
      return { titulo: "Ainda não dá para votar", corpo: `Ainda não há ${rotuloCandidatos.toLocaleLowerCase("pt-BR")} para votar.` };
  }
}
