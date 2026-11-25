import type { ConfigApresentacao, Grupo } from "../tipos";
import { ordenarCerimonia, type ItemCerimonia } from "./cerimonia";
import type { ModoRevelacao } from "./tipos";

// Etapa 8 (D14) e cerimônia (25/11/2026): o esqueleto da cerimônia na ordem configurada, sem depender do resultado (não revela
// desempates nem vencedores; um item sem vencedor some na hora, no telão).

export type CategoriaDoRoteiro = { id: string; nome: string; podioTamanho: number };
type ConfigDoRoteiro = Pick<ConfigApresentacao, "trofeus" | "ordemRevelacao" | "rotuloCategoriaPublico" | "rotuloCategoriaJuri" | "rotuloCategoriaInfantil">;

export function rotuloDoTrofeuConfig(config: ConfigDoRoteiro, grupo: Grupo): string {
  return grupo === "POPULAR" ? config.rotuloCategoriaPublico : grupo === "JURI" ? config.rotuloCategoriaJuri : config.rotuloCategoriaInfantil;
}

/** O nome de um item da ordem (editor da ordem e roteiro da sala). */
export function rotuloDoItem(item: ItemCerimonia, categorias: readonly CategoriaDoRoteiro[], config: ConfigDoRoteiro): { titulo: string; detalhe: string } {
  const categoria = categorias.find((c) => c.id === item.categoriaId);
  if (item.tipo === "TROFEU") return { titulo: rotuloDoTrofeuConfig(config, item.grupo), detalhe: categoria ? categoria.nome : "Evento todo" };
  return { titulo: categoria?.podioTamanho === 1 ? "Vencedor" : `${item.posicao}º lugar`, detalhe: categoria?.nome ?? "" };
}

/** A lista na ordem, com o resultado de cada categoria depois do último item dela. */
export function descreverRoteiroPublico(opcoes: {
  categorias: readonly CategoriaDoRoteiro[];
  config: ConfigDoRoteiro;
  gruposAtivos: readonly Grupo[];
  modo: ModoRevelacao;
}): string[] {
  const { categorias, config } = opcoes;
  const itens = ordenarCerimonia(categorias, config.trofeus, opcoes.gruposAtivos, config.ordemRevelacao);
  const ultimo = new Map<string, number>();
  itens.forEach((x, i) => x.categoriaId && ultimo.set(x.categoriaId, i));
  const lista: string[] = [];
  if (opcoes.modo === "ENSAIO") lista.push("Votação ao vivo (simulada)", "Votação encerrada");
  lista.push("Trailer");
  itens.forEach((x, i) => {
    const r = rotuloDoItem(x, categorias, config);
    lista.push(r.detalhe ? `${r.titulo} · ${r.detalhe}` : r.titulo);
    for (const [id, j] of ultimo) if (j === i) lista.push(`Resultado · ${categorias.find((c) => c.id === id)?.nome ?? ""}`);
  });
  lista.push("Resultado final");
  return lista;
}
