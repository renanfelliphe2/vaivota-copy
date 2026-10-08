import type { Metadata } from "next";
import { Botao } from "@/components/ui/Botao";

export const metadata: Metadata = { title: "Página não encontrada · VaiVota" };

/** Etapa 9 (D4): 404 global. Herda o TemaEvento do layout raiz e não lê sessão. Slug inexistente é do GateEvento. */
export default function NaoEncontrada() {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <p className="text-6xl font-black text-tema-primaria-texto">404</p>
      <h1 className="text-3xl font-bold">Página não encontrada</h1>
      <p className="text-tema-texto-suave">O endereço pode ter sido digitado errado ou a página não existe mais.</p>
      <Botao href="/">Voltar ao início</Botao>
    </main>
  );
}
