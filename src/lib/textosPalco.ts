// Etapa 8 (seção 5.13, D9): textos fixos do palco, neutros (nada concorda com o rótulo do tema).
// Não usam textoDoEstado nem tema.textosEstado (esses são das telas do participante). Pendentes de aprovação (P9).

export const TEXTOS_PALCO = {
  emBreve: "Em breve",
  comecaEm: "A votação começa em",
  aguardandoAbertura: "Aguardando a abertura pela organização",
  aberturaADefinir: "Data de abertura a definir",
  votacaoAberta: "Votação aberta",
  votacaoComecou: "A votação começou",
  retaFinal: "Reta final",
  tempoEsgotado: "Tempo esgotado",
  aguardandoEncerramento: "Aguardando a organização encerrar a votação",
  votacaoEncerrada: "Votação encerrada",
  resultadoEmInstantes: "O resultado será revelado em instantes",
  coVencedores: "Co-vencedores",
  desempatePontuacao: "Desempate pela pontuação final",
  posicaoCompartilhada: "Posição compartilhada, sem decisão automática",
  criterioJuri: "Critério: maior votação do júri",
  criterioPublico: "Critério: maior votação do público",
  juriDesligado: "Módulo do júri desligado",
  semCandidatos: "Nenhum candidato na disputa",
  semResultado: "O resultado oficial ainda não foi calculado",
  marca: "Apuração por VaiVota",
  pausada: "Apresentação pausada. Pressione F para voltar à tela cheia e Espaço para continuar.",
  vencedor: "Vencedor",
  totalVotos: "votos registrados",
  escaneie: "Aponte a câmera para votar",
} as const;

export function lugar(posicao: number, empate = false): string {
  return empate ? `${posicao}º lugar — empate` : `${posicao}º lugar`;
}
