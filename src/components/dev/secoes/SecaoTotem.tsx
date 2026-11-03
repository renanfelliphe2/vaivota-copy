"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { definirToolbarModo } from "@/store/acoes";
import { useEventoAtivo } from "@/store/seletores/evento";

// Totem (rev. 4, A7): atalhos para o quiosque e o pareamento. O pareamento, o estado dos aparelhos e o PIN são reais (servidor):
// o admin gera o código em Configuração > Totens e o tablet o digita na página de pareamento. Visual neutro (components/dev).

const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50";

export function SecaoTotem() {
  const ativo = useEventoAtivo();
  const caminho = usePathname();
  if (!ativo) return <p className="text-[11px] text-zinc-400">Sem evento ativo.</p>;

  const { evento, slug } = ativo;
  const noTotem = caminho === `/e/${slug}/totem`;

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-1">
        {noTotem ? (
          <span className="text-[11px] text-zinc-400">Você está no totem.</span>
        ) : (
          <Link href={`/e/${slug}/totem`} className={`${CLASSE_BOTAO} font-semibold text-amber-300`}>
            Abrir totem →
          </Link>
        )}
        <Link href={`/e/${slug}/totem/parear`} className={CLASSE_BOTAO}>
          Parear este aparelho
        </Link>
        {noTotem && (
          <button type="button" className={CLASSE_BOTAO} onClick={() => definirToolbarModo("AUTO")}>
            Esconder toolbar
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-400">
        O código de pareamento (e o nome e o PIN do totem) se gera em Configuração &gt; Totens.
        {!evento.moduloInfantil && " Módulo infantil desligado: ligue-o em Totens."}
        {evento.estadoUrna !== "ABERTA" && " Urna fechada: abra em Urna para votar."}
        {" "}No totem, a toolbar some; Alt+D traz de volta.
      </p>
    </div>
  );
}
