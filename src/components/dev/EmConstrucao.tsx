"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { ROTULO_ESTADO_EVENTO, ROTULO_ESTADO_URNA, ROTULO_PAPEL } from "@/lib/rotulos";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useSessao } from "@/store/seletores/sessao";

export type EmConstrucaoProps = {
  titulo: string;
  rota: string;
  /** Etapa responsável pela tela real. */
  etapa: string;
};

/** Rota stub: mostra rota, etapa responsável e o resumo do estado, com links entre as stubs. */
export function EmConstrucao({ titulo, rota, etapa }: EmConstrucaoProps) {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const slug = ativo?.slug ?? "";
  const links = [
    { href: `/e/${slug}`, rotulo: "Entrada" },
    { href: `/e/${slug}/votar`, rotulo: "Votar" },
    { href: `/e/${slug}/convite`, rotulo: "Convite" },
    { href: `/e/${slug}/admin`, rotulo: "Dashboard" },
    { href: `/e/${slug}/admin/configuracao`, rotulo: "Configuração" },
    { href: `/e/${slug}/admin/relatorio`, rotulo: "Relatório" },
    { href: `/e/${slug}/admin/apresentar`, rotulo: "Apresentação" },
  ];

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Construction aria-hidden className="size-8 text-tema-primaria-texto" />
        <h1 className="text-2xl font-bold">{titulo}</h1>
      </div>
      <p className="text-tema-texto-suave">
        Tela em construção. Rota <code className="rounded bg-tema-superficie px-1.5 py-0.5 text-tema-texto">{rota}</code> ·
        responsável: <strong className="text-tema-texto">{etapa}</strong>.
      </p>
      {ativo && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl border border-tema-borda bg-tema-superficie p-4 text-sm">
          <dt className="text-tema-texto-suave">Evento</dt>
          <dd>
            {ativo.evento.nome} ({ROTULO_ESTADO_EVENTO[ativo.evento.estado]})
          </dd>
          <dt className="text-tema-texto-suave">Urna</dt>
          <dd>{ROTULO_ESTADO_URNA[ativo.evento.estadoUrna]}</dd>
          <dt className="text-tema-texto-suave">Sessão</dt>
          <dd>{sessao.usuario ? `${sessao.usuario.nome}${sessao.emailVerificado ? "" : " (e-mail não verificado)"}` : "Visitante"}</dd>
          <dt className="text-tema-texto-suave">Papel</dt>
          <dd>{sessao.papel ? ROTULO_PAPEL[sessao.papel] : "—"}</dd>
        </dl>
      )}
      <nav aria-label="Telas do protótipo">
        <ul className="flex flex-wrap gap-2 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center rounded-full border border-tema-borda px-4 hover:bg-tema-superficie">
                {l.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
