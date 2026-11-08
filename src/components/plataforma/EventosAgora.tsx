"use client";

import { ArrowRight, CalendarClock, Flag, MapPin, Palette, Radio, Trophy, Vote, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { classesBotao } from "@/components/ui/Botao";
import { Selo, type VarianteSelo } from "@/components/ui/Selo";
import type { Evento, Tema } from "@/dominio/tipos";
import { statusNaVitrine, type StatusVitrine } from "@/dominio/vitrineEventos";
import { useEventos, useTemas } from "@/store/seletores/evento";
import { MarcaDoEvento } from "./MarcaDoEvento";
import { TituloDeSecao } from "./TituloDeSecao";

// O que a landing mostra dos eventos em andamento. Lê o estado público que o layout raiz já entregou (e que o polling
// renova): nenhuma consulta própria. Só eventos ATIVOS com a urna aberta ou ainda por abrir: quem chega para votar não
// cai numa votação encerrada. As que já fecharam ficam na vitrine "A cara do seu evento" (e, concluídas, nos resultados).

type EventoNoAr = { evento: Evento; tema: Tema | null; nome: string; status: StatusVitrine };

const SELO_DO_STATUS: Record<StatusVitrine["tom"], { variante: VarianteSelo; icone: LucideIcon }> = {
  aberta: { variante: "sucesso", icone: Radio },
  breve: { variante: "info", icone: CalendarClock },
  encerrada: { variante: "neutro", icone: Flag },
};

/** Votação aberta primeiro, depois a que ainda vai abrir. */
function useEventosNoAr(): EventoNoAr[] {
  const eventos = useEventos();
  const temas = useTemas();
  return useMemo(
    () =>
      eventos
        .filter((e) => e.estado === "ATIVO" && e.estadoUrna !== "ENCERRADA")
        .map((evento) => {
          const tema = temas.find((t) => t.eventoId === evento.id) ?? null;
          return { evento, tema, nome: tema?.nomeExibicao?.trim() || evento.nome, status: statusNaVitrine(evento) };
        })
        .sort((a, b) => a.status.prioridade - b.status.prioridade || a.nome.localeCompare(b.nome, "pt-BR")),
    [eventos, temas],
  );
}

/** Botão do cabeçalho: só existe com algum evento no ar. */
export function AtalhoDoTopo() {
  const noAr = useEventosNoAr();
  if (noAr.length === 0) return null;
  const aberta = noAr.some((e) => e.status.tom === "aberta");
  return (
    <a href="#eventos" className={classesBotao({ variante: "primaria", tamanho: "pequeno" })}>
      {aberta ? "Votar agora" : "Eventos"}
    </a>
  );
}

type Acao = { href: string; rotulo: string; icone?: LucideIcon };

/**
 * Botões da abertura: o que a pessoa mais provavelmente veio fazer vem primeiro (votar, ver o resultado). Sem votação no
 * ar, o destaque é a identidade: "A cara do seu evento".
 */
export function AcoesDaAbertura({ comResultados }: { comResultados: boolean }) {
  const noAr = useEventosNoAr();
  const acoes: Acao[] = [];
  if (noAr.some((e) => e.status.tom === "aberta")) acoes.push({ href: "#eventos", rotulo: "Votar agora", icone: Vote });
  if (comResultados) acoes.push({ href: "#resultados", rotulo: "Ver resultados", icone: Trophy });
  if (noAr.length > 0) acoes.push({ href: "#eventos", rotulo: "Ver eventos" });
  acoes.push({ href: "#identidade", rotulo: "A cara do seu evento", icone: Palette });
  acoes.push({ href: "#como-funciona", rotulo: "Como funciona" });
  const [principal, segunda] = acoes.filter((a, i) => acoes.findIndex((b) => b.href === a.href) === i);
  const Icone = principal.icone;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={principal.href}
        className={classesBotao({ variante: "primaria", tamanho: "grande", className: "shadow-lg shadow-tema-primaria/25 hover:-translate-y-0.5" })}
      >
        {Icone && <Icone aria-hidden className="size-5" />}
        {principal.rotulo}
      </a>
      {segunda && (
        <a href={segunda.href} className={classesBotao({ variante: "contorno", tamanho: "grande", className: "bg-tema-fundo/70" })}>
          {segunda.rotulo}
        </a>
      )}
    </div>
  );
}

export function EventosAgora() {
  const noAr = useEventosNoAr();
  if (noAr.length === 0) return null;

  return (
    <section id="eventos" aria-labelledby="titulo-eventos" className="w-full bg-tema-fundo">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <TituloDeSecao
          id="titulo-eventos"
          rotulo="Eventos"
          titulo="Veio votar? Entre no seu evento."
          texto="Cada evento tem a sua página, com a identidade e as regras de quem organiza."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {noAr.map((item) => (
            <li key={item.evento.id} className="vv-surgir">
              <CartaoEventoNoAr item={item} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CartaoEventoNoAr({ item }: { item: EventoNoAr }) {
  const { evento, tema, nome, status } = item;
  const selo = SELO_DO_STATUS[status.tom];
  return (
    <Link
      href={`/e/${evento.slug}`}
      className="group flex h-full items-center gap-4 rounded-3xl bg-tema-fundo p-4 ring-1 ring-tema-borda transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-tema-primaria/10 hover:ring-vv-destaque sm:p-5"
    >
      <MarcaDoEvento nome={nome} corPrimaria={tema?.corPrimaria ?? null} logoUrl={tema?.logoUrl ?? null} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <Selo variante={selo.variante} icone={selo.icone} pulsar={status.tom === "aberta"}>
          {status.rotulo}
        </Selo>
        <span className="text-lg font-bold leading-tight">{nome}</span>
        {evento.local && (
          <span className="flex items-center gap-1.5 text-sm text-tema-texto-suave">
            <MapPin aria-hidden className="size-4 shrink-0" />
            {evento.local}
          </span>
        )}
      </span>
      <ArrowRight aria-hidden className="size-5 shrink-0 text-tema-texto-suave transition group-hover:translate-x-1 group-hover:text-tema-texto" />
    </Link>
  );
}
