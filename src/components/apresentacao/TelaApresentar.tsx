"use client";

import { useToast } from "@/components/ui/Toast";
import { cenariosDoEnsaio } from "@/dominio/apresentacao/cenariosEnsaio";
import { usePreferenciasSala } from "@/store/seletores/apresentacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { abrirPalco, rotaPalco } from "./abrirPalco";
import { SalaControle } from "./SalaControle";

// Etapa 8: a sala de controle. 08/10/2026: "Apresentar" abre o palco na aba do telão (TelaPalco, em
// /admin/apresentar/palco), para o admin seguir operando nesta aba enquanto a outra fica em tela cheia no telão.

export function TelaApresentar() {
  const ativo = useEventoAtivo();
  const toast = useToast();
  const prefs = usePreferenciasSala(ativo?.evento.id ?? "");
  if (!ativo) return null;

  function apresentar() {
    const cenarios = cenariosDoEnsaio(ativo!.evento.id);
    const cenarioId = prefs.cenarioEnsaioId && cenarios.includes(prefs.cenarioEnsaioId) ? prefs.cenarioEnsaioId : cenarios[0];
    const href = rotaPalco(ativo!.slug, prefs.modoSala === "ENSAIO" ? { tipo: "ENSAIO", cenarioId } : { tipo: "REAL" });
    const r = abrirPalco(href);
    if (r === "BLOQUEADA") toast("O navegador bloqueou a nova aba. Permita pop-ups deste endereço e toque em Apresentar de novo.", "erro");
    else if (r === "FOCADA") toast("A apresentação já está aberta na aba do telão.", "informacao");
    else toast("Apresentação aberta em outra aba. Leve-a ao telão e clique nela para entrar em tela cheia.", "sucesso");
  }

  return (
    <main id="conteudo" className="flex-1">
      <SalaControle aoApresentar={apresentar} />
    </main>
  );
}
