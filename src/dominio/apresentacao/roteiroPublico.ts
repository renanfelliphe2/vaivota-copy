import type { ModoRevelacao } from "./tipos";

// Etapa 8 (D14): esqueleto fixo, sem depender do resultado (não revela desempates nem vencedores).

export function descreverRoteiroPublico(opcoes: {
  modulos: { juri: boolean; infantil: boolean };
  classificacaoCompleta: boolean;
  modo: ModoRevelacao;
}): string[] {
  const lista: string[] = [];
  if (opcoes.modo === "ENSAIO") lista.push("Votação ao vivo (simulada)", "Votação encerrada");
  lista.push("Trailer", "Categoria do público");
  if (opcoes.modulos.infantil) lista.push("Categoria infantil");
  if (opcoes.modulos.juri) lista.push("Categoria do júri");
  lista.push("Pódio: 3º, 2º e 1º lugares");
  if (opcoes.classificacaoCompleta) lista.push("Classificação completa");
  lista.push("Resultado final");
  return lista;
}
