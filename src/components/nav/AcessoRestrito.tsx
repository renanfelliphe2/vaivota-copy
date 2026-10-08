"use client";

import { Lock } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { useSlugAtivo } from "@/store/seletores/evento";

/** PAPEL_INSUFICIENTE: nenhuma informação da tela protegida. */
export function AcessoRestrito({ comoMain }: { comoMain?: boolean }) {
  const slug = useSlugAtivo();
  const Raiz = comoMain ? "main" : "div";
  return (
    <Raiz
      id={comoMain ? "conteudo" : undefined}
      className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-6 py-20 text-center"
    >
      <Lock aria-hidden className="size-12 text-tema-texto-suave" />
      <h1 className="text-2xl font-bold">Acesso restrito</h1>
      <p className="text-tema-texto-suave">Sua conta não tem permissão para ver esta página neste evento.</p>
      <Botao href={`/e/${slug}`} variante="contorno">
        Voltar para o evento
      </Botao>
    </Raiz>
  );
}
