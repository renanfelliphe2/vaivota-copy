"use client";

import { useMemo } from "react";
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
  jaVotou: boolean;
};

export function useSessao(): Sessao {
  const usuarioId = useStore((e) => e.sessao.usuarioId);
  const usuarios = useStore((e) => e.banco.usuarios);
  const participacoes = useStore((e) => e.banco.participacoes);
  const eventoId = useEventoAtivo()?.evento.id ?? null;

  return useMemo(() => {
    const usuario = usuarioId ? (usuarios.find((u) => u.id === usuarioId) ?? null) : null;
    const participacao =
      usuario && eventoId
        ? (participacoes.find((p) => p.usuarioId === usuario.id && p.eventoId === eventoId) ?? null)
        : null;
    return {
      logado: usuario !== null,
      usuario,
      emailVerificado: Boolean(usuario?.emailVerificadoEm),
      participacao,
      papel: participacao?.papel ?? null,
      jaVotou: participacao?.votou ?? false,
    };
  }, [usuarioId, usuarios, participacoes, eventoId]);
}

/** Lista de usuários (só para o "Entrar como" da toolbar). Os gerados pelo volume (`usr-v-*`) ficam fora (Etapa 7). */
export function useUsuarios(): Usuario[] {
  const usuarios = useStore((e) => e.banco.usuarios);
  return useMemo(() => usuarios.filter((u) => !u.id.startsWith("usr-v-")), [usuarios]);
}
