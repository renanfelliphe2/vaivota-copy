"use client";

import { useMemo, useSyncExternalStore } from "react";
import { comMeuVoto, lerMeusVotos, meusVotosNoEvento } from "@/dominio/meusVotos";

// "Em quem eu votei" no navegador de quem votou (24/11/2026; regras em src/dominio/meusVotos.ts). Nunca vai ao servidor: o voto
// popular é secreto e o servidor não sabe em quem a pessoa votou. Por conta (num aparelho compartilhado, cada pessoa vê só o
// dela) e por evento. Só aparece no aparelho em que a pessoa votou, e some se ela limpar os dados do navegador.

const CHAVE = "vaivota:meus-votos";
const AVISO = "vaivota:meus-votos-mudou";

function lerTexto(): string {
  try {
    return window.localStorage.getItem(CHAVE) ?? "";
  } catch {
    return ""; // armazenamento bloqueado (modo privado de alguns navegadores)
  }
}

/** Guarda o voto confirmado pelo servidor (nunca antes da confirmação). Falhar aqui não atrapalha o voto. */
export function guardarMeuVoto(voto: { usuarioId: string; eventoId: string; categoriaId: string | null; candidatoId: string }): void {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(comMeuVoto(lerMeusVotos(lerTexto()), voto)));
    window.dispatchEvent(new Event(AVISO));
  } catch {
    // sem armazenamento: o destaque só não aparece
  }
}

function assinar(aoMudar: () => void) {
  window.addEventListener(AVISO, aoMudar);
  window.addEventListener("storage", aoMudar); // outra aba do mesmo navegador
  return () => {
    window.removeEventListener(AVISO, aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

/**
 * Os votos desta pessoa neste evento, guardados neste navegador: categoria (ou VOTO_UNICO, sem categorias) → id do item.
 * No servidor e na primeira pintura, vazio (o servidor não sabe; assim a hidratação bate).
 */
export function useMeusVotos(usuarioId: string | null, eventoId: string | null): Record<string, string> {
  const texto = useSyncExternalStore(assinar, lerTexto, () => "");
  return useMemo(() => meusVotosNoEvento(lerMeusVotos(texto), usuarioId, eventoId), [texto, usuarioId, eventoId]);
}
