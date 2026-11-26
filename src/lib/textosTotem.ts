import type { SituacaoTotem } from "@/dominio/totem";
import type { TextoEstado } from "@/dominio/tipos";

// Totem (rev. 4, A7; Base/VotoInfantil.md §6): textos curtos para crianças, neutros (nada concorda com o
// rótulo do tema). Provisórios: dependem da revisão única de textos (E30) e da pendência §12.

// 26/11/2026: ainda mais curtos nas telas da criança (pedido do usuário: crianças são visuais; poucas palavras, diretas).
export const TEXTOS_TOTEM = {
  toqueParaVotar: "Toque para votar",
  pergunta: "De qual você mais gostou?",
  confirmar: "É esse?",
  sim: "Sim!",
  nao: "Voltar",
  enviando: "Guardando…",
  obrigado: "Obrigado!",
  votoGuardado: "Voto guardado!",
  // Contador da sessão na tela de sucesso (logTotem.md).
  contadorUm: "voto nesta sessão",
  contadorVarios: "votos nesta sessão",
  // Dica discreta na tela de sucesso: o toque pula a espera e abre a escolha do próximo voto.
  toqueParaProximo: "Toque na tela para votar de novo",
  erroTitulo: "Ops!",
  erroCorpo: "Chame um adulto.",
  tentarDeNovo: "Tentar de novo",
  voltarInicio: "Começar de novo",
  sair: "Sair do modo totem",
  // Menu do PIN (logTotem.md): o botão do canto abre o menu, depois do PIN.
  menu: "Menu do totem",
  menuAnalisar: "Analisar votos",
  menuAbrir: "Abrir sessão",
  menuEncerrar: "Encerrar sessão",
  menuSair: "Sair do modo totem",
  pinTitulo: "Menu do totem",
  pinDescricao: "Digite o PIN do totem para abrir o menu. Só a organização tem o PIN.",
  // Teclado na tela (26/11/2026): o totem pode não ter teclado físico.
  pinTecladoAbrir: "Teclado na tela",
  pinTecladoFechar: "Esconder teclado",
  pinApagar: "Apagar",
  pinLimpar: "Limpar",
  pinCampo: "PIN",
  pinConfirmar: "Abrir menu",
  pinCancelar: "Cancelar",
  carregando: "Preparando o totem…",
  semConexaoTitulo: "Sem conexão",
  semConexaoCorpo: "Não foi possível falar com o servidor. Chame um adulto da organização.",
  parearAparelho: "Parear este aparelho",
  // Pareamento (§4): feito uma vez por um adulto, com o código que o admin gerou.
  parearTitulo: "Parear este aparelho como totem",
  parearDescricao: "Digite o código que a organização gerou na tela Totens da configuração. Ele só funciona uma vez.",
  parearCampo: "Código de pareamento",
  parearConfirmar: "Parear",
  parearVoltar: "Voltar",
  parearSucessoTitulo: "Aparelho pareado!",
  parearSucessoCorpo: "Este aparelho agora é o totem",
  parearAbrir: "Abrir o totem",
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
