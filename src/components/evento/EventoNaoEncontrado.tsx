import { SearchX } from "lucide-react";
import { Botao } from "@/components/ui/Botao";

/** Slug inválido (D14): tela neutra, resolvida no cliente pelo GateEvento. */
export function EventoNaoEncontrado({ slug }: { slug: string }) {
  return (
    <main id="conteudo" className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 px-6 py-20 text-center">
      <SearchX aria-hidden className="size-12 text-tema-texto-suave" />
      <h1 className="text-2xl font-bold">Evento não encontrado</h1>
      <p className="text-tema-texto-suave">
        Não existe evento com o endereço <strong className="break-all text-tema-texto">{slug}</strong>. Confira o link ou o
        QR Code que você recebeu.
      </p>
      <Botao href="/" variante="contorno">
        Ir para a página inicial
      </Botao>
    </main>
  );
}
