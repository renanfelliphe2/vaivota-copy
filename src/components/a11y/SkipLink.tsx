/** Primeiro foco da página: pula para o <main id="conteudo">. Âncora #id pode usar <a>. */
export function SkipLink() {
  return (
    <a
      href="#conteudo"
      data-print="ocultar"
      className="sr-only z-50 rounded-full bg-tema-primaria px-5 py-3 font-semibold text-tema-sobre-primaria focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Pular para o conteúdo
    </a>
  );
}
