import type { ChaveTextoEstado, Tema, TextoEstado } from "@/dominio/tipos";

// Textos das telas de estado (Etapa 2, seção 5.5). Padrão do mockup, sobrescrito por tema.textosEstado.
// Sem artigo nem adjetivo que concorde com o rótulo (D10): "música" é feminino, "projeto", masculino.
// Textos provisórios (P6).

export const TEXTOS_ESTADO_PADRAO: Record<ChaveTextoEstado, TextoEstado> = {
  NAO_INICIADA: {
    titulo: "A votação ainda não começou",
    corpo: "Você já pode criar sua conta. Quando a urna abrir, é só voltar aqui para votar.",
  },
  ABERTA: { titulo: "Votação aberta", corpo: "Entre ou crie sua conta e vote em poucos passos." },
  JA_VOTOU: { titulo: "Seu voto foi registrado", corpo: "Obrigado por participar!" },
  JURADO_JA_VOTOU: { titulo: "Seu voto foi registrado", corpo: "Você pode alterá-lo até o encerramento da votação." },
  // Etapa 5: padrão para temas sem override.
  SUCESSO: { titulo: "Seu voto foi registrado", corpo: "Obrigado por participar! O resultado será divulgado pela organização." },
  VOTO_ATUALIZADO: { titulo: "Seu voto foi atualizado", corpo: "Você pode alterá-lo até o encerramento da votação." },
  ENCERRADA: {
    titulo: "Votação encerrada",
    corpo: "Obrigado por participar! O resultado será divulgado pela organização.",
  },
  CONCLUIDO: { titulo: "Evento concluído", corpo: "Obrigado por fazer parte desta edição." },
  SEM_CANDIDATOS: { titulo: "Ainda não dá para votar", corpo: "A lista de {rotulos} será divulgada em breve." },
  INDISPONIVEL: { titulo: "Este evento ainda não está disponível", corpo: "Volte em breve." },
  // Etapa 4
  ADMIN_NAO_VOTA: {
    titulo: "Administradores não votam",
    corpo: "Esta conta administra o evento. Para acompanhar a votação, use o painel.",
  },
};

export type TemaTextos = Pick<Tema, "textosEstado" | "rotuloCandidato" | "rotuloCandidatos">;

/** Contador da Etapa 2 (entrada e lista de /votar): "8 projetos concorrendo". Conta candidatos, nunca votos. */
export function textoContador(n: number, tema: Pick<Tema, "rotuloCandidato" | "rotuloCandidatos">): string {
  const rotulo = (n === 1 ? tema.rotuloCandidato : tema.rotuloCandidatos).toLocaleLowerCase("pt-BR");
  return `${n} ${rotulo} concorrendo`;
}

function interpolar(texto: string, valores: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (inteiro, chave: string) => (chave in valores ? String(valores[chave]) : inteiro));
}

/**
 * Texto da tela de estado: override do tema (se houver) ou o padrão, com `{rotulo}` e `{rotulos}`
 * (rótulos do tema em minúsculas) e outros valores de `contexto` interpolados.
 */
export function textoDoEstado(
  chave: ChaveTextoEstado,
  tema: TemaTextos,
  contexto: Record<string, string | number> = {},
): TextoEstado {
  const base = tema.textosEstado?.[chave] ?? TEXTOS_ESTADO_PADRAO[chave];
  const valores = {
    rotulo: tema.rotuloCandidato.toLocaleLowerCase("pt-BR"),
    rotulos: tema.rotuloCandidatos.toLocaleLowerCase("pt-BR"),
    ...contexto,
  };
  return { titulo: interpolar(base.titulo, valores), corpo: interpolar(base.corpo, valores) };
}
