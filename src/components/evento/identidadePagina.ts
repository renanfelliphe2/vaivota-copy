"use client";

import { useEventoAtivo } from "@/store/seletores/evento";
import { RIO_POMBA_VALLEY, type MarcaOrganizador } from "./MarcaOrganizador";

/**
 * Identidade da página pública de cada evento (/e/[slug]), 07/11/2026. As cores, o logo e a fonte vêm do tema (banco);
 * o que o tema ainda não guarda fica aqui, por evento:
 *  - `estilo`: o desenho da página. "padrao" é o da Maratona Tech Tivit (hero noite → mar com a rede de nós, cartões
 *    quadrados); "cinema" é o do Festival Ver e Fazer Filmes (sala escura, película com os cartazes, ingressos e
 *    créditos, cartões em formato de cartaz).
 *  - `organizador`: a marca de quem organiza, no hero, no cabeçalho e no rodapé (null: nenhuma).
 * Evento sem entrada aqui fica com o padrão e sem marca de organizador. Uma nova edição com outro endereço precisa da
 * própria entrada (ou, no futuro, de um campo no tema).
 */

export type EstiloPagina = "padrao" | "cinema";

export type IdentidadePagina = { estilo: EstiloPagina; organizador: MarcaOrganizador | null };

const PADRAO: IdentidadePagina = { estilo: "padrao", organizador: null };

const POR_EVENTO: Record<string, IdentidadePagina> = {
  "maratona-tech-tivit": { estilo: "padrao", organizador: RIO_POMBA_VALLEY },
  "ver-e-fazer-filmes": { estilo: "cinema", organizador: null },
};

export function identidadeDoEvento(slug: string): IdentidadePagina {
  return POR_EVENTO[slug] ?? PADRAO;
}

/** A identidade do evento aberto (fora de um evento, o padrão). */
export function useIdentidadePagina(): IdentidadePagina {
  const ativo = useEventoAtivo();
  return ativo ? identidadeDoEvento(ativo.slug) : PADRAO;
}
