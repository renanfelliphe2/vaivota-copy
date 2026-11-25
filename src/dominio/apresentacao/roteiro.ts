import { criterioEfetivo } from "../apuracao";
import { gruposDoResultado } from "../resultado";
import type { ConfigApresentacao, DadosResultado, Grupo, RegraDesempate } from "../tipos";
import { GRUPOS_TROFEU, mostraVotosNaPosicao, ordenarCerimonia, tamanhoDoPodio } from "./cerimonia";
import { LIMITE_NOMES_CENA } from "./duracoes";
import type { CandidatoPalco, CategoriaPalco, Cena, ModoRevelacao } from "./tipos";

// Cerimônia (25/11/2026; antes, Etapa 8 D1/D12): roteiro puro e determinístico. Uma revelação só para o evento inteiro, na ordem
// configurada (cerimonia.ts): troféus e posições de todas as categorias, o desempate antes da posição que ele decide, o resultado
// de cada categoria logo depois do último item dela e, no fim, o FINAL. As cenas só desenham as fatias de montarProps.

/** Resultado antigo, sem `porCategoria` (eventos de antes das categorias): vira uma categoria só, com este id. */
export const CATEGORIA_UNICA = "evento";

export type EntradaCerimonia = {
  dados: DadosResultado;
  categorias: readonly CategoriaPalco[];
  config: Pick<ConfigApresentacao, "trofeus" | "ordemRevelacao" | "rotuloCategoriaPublico" | "rotuloCategoriaJuri" | "rotuloCategoriaInfantil">;
};

export type EscopoCategoria = { categoria: CategoriaPalco; dados: DadosResultado };

/**
 * As categorias da cerimônia, na ordem, cada uma com a apuração dela (o nome e o prêmio como estavam no congelamento; o pódio, como
 * está configurado agora). Categoria da apuração que não existe mais fica com o pódio padrão.
 */
export function escoposDaCerimonia(entrada: Pick<EntradaCerimonia, "dados" | "categorias">): EscopoCategoria[] {
  const { dados, categorias } = entrada;
  if (!dados.porCategoria?.length)
    return [{ categoria: { id: CATEGORIA_UNICA, nome: "", premio: null, canal: "ONLINE", ordem: 0, podioTamanho: 3, podioVotos: [] }, dados }];
  const configDe = new Map(categorias.map((c) => [c.id, c]));
  const ordemDe = (id: string) => configDe.get(id)?.ordem ?? Number.MAX_SAFE_INTEGER;
  return [...dados.porCategoria]
    .sort((a, b) => ordemDe(a.categoriaId) - ordemDe(b.categoriaId))
    .map((r) => {
      const atual = configDe.get(r.categoriaId);
      return {
        categoria: {
          id: r.categoriaId,
          nome: r.nome,
          premio: r.premio,
          canal: atual?.canal ?? "ONLINE",
          ordem: atual?.ordem ?? 0,
          podioTamanho: tamanhoDoPodio(atual?.podioTamanho ?? 3),
          podioVotos: atual?.podioVotos ?? [],
          campos: atual?.campos,
        },
        dados: r.dados,
      };
    });
}

function posicaoDoItem(dados: DadosResultado, id: string): number {
  return dados.ranking.find((r) => r.candidatoId === id)?.posicao ?? Infinity;
}

export function montarRoteiro(entrada: EntradaCerimonia, opcoes: { modo: ModoRevelacao }): Cena[] {
  const cenas: Cena[] = [];
  if (opcoes.modo === "ENSAIO") cenas.push({ tipo: "AO_VIVO_ENSAIO" }, { tipo: "ENCERRADA_ENSAIO" });
  cenas.push({ tipo: "TRAILER" });
  const escopos = escoposDaCerimonia(entrada).filter((e) => e.dados.ranking.length > 0);
  if (escopos.length === 0) {
    cenas.push({ tipo: "FINAL" });
    return cenas;
  }
  const porCategoria = new Map(escopos.map((e) => [e.categoria.id, e]));
  const itens = ordenarCerimonia(
    escopos.map((e) => ({ id: e.categoria.id, podioTamanho: e.categoria.podioTamanho })),
    entrada.config.trofeus,
    gruposDoResultado(entrada.dados),
    entrada.config.ordemRevelacao,
  );

  const sequencia: Cena[] = [];
  for (const item of itens) {
    if (item.tipo === "TROFEU") {
      const dados = item.categoriaId ? porCategoria.get(item.categoriaId)?.dados : entrada.dados;
      if (dados?.categorias.some((c) => c.grupo === item.grupo && c.vencedores.length > 0))
        sequencia.push({ tipo: "TROFEU", grupo: item.grupo, categoriaId: item.categoriaId, passos: 2 });
    } else {
      const e = porCategoria.get(item.categoriaId);
      if (e?.dados.ranking.some((r) => r.posicao === item.posicao))
        sequencia.push({ tipo: "POSICAO", categoriaId: item.categoriaId, posicao: item.posicao, passos: 2 });
    }
  }

  // Desempate antes da primeira posição que ele decide (só os que mexem no pódio daquela categoria). Desligado na configuração
  // (25/11/2026), a revelação vai direto para quem ficou com a posição.
  const antes = new Map<number, Cena[]>();
  for (const e of entrada.config.ordemRevelacao.mostrarDesempate ? escopos : []) {
    e.dados.empates.forEach((empate, empateIndex) => {
      const posicoes = new Set(empate.candidatoIds.map((id) => posicaoDoItem(e.dados, id)).filter((p) => p <= e.categoria.podioTamanho));
      if (posicoes.size === 0) return;
      const i = sequencia.findIndex((c) => c.tipo === "POSICAO" && c.categoriaId === e.categoria.id && posicoes.has(c.posicao));
      if (i < 0) return;
      antes.set(i, [...(antes.get(i) ?? []), { tipo: "DESEMPATE", categoriaId: e.categoria.id, empateIndex, passos: 3 }]);
    });
  }
  const comDesempates = sequencia.flatMap((c, i) => [...(antes.get(i) ?? []), c]);

  // O resultado de cada categoria logo depois do último item dela. Categoria que revela só o vencedor não tem (25/11/2026): ele
  // acabou de aparecer, a tela só repetiria; os vencedores voltam todos juntos no FINAL.
  const ultimo = new Map<string, number>();
  comDesempates.forEach((c, i) => {
    if ((c.tipo === "TROFEU" && c.categoriaId) || c.tipo === "POSICAO" || c.tipo === "DESEMPATE") ultimo.set(c.categoriaId!, i);
  });
  for (const e of escopos) if (e.categoria.podioTamanho === 1) ultimo.delete(e.categoria.id);
  comDesempates.forEach((c, i) => {
    cenas.push(c);
    for (const [categoriaId, j] of ultimo) if (j === i) cenas.push({ tipo: "RESULTADO", categoriaId });
  });
  cenas.push({ tipo: "FINAL" });
  return cenas;
}

export function passosDaCena(cena: Cena): number {
  switch (cena.tipo) {
    case "TROFEU":
    case "POSICAO":
    case "DESEMPATE":
      return cena.passos;
    case "TRAILER":
      // 08/10/2026: o vídeo e, depois dele, a chamada "E os vencedores deste ano são…".
      return 2;
    default:
      return 1;
  }
}

/** Código curto da cena (testes e LiveRegion): "T:POPULAR", "T:JURI@cat", "P:cat:1", "D:cat:0", "R:cat". */
export function codigoDaCena(cena: Cena): string {
  switch (cena.tipo) {
    case "TROFEU":
      return cena.categoriaId ? `T:${cena.grupo}@${cena.categoriaId}` : `T:${cena.grupo}`;
    case "POSICAO":
      return `P:${cena.categoriaId}:${cena.posicao}`;
    case "DESEMPATE":
      return `D:${cena.categoriaId}:${cena.empateIndex}`;
    case "RESULTADO":
      return `R:${cena.categoriaId}`;
    default:
      return cena.tipo;
  }
}

export type ListaLimitada<T> = { itens: T[]; mais: number };

function limitar<T>(lista: T[]): ListaLimitada<T> {
  return { itens: lista.slice(0, LIMITE_NOMES_CENA), mais: Math.max(0, lista.length - LIMITE_NOMES_CENA) };
}

/** Votos e porcentagem de um item (null quando a configuração esconde ou não há votos daquele tipo). */
export type Contagem = { votos: number; percentual: number } | null;
export type ItemRevelado = { candidatoId: string; contagem: Contagem };

export type PropsResultado = {
  categoriaId: string;
  nome: string;
  premio: string | null;
  /** Pódio de uma posição só: o telão chama de vencedor. */
  unico: boolean;
  podio: { posicao: number; itens: ItemRevelado[] }[];
  /** Troféus que itens desta categoria levaram. */
  premiados: { titulo: string; candidatoIds: string[] }[];
};

export type PropsCena =
  | {
      tipo: "TROFEU";
      grupo: Grupo;
      titulo: string;
      origem: Grupo;
      /** Nome da categoria; null no troféu do evento. */
      categoria: string | null;
      vencedores: ItemRevelado[];
      disputa: string[];
      passo: number;
    }
  | {
      tipo: "POSICAO";
      categoria: string;
      premio: string | null;
      posicao: number;
      unico: boolean;
      vencedores: ItemRevelado[];
      disputa: string[];
      /** Posições desta categoria já reveladas antes desta cena. */
      revelados: { posicao: number; candidatoIds: string[] }[];
      passo: number;
    }
  | {
      tipo: "DESEMPATE";
      categoria: string;
      candidatos: ListaLimitada<{ candidatoId: string; votos: number; posicao: number }>;
      criterio: RegraDesempate;
      criterioConfigurado: RegraDesempate;
      resolvido: boolean;
      vencedorId: string | null;
      passo: number;
    }
  | ({ tipo: "RESULTADO" } & PropsResultado)
  | { tipo: "FINAL"; resultados: PropsResultado[] }
  | { tipo: "OUTRA" };

export function rotuloDoTrofeu(config: EntradaCerimonia["config"], grupo: Grupo): string {
  return grupo === "POPULAR" ? config.rotuloCategoriaPublico : grupo === "JURI" ? config.rotuloCategoriaJuri : config.rotuloCategoriaInfantil;
}

/** O tipo de votação que dá os votos de uma posição: o do totem nas categorias do totem, o online nas outras. */
function grupoDaCategoria(e: EscopoCategoria): Grupo | null {
  const ligados = gruposDoResultado(e.dados);
  const preferido: Grupo = e.categoria.canal === "TOTEM" ? "INFANTIL" : "POPULAR";
  if (ligados.includes(preferido) && e.dados.totais[preferido] > 0) return preferido;
  return ligados.find((g) => e.dados.totais[g] > 0) ?? null;
}

function contagem(dados: DadosResultado, grupo: Grupo | null, id: string, mostrar: boolean): Contagem {
  if (!mostrar || !grupo) return null;
  const total = dados.totais[grupo];
  if (total <= 0) return null;
  const votos = dados.placares[grupo].find((p) => p.candidatoId === id)?.votos ?? 0;
  return { votos, percentual: (votos / total) * 100 };
}

function itensDaPosicao(e: EscopoCategoria, posicao: number): ItemRevelado[] {
  const grupo = grupoDaCategoria(e);
  const mostrar = mostraVotosNaPosicao(e.categoria.podioVotos, posicao);
  return e.dados.ranking.filter((r) => r.posicao === posicao).map((r) => ({ candidatoId: r.candidatoId, contagem: contagem(e.dados, grupo, r.candidatoId, mostrar) }));
}

function vencedoresDoTrofeu(entrada: EntradaCerimonia, dados: DadosResultado, grupo: Grupo): ItemRevelado[] {
  const mostrar = entrada.config.trofeus[grupo].mostrarVotos;
  const c = dados.categorias.find((x) => x.grupo === grupo);
  return (c?.vencedores ?? []).map((v) => ({ candidatoId: v.candidatoId, contagem: contagem(dados, grupo, v.candidatoId, mostrar) }));
}

export function montarResultado(entrada: EntradaCerimonia, e: EscopoCategoria): PropsResultado {
  const tam = e.categoria.podioTamanho;
  const posicoes = [...new Set(e.dados.ranking.map((r) => r.posicao))].filter((p) => p <= tam).sort((a, b) => a - b);
  const ligados = gruposDoResultado(entrada.dados);
  const idsDaCategoria = new Set(e.dados.ranking.map((r) => r.candidatoId));
  const premiados = GRUPOS_TROFEU.flatMap((g) => {
    const t = entrada.config.trofeus[g];
    if (!t.ativo || !ligados.includes(g)) return [];
    const dados = t.escopo === "EVENTO" ? entrada.dados : e.dados;
    const ids = (dados.categorias.find((c) => c.grupo === g)?.vencedores ?? []).map((v) => v.candidatoId).filter((id) => idsDaCategoria.has(id));
    return ids.length ? [{ titulo: rotuloDoTrofeu(entrada.config, g), candidatoIds: ids }] : [];
  });
  return {
    categoriaId: e.categoria.id,
    nome: e.categoria.nome,
    premio: e.categoria.premio,
    unico: tam === 1,
    podio: posicoes.map((posicao) => ({ posicao, itens: itensDaPosicao(e, posicao) })),
    premiados,
  };
}

/** Os resultados de todas as categorias com itens, na ordem (cena FINAL e final estático: o vencedor de cada uma). */
export function montarFinal(entrada: EntradaCerimonia): PropsResultado[] {
  return escoposDaCerimonia(entrada)
    .filter((e) => e.dados.ranking.length > 0)
    .map((e) => montarResultado(entrada, e));
}

function escopo(entrada: EntradaCerimonia, categoriaId: string): EscopoCategoria | null {
  return escoposDaCerimonia(entrada).find((e) => e.categoria.id === categoriaId) ?? null;
}

export function montarProps(entrada: EntradaCerimonia, roteiro: Cena[], indice: number, passo: number): PropsCena {
  const cena = roteiro[indice];
  if (!cena) return { tipo: "OUTRA" };
  switch (cena.tipo) {
    case "TROFEU": {
      const e = cena.categoriaId ? escopo(entrada, cena.categoriaId) : null;
      const dados = e?.dados ?? entrada.dados;
      return {
        tipo: "TROFEU",
        grupo: cena.grupo,
        titulo: rotuloDoTrofeu(entrada.config, cena.grupo),
        origem: cena.grupo,
        categoria: e?.categoria.nome || null,
        vencedores: vencedoresDoTrofeu(entrada, dados, cena.grupo),
        disputa: dados.ranking.map((r) => r.candidatoId),
        passo,
      };
    }
    case "POSICAO": {
      const e = escopo(entrada, cena.categoriaId);
      if (!e) return { tipo: "OUTRA" };
      const revelados = roteiro
        .slice(0, indice)
        .flatMap((c) => (c.tipo === "POSICAO" && c.categoriaId === cena.categoriaId ? [c.posicao] : []))
        .map((posicao) => ({ posicao, candidatoIds: e.dados.ranking.filter((r) => r.posicao === posicao).map((r) => r.candidatoId) }));
      return {
        tipo: "POSICAO",
        categoria: e.categoria.nome,
        premio: e.categoria.premio,
        posicao: cena.posicao,
        unico: e.categoria.podioTamanho === 1,
        vencedores: itensDaPosicao(e, cena.posicao),
        disputa: e.dados.ranking.map((r) => r.candidatoId),
        revelados,
        passo,
      };
    }
    case "DESEMPATE": {
      const e = escopo(entrada, cena.categoriaId);
      const empate = e?.dados.empates[cena.empateIndex];
      if (!e || !empate) return { tipo: "OUTRA" };
      const grupo: Grupo = empate.criterioAplicado === "JURI" ? "JURI" : "POPULAR";
      const votos = (id: string) => e.dados.placares[grupo].find((p) => p.candidatoId === id)?.votos ?? 0;
      return {
        tipo: "DESEMPATE",
        categoria: e.categoria.nome,
        candidatos: limitar(empate.candidatoIds.map((id) => ({ candidatoId: id, votos: votos(id), posicao: posicaoDoItem(e.dados, id) }))),
        criterio: empate.criterioAplicado,
        criterioConfigurado: e.dados.criterioDesempate,
        resolvido: empate.resolvido,
        vencedorId: empate.vencedorId ?? null,
        passo,
      };
    }
    case "RESULTADO": {
      const e = escopo(entrada, cena.categoriaId);
      return e ? { tipo: "RESULTADO", ...montarResultado(entrada, e) } : { tipo: "OUTRA" };
    }
    case "FINAL":
      return { tipo: "FINAL", resultados: montarFinal(entrada) };
    default:
      return { tipo: "OUTRA" };
  }
}

/** Crédito do item no telão (Direção, ou Proponente), a partir dos campos extras da categoria. */
export function creditoDoItem(candidato: CandidatoPalco, categoria: Pick<CategoriaPalco, "campos"> | null | undefined): { rotulo: string; valor: string } | null {
  const extras = candidato.camposExtras;
  if (!extras) return null;
  for (const chave of ["direcao", "proponente", "realizacao"]) {
    const valor = extras[chave]?.trim();
    if (valor) return { rotulo: categoria?.campos?.find((c) => c.chave === chave)?.rotulo ?? (chave === "direcao" ? "Direção" : chave === "proponente" ? "Proponente" : "Realização"), valor };
  }
  return null;
}

/** Critério efetivo do resultado (para a nota "Módulo do júri desligado"). */
export function criterioDoResultado(dados: DadosResultado): RegraDesempate {
  return criterioEfetivo(dados.criterioDesempate, gruposDoResultado(dados));
}
