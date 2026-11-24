import { paraMs } from "@/lib/tempo";
import { votaveis } from "./candidatos";
import { avaliarContrasteTema } from "./contrasteTema";
import { conviteUtilizavel } from "./convites";
import type { EstadoApp } from "./tipos";

// Etapa 6 (D19, seção 5.7): checklist de ativação. Função pura sobre valores públicos e contagens;
// o seletor (tela) e o serviço de operação (revalidação) usam a mesma montagem e a mesma avaliação.

export type SecaoConfig = "geral" | "categorias" | "candidatos" | "juri" | "totens" | "placar" | "tema" | "operacao";

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
  /**
   * Categorias (09/11/2026): quantas existem, quantas ainda não têm item na votação e quantos itens na votação estão sem
   * categoria (esses não aparecem em página nenhuma). Sem categorias, o item do checklist não se aplica.
   */
  categorias: { total: number; semItens: number; itensSemCategoria: number };
  /**
   * Categorias do totem (25/11/2026): quantas existem e quantas nenhum totem ativo exibe (ninguém conseguiria votar nelas).
   * Ausente = nenhuma.
   */
  totem?: { categorias: number; semTotemAtivo: number };
};

export type IdItemChecklist = "ITENS" | "CATEGORIAS" | "PESOS" | "JANELA" | "CONVITES" | "TEMA" | "TOTEM" | "TRAILER";
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
  const { categorias } = e;
  const categoriasOk = categorias.semItens === 0 && categorias.itensSemCategoria === 0;
  const detalheCategorias =
    categorias.total === 0
      ? "O evento precisa de ao menos uma categoria."
      : categoriasOk
        ? `${categorias.total} categoria(s), todas com itens na votação.`
        : [
            categorias.semItens > 0 && `${categorias.semItens} categoria(s) sem item na votação`,
            categorias.itensSemCategoria > 0 && `${categorias.itensSemCategoria} item(ns) na votação sem categoria`,
          ]
            .filter(Boolean)
            .join("; ") + ".";

  // Totem (25/11/2026): com o módulo ligado ou com alguma categoria do totem. Cada categoria do totem precisa de um totem ativo que a exiba.
  const totem = e.totem ?? { categorias: 0, semTotemAtivo: 0 };
  const totemAplica = e.moduloInfantil || totem.categorias > 0;
  const totemOk = e.moduloInfantil && e.dispositivosAtivos >= 1 && totem.categorias > 0 && totem.semTotemAtivo === 0;
  const detalheTotem = !totemAplica
    ? "Módulo infantil desligado."
    : !e.moduloInfantil
      ? "Há categoria votada no totem, mas a votação infantil está desligada."
      : totem.categorias === 0
        ? "Nenhuma categoria é votada no totem."
        : totem.semTotemAtivo > 0
          ? `${totem.semTotemAtivo} categoria(s) do totem sem totem ativo que a exiba.`
          : `${e.dispositivosAtivos} totem(ns) ativo(s).`;

  return [
    item("ITENS", "Itens na votação", e.qtdVotaveis >= 2, `${e.qtdVotaveis} na votação (mínimo 2).`, "candidatos"),
    item("CATEGORIAS", "Categorias", categorias.total > 0 && categoriasOk, detalheCategorias, categorias.semItens > 0 || categorias.total === 0 ? "categorias" : "candidatos"),
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
    item("TOTEM", "Totem ativo", totemAplica ? totemOk : null, detalheTotem, "totens", "AVISO"),
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
    categorias: contarCategorias(
      banco.categorias.filter((c) => c.eventoId === eventoId).map((c) => c.id),
      votaveis(banco.candidatos.filter((c) => c.eventoId === eventoId)).map((c) => c.categoriaId),
    ),
    totem: contarCategoriasTotem(
      banco.categorias.filter((c) => c.eventoId === eventoId),
      banco.dispositivos.filter((d) => d.eventoId === eventoId),
    ),
  };
}

/** Categorias do totem e quantas delas nenhum totem ATIVO exibe. */
export function contarCategoriasTotem(
  categorias: readonly { id: string; canal: "ONLINE" | "TOTEM" }[],
  dispositivos: readonly { estado: string; categoriaIds?: readonly string[] }[],
): NonNullable<EntradaChecklist["totem"]> {
  const doTotem = categorias.filter((c) => c.canal === "TOTEM").map((c) => c.id);
  const exibidas = new Set(dispositivos.filter((d) => d.estado === "ATIVO").flatMap((d) => d.categoriaIds ?? []));
  return { categorias: doTotem.length, semTotemAtivo: doTotem.filter((id) => !exibidas.has(id)).length };
}

/** Item do checklist das categorias: `categoriasDosVotaveis` = a categoria de cada item na votação (null = sem categoria). */
export function contarCategorias(categoriaIds: readonly string[], categoriasDosVotaveis: readonly (string | null)[]): EntradaChecklist["categorias"] {
  if (categoriaIds.length === 0) return { total: 0, semItens: 0, itensSemCategoria: 0 };
  const comItens = new Set(categoriasDosVotaveis.filter((c): c is string => c !== null));
  return {
    total: categoriaIds.length,
    semItens: categoriaIds.filter((id) => !comItens.has(id)).length,
    itensSemCategoria: categoriasDosVotaveis.filter((c) => c === null || !categoriaIds.includes(c)).length,
  };
}
