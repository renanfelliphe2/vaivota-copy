import { MapPin, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { partesDoLocal } from "@/dominio/localEvento";
import { cx } from "@/lib/classes";

/**
 * Pílulas de informação do topo (estilo cinema): período, local e contagem. Antes repetidas no hero e na página da categoria.
 * 26/11/2026: a pílula pode ser um link (o local abre o mapa numa aba nova); `rotulo` é o nome acessível completo do link.
 */
export type InformacaoPilula = { icone: LucideIcon; texto: string; href?: string; rotulo?: string };

/** A pílula do local: só o nome do lugar, e o link do mapa com o endereço completo (o endereço por extenso fica no "Sobre"). */
export function pilulaDoLocal(local: string | null | undefined): InformacaoPilula | null {
  const p = partesDoLocal(local);
  if (!p) return null;
  return { icone: MapPin, texto: p.lugar, href: p.mapaUrl, rotulo: `${p.completo}: ver no mapa (abre em nova aba)` };
}

const PILULA ="inline-flex items-center gap-2 rounded-full bg-white/8 px-3.5 py-1.5 text-sm font-semibold text-white/90 ring-1 ring-white/15";

export function PilulasInformacao({ itens, className, style }: { itens: readonly InformacaoPilula[]; className?: string; style?: CSSProperties }) {
  if (itens.length === 0) return null;
  return (
    <ul className={cx("flex flex-wrap gap-2", className)} style={style}>
      {itens.map(({ icone: Icone, texto, href, rotulo }) => {
        const conteudo = (
          <>
            <Icone aria-hidden className="size-4 shrink-0 text-cine-secundaria-clara" />
            {texto}
          </>
        );
        return (
          <li key={texto} className="flex">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={rotulo}
                title={rotulo}
                className={cx(PILULA, "transition hover:bg-white/15 hover:text-white hover:ring-white/30")}
              >
                {conteudo}
              </a>
            ) : (
              <span className={PILULA}>{conteudo}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
