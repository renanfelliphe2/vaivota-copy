"use client";

import { useMemo } from "react";
import { votaveis } from "@/dominio/candidatos";
import type { Participacao, PapelParticipacao, Usuario } from "@/dominio/tipos";
import { useStore } from "../AppProvider";
import { useEventoAtivo } from "./evento";

export type Sessao = {
  /** false = visitante. */
  logado: boolean;
  usuario: Usuario | null;
  emailVerificado: boolean;
  /** No evento ativo. */
  participacao: Participacao | null;
  /** null = visitante ou logado sem participação. */
  papel: PapelParticipacao | null;
  /**
   * Evento sem categorias: a participação já votou. Evento com categorias (09/11/2026), para o público: já votou em TODAS as
   * categorias que têm item na votação (o "voto registrado" do cabeçalho e do hero só aparece no fim). O jurado segue com o
   * `votou` da participação.
   */
  jaVotou: boolean;
  /** Categorias em que a pessoa já votou (evento com categorias); nunca em quem. */
  categoriasVotadas: string[];
};

export function useSessao(): Sessao {
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  const usuarios = useStore((e) => e.banco.usuarios);
  const participacoes = useStore((e) => e.banco.participacoes);
  const ativo = useEventoAtivo();
  const eventoId = ativo?.evento.id ?? null;
  const categorias = ativo?.categorias;
  const candidatos = ativo?.candidatos;

  return useMemo(() => {
    const usuario = usuarioId ? (usuarios.find((u) => u.id === usuarioId) ?? null) : null;
    const participacao =
      usuario && eventoId
        ? (participacoes.find((p) => p.usuarioId === usuario.id && p.eventoId === eventoId) ?? null)
        : null;
    const categoriasVotadas = participacao?.categoriasVotadas ?? [];
    let jaVotou = participacao?.votou ?? false;
    if (participacao?.papel === "PUBLICO" && categorias && categorias.length > 0 && candidatos) {
      const comItens = new Set(votaveis(candidatos).flatMap((c) => (c.categoriaId ? [c.categoriaId] : [])));
      const pendentes = categorias.filter((c) => comItens.has(c.id) && !categoriasVotadas.includes(c.id));
      jaVotou = comItens.size > 0 && pendentes.length === 0;
    }
    return {
      logado: usuario !== null,
      usuario,
      emailVerificado: Boolean(usuario?.emailVerificadoEm),
      participacao,
      papel: participacao?.papel ?? null,
      jaVotou,
      categoriasVotadas,
    };
  }, [usuarioId, usuarios, participacoes, eventoId, categorias, candidatos]);
}

/** Lista de usuários (só para o "Entrar como" da toolbar). Os gerados pelo volume (`usr-v-*`) ficam fora (Etapa 7). */
export function useUsuarios(): Usuario[] {
  const usuarios = useStore((e) => e.banco.usuarios);
  return useMemo(() => usuarios.filter((u) => !u.id.startsWith("usr-v-")), [usuarios]);
}
