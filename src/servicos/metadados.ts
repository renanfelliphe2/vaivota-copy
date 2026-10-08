import type { Metadata } from "next";
import { seedEventos, seedTemas } from "@/mocks/seed";

// D14: metadata de servidor lê o seed (o servidor não conhece o estado do cliente).
// Slug desconhecido do servidor cai no título genérico.

const GENERICO: Metadata = {
  title: "VaiVota",
  description: "Votações em eventos, com a identidade de cada evento.",
};

export async function obterMetadadosEvento(slug: string): Promise<Metadata> {
  const evento = seedEventos.find((e) => e.slug === slug);
  if (!evento) return GENERICO;
  const tema = seedTemas.find((t) => t.eventoId === evento.id);
  const nome = tema?.nomeExibicao ?? evento.nome;
  return {
    title: `${nome} | VaiVota`,
    description: evento.descricao ?? GENERICO.description,
  };
}

/** Etapa 9 (5.6): título próprio por rota, `{tela} · {nome do evento}`. */
export function metadadosDaTela(tela: string) {
  return async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const base = await obterMetadadosEvento(slug);
    const evento = seedEventos.find((e) => e.slug === slug);
    const nome = evento ? (seedTemas.find((t) => t.eventoId === evento.id)?.nomeExibicao ?? evento.nome) : "VaiVota";
    return { ...base, title: `${tela} · ${nome}` };
  };
}
