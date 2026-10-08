import { resolverSituacaoEvento, type SituacaoEvento } from "./situacaoEvento";
import type { ConfigApresentacao, Evento, PapelParticipacao } from "./tipos";

// Etapa 2 (D1): variante e ação da entrada do evento = situação (Etapa 1) + sessão. Pura, sem React.
// A Etapa 4 compõe a gate de /votar sobre ela.

export type EntradaVisao = {
  evento: Pick<Evento, "estado" | "estadoUrna" | "janelaInicio" | "janelaFim" | "moduloJuri">;
  configApresentacao: Pick<ConfigApresentacao, "limiarRetaFinalSegundos">;
  agoraMs: number;
  sessao: { logado: boolean; papel: PapelParticipacao | null; emailVerificado: boolean; jaVotou: boolean };
  qtdVotaveis: number;
};

export type VarianteEntrada = "NAO_INICIADA" | "ABERTA" | "ENCERRADA" | "CONCLUIDO" | "SEM_CANDIDATOS" | "INDISPONIVEL";

export type AcaoEntrada =
  | "ENTRAR_OU_CRIAR"
  | "VERIFICAR_EMAIL"
  | "VOTAR"
  | "VOTAR_JURADO"
  | "ALTERAR_VOTO_JURADO"
  | "VER_CONFIRMACAO"
  | "PAINEL_ADMIN"
  | "NENHUMA";

export type SaidaVisao = {
  variante: VarianteEntrada;
  /** Da Etapa 1: dá a contagem, "reta final" e "tempo esgotado". */
  situacao: SituacaoEvento;
  acao: AcaoEntrada;
  bannerRascunho: boolean;
  mostrarCodigoConvite: boolean;
  avisoJuriDesligado: boolean;
  seloVoto: "REGISTRADO" | "REGISTRADO_JURADO" | null;
  /** "Obrigado por votar" na urna encerrada. */
  agradecer: boolean;
};

const URNA_ABERTA: SituacaoEvento[] = ["TEMPO_ESGOTADO", "RETA_FINAL", "ABERTA"];

function resolverVariante(situacao: SituacaoEvento, ehAdmin: boolean, qtdVotaveis: number): VarianteEntrada {
  if (situacao === "CONCLUIDO") return "CONCLUIDO";
  if (situacao === "EM_PREPARACAO" && !ehAdmin) return "INDISPONIVEL";
  if (situacao === "ENCERRADA") return "ENCERRADA";
  if (URNA_ABERTA.includes(situacao)) return qtdVotaveis === 0 ? "SEM_CANDIDATOS" : "ABERTA";
  return "NAO_INICIADA";
}

/** Tabela 5.3, avaliada nesta ordem. `avisoJuriDesligado` só liga quando a regra 6 decide. */
function resolverAcao(
  entrada: EntradaVisao,
  variante: VarianteEntrada,
): { acao: AcaoEntrada; avisoJuriDesligado: boolean } {
  const { sessao, evento } = entrada;
  const so = (acao: AcaoEntrada) => ({ acao, avisoJuriDesligado: false });
  if (sessao.papel === "ADMIN") return so("PAINEL_ADMIN");
  if (variante === "INDISPONIVEL" || variante === "ENCERRADA" || variante === "CONCLUIDO" || variante === "SEM_CANDIDATOS")
    return so("NENHUMA");
  if (!sessao.logado) return so("ENTRAR_OU_CRIAR");
  if (!sessao.emailVerificado) return so("VERIFICAR_EMAIL");
  if (variante === "NAO_INICIADA") return so("NENHUMA");
  if (sessao.papel === "JURADO") {
    if (!evento.moduloJuri) return { acao: "NENHUMA", avisoJuriDesligado: true };
    return so(sessao.jaVotou ? "ALTERAR_VOTO_JURADO" : "VOTAR_JURADO");
  }
  return so(sessao.jaVotou ? "VER_CONFIRMACAO" : "VOTAR");
}

export function resolverVisaoEvento(entrada: EntradaVisao): SaidaVisao {
  const { evento, sessao } = entrada;
  const ehAdmin = sessao.papel === "ADMIN";
  const situacao = resolverSituacaoEvento(evento, entrada.configApresentacao, entrada.agoraMs, { ignorarRascunho: ehAdmin });
  const variante = resolverVariante(situacao, ehAdmin, entrada.qtdVotaveis);
  const { acao, avisoJuriDesligado } = resolverAcao(entrada, variante);
  const publicoOuNulo = sessao.papel === "PUBLICO" || sessao.papel === null;

  return {
    variante,
    situacao,
    acao,
    bannerRascunho: evento.estado === "RASCUNHO" && ehAdmin,
    mostrarCodigoConvite:
      evento.moduloJuri &&
      sessao.logado &&
      sessao.emailVerificado &&
      publicoOuNulo &&
      !sessao.jaVotou &&
      (variante === "ABERTA" || variante === "NAO_INICIADA"),
    avisoJuriDesligado,
    seloVoto: variante === "ABERTA" && sessao.jaVotou ? (sessao.papel === "JURADO" ? "REGISTRADO_JURADO" : "REGISTRADO") : null,
    agradecer: variante === "ENCERRADA" && sessao.jaVotou,
  };
}
