import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { db } from "./db";

// Título e descrição de cada rota (D14 da Etapa 2): vêm do banco, para a aba e o link compartilhado terem o nome do
// evento. Slug desconhecido (ou banco fora do ar) cai no título genérico.

const GENERICO: Metadata = {
  title: "VaiVota",
  description: "Votações em eventos, com a identidade de cada evento.",
};

const eventoDoSlug = cache(async (slug: string) => {
  try {
    return await db().evento.findUnique({
      where: { slug },
      select: { nome: true, descricao: true, tema: { select: { nomeExibicao: true } } },
    });
  } catch (erro) {
    console.error("[servidor] metadados: não foi possível ler o evento:", erro);
    return null;
  }
});

export async function obterMetadadosEvento(slug: string): Promise<Metadata> {
  const evento = await eventoDoSlug(slug);
  if (!evento) return GENERICO;
  const nome = evento.tema?.nomeExibicao ?? evento.nome;
  return { title: `${nome} | VaiVota`, description: evento.descricao ?? GENERICO.description };
}

/** Etapa 9 (5.6): título próprio por rota, `{tela} · {nome do evento}`. */
export function metadadosDaTela(tela: string) {
  return async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const base = await obterMetadadosEvento(slug);
    const evento = await eventoDoSlug(slug);
    const nome = evento ? (evento.tema?.nomeExibicao ?? evento.nome) : "VaiVota";
    return { ...base, title: `${tela} · ${nome}` };
  };
}
