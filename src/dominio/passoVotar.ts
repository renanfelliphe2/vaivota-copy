import type { PapelVoto, TelaVotar } from "./estadoVotar";
import type { EstadoUiVotacao } from "./tipos";

// Etapa 5 (D2, seção 5.3): qual passo aparece dentro das telas LISTA e JA_VOTOU da gate (Etapa 4).

export type PassoVotar = "LISTA" | "REVISAO" | "SUCESSO";

export type EntradaPassoVotar = {
  tela: TelaVotar;
  papelVoto: PapelVoto | null;
  /** Valor bruto de ?passo=. */
  passoUrl: string | null;
  selecaoValida: boolean;
  /** ultimoVoto existe e a chave bate. */
  ultimoVotoValido: boolean;
  envio: EstadoUiVotacao["envio"];
};

export type SaidaPassoVotar = {
  /** null → o componente renderiza a tela de estado da gate (ou TelaJaVotou). */
  passo: PassoVotar | null;
  /** BASE = /votar sem `passo`; a normalização é um router.replace, nunca setState. */
  normalizarPara: "BASE" | "SUCESSO" | null;
};

export function resolverPassoVotar(e: EntradaPassoVotar): SaidaPassoVotar {
  // 1
  if (e.tela !== "LISTA" && e.tela !== "JA_VOTOU") return { passo: null, normalizarPara: null };
  // 2
  if (e.envio !== "OCIOSO" && e.passoUrl === "revisao") return { passo: "REVISAO", normalizarPara: null };
  // 3
  const podeSucesso = e.tela === "JA_VOTOU" || (e.tela === "LISTA" && e.papelVoto === "JURADO");
  if (e.ultimoVotoValido && (e.passoUrl === "revisao" || e.passoUrl === "sucesso") && podeSucesso) {
    return { passo: "SUCESSO", normalizarPara: e.passoUrl === "sucesso" ? null : "SUCESSO" };
  }
  // 4
  if (e.tela === "JA_VOTOU") return { passo: null, normalizarPara: e.passoUrl !== null ? "BASE" : null };
  // 5
  if (e.passoUrl === "revisao" && e.selecaoValida) return { passo: "REVISAO", normalizarPara: null };
  // 6 (`lista` é válido e fica na URL)
  if (e.passoUrl !== null && e.passoUrl !== "lista") return { passo: "LISTA", normalizarPara: "BASE" };
  // 7
  return { passo: "LISTA", normalizarPara: null };
}
