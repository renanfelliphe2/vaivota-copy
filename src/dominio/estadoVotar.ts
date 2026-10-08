import { resolverVisaoEvento, type EntradaVisao, type SaidaVisao } from "./visaoEvento";

// Etapa 4 (D1): a gate de /votar = resolverVisaoEvento (Etapa 2) + papel + sessão. Pura, sem React.
// Começa depois do RotaGuard: login e verificação de e-mail são dele.

export type TelaVotar =
  | "ACESSO_PENDENTE" // transitório: o RotaGuard redireciona, ou garantirParticipacao (Etapa 3) ainda roda
  | "ADMIN_NAO_VOTA"
  | "INDISPONIVEL"
  | "CONCLUIDO"
  | "ENCERRADA"
  | "NAO_INICIADA"
  | "JURI_DESLIGADO"
  | "SEM_CANDIDATOS"
  | "JA_VOTOU"
  | "LISTA";

export type PapelVoto = "PUBLICO" | "JURADO";

export type EstadoVotar = {
  tela: TelaVotar;
  /** Da Etapa 2; as telas de estado leem situação, contagem e `agradecer` daqui. */
  visao: SaidaVisao;
  /** Só com tela = "LISTA". */
  papelVoto: PapelVoto | null;
  /** Situação TEMPO_ESGOTADO; só com tela = "LISTA". */
  avisoTempoEsgotado: boolean;
};

/** Seção 5.2, avaliada nesta ordem; a primeira regra que bater define a tela. */
export function resolverEstadoVotar(entrada: EntradaVisao): EstadoVotar {
  const visao = resolverVisaoEvento(entrada);
  const { sessao } = entrada;
  const tela = (t: TelaVotar): EstadoVotar => ({ tela: t, visao, papelVoto: null, avisoTempoEsgotado: false });

  if (!sessao.logado || !sessao.emailVerificado || sessao.papel === null) return tela("ACESSO_PENDENTE");
  if (sessao.papel === "ADMIN") return tela("ADMIN_NAO_VOTA");
  if (visao.variante === "INDISPONIVEL") return tela("INDISPONIVEL");
  if (visao.variante === "CONCLUIDO") return tela("CONCLUIDO");
  if (visao.variante === "ENCERRADA") return tela("ENCERRADA");
  if (visao.variante === "NAO_INICIADA") return tela("NAO_INICIADA");
  if (visao.avisoJuriDesligado) return tela("JURI_DESLIGADO");
  if (visao.variante === "SEM_CANDIDATOS") return tela("SEM_CANDIDATOS");
  if (visao.acao === "VER_CONFIRMACAO") return tela("JA_VOTOU");

  return {
    tela: "LISTA",
    visao,
    papelVoto: sessao.papel === "JURADO" ? "JURADO" : "PUBLICO",
    avisoTempoEsgotado: visao.situacao === "TEMPO_ESGOTADO",
  };
}
