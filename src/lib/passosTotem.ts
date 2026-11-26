import { TEMPOS_TOTEM } from "@/dominio/totem";
import type { TipoEventoLog } from "./logTotem";

// Passos do totem (FluxoTotem), em funções puras para o teste: quanto tempo cada passo espera, para onde vai quando o tempo
// acaba e o que entra no log.
//
// 26/11/2026 (pedido do usuário, depois da 2ª sessão): as crianças votam em fila. Depois do voto, o totem não volta mais à
// tela inicial ("Toque para votar"): vai direto para a escolha do próximo, "em espera". Se ninguém escolher um cartaz em
// 15 s, aí volta à tela inicial. O fluxo fica Escolhe → Confirma → Escolhe → Confirma...

export type PassoTotem =
  | { tipo: "INICIO" }
  /** `emEspera`: aberta sozinha depois de um voto e ainda sem ninguém escolher um cartaz. */
  | { tipo: "ESCOLHA"; emEspera?: boolean }
  /** `idEnvio` só existe na confirmação que veio de "tentar de novo". */
  | { tipo: "CONFIRMAR"; candidatoId: string; idEnvio?: string }
  | { tipo: "ENVIANDO"; candidatoId: string; idEnvio: string }
  /** `votosSessao`: o contador que o servidor devolveu (logTotem.md). Sem ele (resposta antiga), a tela fica sem número. */
  | { tipo: "SUCESSO"; votosSessao?: number }
  | { tipo: "ERRO"; candidatoId: string; idEnvio: string };

export const PASSO_INICIO: PassoTotem = { tipo: "INICIO" };

/** A escolha do próximo voto, logo depois de um voto confirmado. */
export const PASSO_PROXIMO: PassoTotem = { tipo: "ESCOLHA", emEspera: true };

const emEspera = (passo: PassoTotem) => passo.tipo === "ESCOLHA" && passo.emEspera === true;

/** Quanto tempo o passo espera antes de seguir sozinho; null = não segue sozinho (início e envio). */
export function limiteDoPasso(passo: PassoTotem): number | null {
  if (passo.tipo === "SUCESSO") return TEMPOS_TOTEM.retornoMs;
  if (passo.tipo === "ERRO") return TEMPOS_TOTEM.erroMs;
  if (emEspera(passo)) return TEMPOS_TOTEM.esperaProximoMs;
  if (passo.tipo === "ESCOLHA" || passo.tipo === "CONFIRMAR") return TEMPOS_TOTEM.inatividadeMs;
  return null;
}

/** Na escolha e na confirmação, cada toque na tela reinicia a contagem. */
export function toqueReiniciaContagem(passo: PassoTotem): boolean {
  return passo.tipo === "ESCOLHA" || passo.tipo === "CONFIRMAR";
}

/**
 * O tempo do passo acabou: para onde vai e o que entra no log. A escolha em espera que ninguém usou volta ao início sem log:
 * não é uma criança que desistiu, é a fila que acabou.
 */
export function depoisDoTempo(passo: PassoTotem): { proximo: PassoTotem; log?: TipoEventoLog } {
  if (passo.tipo === "SUCESSO") return { proximo: PASSO_PROXIMO };
  if (emEspera(passo)) return { proximo: PASSO_INICIO };
  if (passo.tipo === "ESCOLHA") return { proximo: PASSO_INICIO, log: "DESISTIU_ESCOLHA" };
  if (passo.tipo === "CONFIRMAR") return { proximo: PASSO_INICIO, log: "DESISTIU_CONFIRMAR" };
  if (passo.tipo === "ERRO") return { proximo: PASSO_INICIO, log: "ERRO_DESCARTADO" };
  return { proximo: passo };
}

/**
 * O que um cartaz escolhido grava no log. Na escolha em espera, a escolha é também o começo de um novo voto: conta como
 * "COMECOU", para o funil seguir comparando começos e votos (antes, o começo era o toque em "Toque para votar").
 */
export function logsDaEscolha(passo: PassoTotem): TipoEventoLog[] {
  return emEspera(passo) ? ["COMECOU", "ESCOLHEU"] : ["ESCOLHEU"];
}
