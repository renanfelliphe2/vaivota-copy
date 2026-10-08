import { paraMs } from "@/lib/tempo";
import { votaveis } from "./candidatos";
import { avaliarContrasteTema } from "./contrasteTema";
import { conviteUtilizavel } from "./convites";
import type { EstadoApp } from "./tipos";

// Etapa 6 (D19, seção 5.7): checklist de ativação. Função pura sobre valores públicos e contagens;
// o seletor (tela) e o serviço de operação (revalidação) usam a mesma montagem e a mesma avaliação.

export type SecaoConfig = "geral" | "candidatos" | "juri" | "placar" | "tema" | "operacao";

export type EntradaChecklist = {
  agoraMs: number;
  qtdVotaveis: number;
  pesos: { POPULAR: number; JURI: number; INFANTIL: number };
  moduloJuri: boolean;
  moduloInfantil: boolean;
  janelaInicioMs: number | null;
  janelaFimMs: number | null;
  /** Convites nem revogados nem expirados (contagem; nunca hash). */
  convitesUtilizaveis: number;
  temaAprovado: boolean;
  dispositivosAtivos: number;
  trailerConfigurado: boolean;
};

export type IdItemChecklist = "ITENS" | "PESOS" | "JANELA" | "CONVITES" | "TEMA" | "TOTEM" | "TRAILER";
export type EstadoItemChecklist = "OK" | "PENDENTE" | "AVISO" | "NAO_SE_APLICA";

export type ItemChecklist = {
  id: IdItemChecklist;
  titulo: string;
  detalhe: string;
  estado: EstadoItemChecklist;
  severidade: "BLOQUEIA" | "AVISO";
  /** Seção que resolve a pendência (null = só informa). */
  secao: SecaoConfig | null;
};

const RE_TRAILER = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)[\w-]+/;

/** Um único trailer do evento, por link do YouTube ou do Vimeo (rev. 4, E21). */
export function trailerValido(url: string | null): boolean {
  return Boolean(url && RE_TRAILER.test(url));
}

export function avaliarChecklist(e: EntradaChecklist): ItemChecklist[] {
  const item = (
    id: IdItemChecklist,
    titulo: string,
    ok: boolean | null,
    detalhe: string,
    secao: SecaoConfig | null,
    severidade: ItemChecklist["severidade"] = "BLOQUEIA",
  ): ItemChecklist => ({
    id,
    titulo,
    detalhe,
    severidade,
    secao,
    estado: ok === null ? "NAO_SE_APLICA" : ok ? "OK" : severidade === "BLOQUEIA" ? "PENDENTE" : "AVISO",
  });

  const soma = e.pesos.POPULAR + e.pesos.JURI + e.pesos.INFANTIL;
  const ligadoComZero =
    e.pesos.POPULAR === 0 || (e.moduloJuri && e.pesos.JURI === 0) || (e.moduloInfantil && e.pesos.INFANTIL === 0);
  const janelaOk =
    e.janelaInicioMs !== null && e.janelaFimMs !== null && e.janelaInicioMs < e.janelaFimMs && e.janelaFimMs > e.agoraMs;

  return [
    item("ITENS", "Itens na votação", e.qtdVotaveis >= 2, `${e.qtdVotaveis} na votação (mínimo 2).`, "candidatos"),
    item(
      "PESOS",
      "Pesos do placar",
      soma === 100 && !ligadoComZero,
      ligadoComZero ? "Há módulo ligado com peso 0." : `Soma ${soma}%.`,
      "placar",
    ),
    item(
      "JANELA",
      "Janela de votação",
      janelaOk,
      janelaOk ? "Início antes do fim, e o fim no futuro." : "O fim precisa ser depois do início e depois de agora.",
      "geral",
    ),
    item(
      "CONVITES",
      "Convites do júri",
      e.moduloJuri ? e.convitesUtilizaveis >= 1 : null,
      e.moduloJuri ? `${e.convitesUtilizaveis} convite(s) utilizável(is).` : "Módulo júri desligado.",
      "juri",
    ),
    item("TEMA", "Contraste do tema", e.temaAprovado, e.temaAprovado ? "Todos os pares aprovados." : "Há pares de cor reprovados.", "tema"),
    item(
      "TOTEM",
      "Totem ativo",
      e.moduloInfantil ? e.dispositivosAtivos >= 1 : null,
      e.moduloInfantil ? `${e.dispositivosAtivos} totem(ns) ativo(s).` : "Módulo infantil desligado.",
      null,
      "AVISO",
    ),
    item(
      "TRAILER",
      "Trailer",
      e.trailerConfigurado,
      e.trailerConfigurado ? "Link do trailer ou trailer gerado." : "Sem link válido nem trailer gerado.",
      null,
      "AVISO",
    ),
  ];
}

export function checklistTemBloqueio(itens: readonly ItemChecklist[]): boolean {
  return itens.some((i) => i.estado === "PENDENTE");
}

/** Monta a entrada a partir do estado (só contagens e valores públicos). */
export function montarEntradaChecklist(estado: Pick<EstadoApp, "banco">, eventoId: string, agoraMs: number): EntradaChecklist {
  const { banco } = estado;
  const evento = banco.eventos.find((e) => e.id === eventoId)!;
  const placar = banco.configsPlacar.find((c) => c.eventoId === eventoId)!;
  const tema = banco.temas.find((t) => t.eventoId === eventoId)!;
  const apresentacao = banco.configsApresentacao.find((c) => c.eventoId === eventoId);
  return {
    agoraMs,
    qtdVotaveis: votaveis(banco.candidatos.filter((c) => c.eventoId === eventoId)).length,
    pesos: { POPULAR: placar.pesoPopular, JURI: placar.pesoJuri, INFANTIL: placar.pesoInfantil },
    moduloJuri: evento.moduloJuri,
    moduloInfantil: evento.moduloInfantil,
    janelaInicioMs: evento.janelaInicio ? paraMs(evento.janelaInicio) : null,
    janelaFimMs: evento.janelaFim ? paraMs(evento.janelaFim) : null,
    convitesUtilizaveis: banco.convitesJurado.filter((c) => c.eventoId === eventoId && conviteUtilizavel(c, agoraMs)).length,
    temaAprovado: avaliarContrasteTema(tema).aprovado,
    dispositivosAtivos: banco.dispositivos.filter((d) => d.eventoId === eventoId && d.estado === "ATIVO").length,
    trailerConfigurado: Boolean(apresentacao && (trailerValido(apresentacao.trailerUrl) || apresentacao.usarTrailerGerado)),
  };
}
