"use client";

import { useEffect } from "react";
import { Botao } from "@/components/ui/Botao";

/** Etapa 9 (D4): erro de renderização. Sem detalhe técnico na tela (só no console). */
export default function ErroGlobal({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[erro]", error);
  }, [error]);

  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <h1 className="text-3xl font-bold">Algo deu errado</h1>
      <p className="text-tema-texto-suave">Não foi possível mostrar esta tela. Tente de novo; se continuar, volte ao início.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Botao onClick={() => retry()}>Tentar de novo</Botao>
        <Botao href="/" variante="contorno">
          Voltar ao início
        </Botao>
      </div>
    </main>
  );
}
