// Remetente dos e-mails: o ENDEREÇO vem da configuração (EMAIL_FROM) e o NOME vem do evento de onde a pessoa veio. Assim
// vários eventos rodando ao mesmo tempo mandam cada um com o próprio nome, sem trocar variável na Vercel a cada evento.

const NOME_PADRAO = "VaiVota";
const TAMANHO_MAXIMO_NOME = 70;

/** Aceita "nome <endereco>", "<endereco>" ou só "endereco" e devolve o nome (ou null) e o endereço. */
export function lerEmailFrom(valor: string): { nome: string | null; endereco: string } {
  const texto = valor.trim();
  const comSinais = texto.match(/^(.*?)<\s*([^<>\s]+)\s*>\s*$/);
  if (!comSinais) return { nome: null, endereco: texto };
  const nome = comSinais[1]!.trim().replace(/^"(.*)"$/, "$1").trim();
  return { nome: nome || null, endereco: comSinais[2]! };
}

/** Tira o que quebraria o cabeçalho (aspas, sinais, quebras de linha) e limita o tamanho. */
export function limparNomeRemetente(nome: string): string {
  const limpo = nome.replace(/["<>\\\r\n\t]/g, " ").replace(/\s+/g, " ").trim();
  return limpo.length > TAMANHO_MAXIMO_NOME ? limpo.slice(0, TAMANHO_MAXIMO_NOME).trim() : limpo;
}

/**
 * Monta o "From": nome do evento, ou o nome que estiver no EMAIL_FROM, ou "VaiVota". O nome vai entre aspas, para
 * vírgulas e outros sinais do nome de um evento não confundirem o provedor.
 */
export function montarRemetente(emailFrom: string, nomeEvento: string | null | undefined): string {
  const { nome, endereco } = lerEmailFrom(emailFrom);
  const escolhido = limparNomeRemetente(nomeEvento ?? "") || limparNomeRemetente(nome ?? "") || NOME_PADRAO;
  return `"${escolhido}" <${endereco}>`;
}
