"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { criteriosDoEvento } from "@/dominio/avaliacaoJuri";
import { categoriasDoEvento } from "@/dominio/categorias";
import type { CampoCandidato, Candidato, Categoria, ConfigApresentacao, ConfigPlacar, CriterioJuri, Evento, Parceiro, Tema } from "@/dominio/tipos";
import { useStore } from "../AppProvider";

export type EventoAtivo = {
  slug: string;
  evento: Evento;
  tema: Tema;
  configPlacar: ConfigPlacar;
  configApresentacao: ConfigApresentacao;
  camposCandidato: CampoCandidato[];
  /** Categorias (09/11/2026), ordenadas. Vazio em evento sem categorias (urna única). */
  categorias: Categoria[];
  candidatos: Candidato[];
  /** Critérios do júri (08/10/2026), ordenados. Configuração pública, como os campos extras. */
  criteriosJuri: CriterioJuri[];
  /** Parceiros (08/10/2026), ordenados. */
  parceiros: Parceiro[];
};

/** Slug da rota (/e/[slug]) ou, fora dela, dev.slugPadrao. */
export function useSlugAtivo(): string {
  const params = useParams<{ slug?: string | string[] }>();
  const slugPadrao = useStore((e) => e.dev.slugPadrao);
  const slug = params?.slug;
  return typeof slug === "string" ? decodeURIComponent(slug) : slugPadrao;
}

/**
 * Visão composta do evento ativo (D11). Montada e memoizada aqui no hook, nunca no seletor.
 * Devolve null se o slug não existir.
 */
export function useEventoAtivo(): EventoAtivo | null {
  const slug = useSlugAtivo();
  const eventos = useStore((e) => e.banco.eventos);
  const temas = useStore((e) => e.banco.temas);
  const configsPlacar = useStore((e) => e.banco.configsPlacar);
  const configsApresentacao = useStore((e) => e.banco.configsApresentacao);
  const camposCandidato = useStore((e) => e.banco.camposCandidato);
  const categorias = useStore((e) => e.banco.categorias);
  const candidatos = useStore((e) => e.banco.candidatos);
  const criteriosJuri = useStore((e) => e.banco.criteriosJuri);
  const parceiros = useStore((e) => e.banco.parceiros);

  return useMemo(() => {
    const evento = eventos.find((e) => e.slug === slug);
    if (!evento) return null;
    const tema = temas.find((t) => t.eventoId === evento.id);
    const configPlacar = configsPlacar.find((c) => c.eventoId === evento.id);
    const configApresentacao = configsApresentacao.find((c) => c.eventoId === evento.id);
    if (!tema || !configPlacar || !configApresentacao) return null;
    return {
      slug,
      evento,
      tema,
      configPlacar,
      configApresentacao,
      camposCandidato: camposCandidato.filter((c) => c.eventoId === evento.id).sort((a, b) => a.ordem - b.ordem),
      categorias: categoriasDoEvento(categorias, evento.id),
      candidatos: candidatos.filter((c) => c.eventoId === evento.id),
      criteriosJuri: criteriosDoEvento({ criteriosJuri }, evento.id),
      parceiros: parceiros.filter((p) => p.eventoId === evento.id).sort((a, b) => a.ordem - b.ordem),
    };
  }, [slug, eventos, temas, configsPlacar, configsApresentacao, camposCandidato, categorias, candidatos, criteriosJuri, parceiros]);
}

/** Temas de todos os eventos (galeria /dev/ui). */
export function useTemas(): Tema[] {
  return useStore((e) => e.banco.temas);
}

/** Lista leve dos eventos (para a toolbar). */
export function useEventos(): Evento[] {
  return useStore((e) => e.banco.eventos);
}
