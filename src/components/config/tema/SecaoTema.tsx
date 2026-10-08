"use client";

import type { Travas } from "@/dominio/travas";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BannerTrava } from "../BannerTrava";
import { TemaForm } from "./TemaForm";

/** Seção Tema (Etapa 6, CP7): livre mesmo com a urna aberta; leitura só no evento concluído. */
export function SecaoTema({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  if (!ativo) return null;
  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Tema
      </h2>
      <BannerTrava travas={travas} acoes={["TEMA"]} />
      <TemaForm key={ativo.tema.atualizadoEm} evento={ativo.evento} tema={ativo.tema} travas={travas} />
    </section>
  );
}
