"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/classes";

/**
 * Menu das seções da landing para telas menores que o desktop (lá os links ficam no cabeçalho). Fecha com Esc, com um
 * toque fora ou ao escolher uma seção; com Esc, o foco volta ao botão.
 */
export function MenuDaPagina({ links }: { links: [string, string][] }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(false);
      botao.current?.focus();
    };
    const aoTocarFora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoTocarFora);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoTocarFora);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative lg:hidden">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
        className={cx(
          "inline-flex size-11 items-center justify-center rounded-full transition",
          aberto ? "bg-tema-texto text-tema-fundo" : "ring-1 ring-tema-borda hover:bg-tema-superficie",
        )}
      >
        {aberto ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        <span className="sr-only">{aberto ? "Fechar o menu" : "Abrir o menu"}</span>
      </button>
      <nav
        id={id}
        aria-label="Seções da página"
        hidden={!aberto}
        className="absolute right-0 top-full z-40 mt-2 w-64 rounded-3xl bg-tema-fundo p-2 shadow-2xl shadow-black/20 ring-1 ring-tema-borda"
      >
        <ul className="flex flex-col">
          {links.map(([href, rotulo]) => (
            <li key={href}>
              <a
                href={href}
                onClick={() => setAberto(false)}
                className="flex min-h-12 items-center rounded-2xl px-4 font-semibold transition hover:bg-tema-superficie"
              >
                {rotulo}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
