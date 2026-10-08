"use client";

import { minusculas } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";

export function ComoFunciona() {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  const rotulos = minusculas(ativo.tema.rotuloCandidatos);
  const passos = [
    { titulo: "Conheça", texto: `Veja os ${rotulos} em votação neste evento.`, barra: "bg-tema-secundaria" },
    {
      titulo: "Vote",
      texto: "Crie sua conta, escolha seu favorito e confirme. Cada pessoa vota uma vez.",
      barra: "bg-tema-primaria",
    },
    { titulo: "Acompanhe", texto: "O resultado é divulgado pela organização do evento.", barra: "bg-tema-secundaria" },
  ];

  return (
    <section aria-labelledby="como-funciona" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <h2 id="como-funciona" className="text-center text-2xl font-bold sm:text-3xl">
        Como funciona
      </h2>
      <ol className="mt-12 grid gap-8 sm:grid-cols-3">
        {passos.map((p) => (
          <li key={p.titulo} className="text-center">
            <div aria-hidden className={`mx-auto mb-4 h-2 w-12 rounded-full ${p.barra}`} />
            <h3 className="text-lg font-semibold">{p.titulo}</h3>
            <p className="mt-2 text-tema-texto-suave">{p.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
