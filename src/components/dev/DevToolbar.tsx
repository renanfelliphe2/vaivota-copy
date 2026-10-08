"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { EstadoDev, EstadoEvento, EstadoUrna, ModoFalha } from "@/dominio/tipos";
import { paraMs, formatarDataHora, HORA, MINUTO, SEGUNDO } from "@/lib/tempo";
import { ROTULO_PAPEL } from "@/lib/rotulos";
import {
  alternarEmailVerificado,
  alternarModulo,
  aplicarCenario,
  definirErroRede,
  definirFalhaProxima,
  definirLatencia,
  definirSlugPadrao,
  definirToolbarModo,
  definirToolbarRecolhida,
  forcarEstadoEvento,
  forcarEstadoUrna,
  forcarSessao,
  listarCenarios,
  resetarMock,
} from "@/store/acoes";
import { useDev, useUi } from "@/store/seletores/dev";
import { useEventoAtivo, useEventos } from "@/store/seletores/evento";
import { useAgora, useRelogio, useRelogioPausado } from "@/store/seletores/relogio";
import { useSessao, useUsuarios } from "@/store/seletores/sessao";
import { InspetorEstado } from "./InspetorEstado";
import { SECOES_TOOLBAR } from "./secoes";

// Visual neutro, fora do TemaEvento (D17). Cores fixas permitidas em components/dev/.

const HABILITADA = process.env.NEXT_PUBLIC_DEV_TOOLBAR !== "false";

const ESTADOS_EVENTO: [EstadoEvento, string][] = [
  ["RASCUNHO", "Rascunho"],
  ["ATIVO", "Ativo"],
  ["CONCLUIDO", "Concluído"],
];
const ESTADOS_URNA: [EstadoUrna, string][] = [
  ["NAO_INICIADA", "Não iniciada"],
  ["ABERTA", "Aberta"],
  ["ENCERRADA", "Encerrada"],
];
const MODOS_FALHA: [ModoFalha, string][] = [
  ["NENHUMA", "Nenhuma"],
  ["REDE_NAO_GRAVOU", "Rede (não gravou)"],
  ["REDE_GRAVOU", "Rede (gravou)"],
  ["URNA_ENCERRA", "Urna encerra"],
  ["JA_VOTOU_OUTRA_SESSAO", "Já votou em outra sessão"],
  ["ERRO_INTERNO", "Erro interno"],
];
const LATENCIAS: EstadoDev["latenciaMs"][] = [0, 400, 1500];

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5 border-t border-zinc-700 pt-2">
      <legend className="pr-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Opcoes<T extends string | number>({
  opcoes,
  valor,
  aoEscolher,
  rotulo,
}: {
  opcoes: [T, string][];
  valor: T | null;
  aoEscolher: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1">
      {opcoes.map(([v, texto]) => (
        <button
          key={String(v)}
          type="button"
          aria-pressed={valor === v}
          onClick={() => aoEscolher(v)}
          className={
            valor === v
              ? "rounded-md bg-amber-300 px-2 py-1 text-xs font-semibold text-zinc-950"
              : "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
          }
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

const CLASSE_SELECT = "w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100";
const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800";

export function DevToolbar() {
  if (!HABILITADA) return null;
  return <DevToolbarInterna />;
}

function DevToolbarInterna() {
  const dev = useDev();
  const ui = useUi();

  // ?toolbar=0 grava OCULTA. Alt+D alterna: visível → OCULTA; oculta → FORCADA.
  const visivel = dev.toolbarModo === "FORCADA" || (dev.toolbarModo === "AUTO" && !ui.palcoAtivo);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("toolbar") === "0") definirToolbarModo("OCULTA");
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!e.altKey || e.key.toLowerCase() !== "d") return;
      e.preventDefault();
      definirToolbarModo(visivel ? "OCULTA" : "FORCADA");
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [visivel]);

  if (!visivel) return null;

  if (dev.toolbarRecolhida) {
    return (
      <div data-print="ocultar" className="fixed bottom-3 right-3 z-50 font-sans">
        <button
          type="button"
          onClick={() => definirToolbarRecolhida(false)}
          aria-expanded={false}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-amber-300 shadow-lg ring-1 ring-zinc-700 hover:bg-zinc-800"
        >
          Dev ▲
        </button>
      </div>
    );
  }

  return (
    <aside
      data-print="ocultar"
      aria-label="Dev toolbar"
      className="fixed inset-x-2 bottom-2 z-50 flex max-h-[80dvh] flex-col rounded-xl bg-zinc-900 font-sans text-zinc-100 shadow-2xl ring-1 ring-zinc-700 sm:inset-x-auto sm:right-3 sm:w-96"
    >
      <div className="flex items-center justify-between border-b border-zinc-700 px-3 py-2">
        <p className="text-xs font-bold text-amber-300">Dev toolbar · protótipo</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => definirToolbarModo("OCULTA")} className={CLASSE_BOTAO} title="Alt+D mostra de novo">
            Ocultar
          </button>
          <button type="button" onClick={() => definirToolbarRecolhida(true)} aria-expanded className={CLASSE_BOTAO}>
            Recolher ▼
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto px-3 pb-3 pt-1">
        <Controles />
        {SECOES_TOOLBAR.map(({ id, titulo, Componente }) => (
          <Secao key={id} titulo={titulo}>
            <Componente />
          </Secao>
        ))}
        <Secao titulo="Inspetor">
          <InspetorEstado />
        </Secao>
      </div>
    </aside>
  );
}

function Controles() {
  const dev = useDev();
  const eventos = useEventos();
  const ativo = useEventoAtivo();
  const params = useParams<{ slug?: string }>();
  const sessao = useSessao();
  const usuarios = useUsuarios();
  const agora = useAgora();
  const pausado = useRelogioPausado();
  const relogio = useRelogio();
  const cenarios = listarCenarios();
  const [cenarioId, setCenarioId] = useState(cenarios[0]?.id ?? "");
  const [avisoModulo, setAvisoModulo] = useState<string | null>(null);

  const naRota = typeof params?.slug === "string";
  const evento = ativo?.evento;
  const fuso = evento?.fusoHorario;

  const retaFinal = () => {
    if (!evento?.janelaFim || !ativo) return;
    const restanteS = Math.max(30, ativo.configApresentacao.limiarRetaFinalSegundos - 60);
    relogio.irPara(paraMs(evento.janelaFim) - restanteS * SEGUNDO);
  };

  return (
    <>
      <Secao titulo="Evento">
        <select
          aria-label="Evento padrão"
          className={CLASSE_SELECT}
          value={dev.slugPadrao}
          onChange={(e) => definirSlugPadrao(e.target.value)}
        >
          {eventos.map((e) => (
            <option key={e.id} value={e.slug}>
              {e.nome}
            </option>
          ))}
        </select>
        {naRota ? (
          <p className="text-[11px] text-zinc-400">
            Nesta rota vale o evento da URL ({ativo?.slug}).{" "}
            {dev.slugPadrao !== ativo?.slug && (
              <Link href={`/e/${dev.slugPadrao}`} className="underline">
                Ir para /e/{dev.slugPadrao}
              </Link>
            )}
          </p>
        ) : (
          <Link href={`/e/${dev.slugPadrao}`} className="text-[11px] text-zinc-300 underline">
            Abrir /e/{dev.slugPadrao}
          </Link>
        )}
      </Secao>

      {evento && (
        <>
          <Secao titulo="Estado do evento">
            <Opcoes rotulo="Estado do evento" opcoes={ESTADOS_EVENTO} valor={evento.estado} aoEscolher={(v) => forcarEstadoEvento(evento.id, v)} />
          </Secao>
          <Secao titulo="Urna">
            <Opcoes rotulo="Estado da urna" opcoes={ESTADOS_URNA} valor={evento.estadoUrna} aoEscolher={(v) => forcarEstadoUrna(evento.id, v)} />
          </Secao>
        </>
      )}

      <Secao titulo="Sessão">
        <select
          aria-label="Entrar como"
          className={CLASSE_SELECT}
          value={sessao.usuario?.id ?? ""}
          onChange={(e) => forcarSessao(e.target.value || null)}
        >
          <option value="">Deslogado (visitante)</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nome} · {u.email}
            </option>
          ))}
        </select>
        {sessao.usuario && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
            <span>Papel aqui: {sessao.papel ? ROTULO_PAPEL[sessao.papel] : "sem participação"}</span>
            {sessao.jaVotou && <span>· já votou</span>}
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={sessao.emailVerificado} onChange={() => alternarEmailVerificado()} />
              E-mail verificado
            </label>
          </div>
        )}
      </Secao>

      {evento && ativo && (
        <Secao titulo="Módulos e pesos">
          <div className="flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={evento.moduloJuri} onChange={() => setAvisoModulo(alternarModulo(evento.id, "JURI"))} />
              Júri
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={evento.moduloInfantil} onChange={() => setAvisoModulo(alternarModulo(evento.id, "INFANTIL"))} />
              Infantil
            </label>
            <span className="text-zinc-400">
              {ativo.configPlacar.pesoPopular}/{ativo.configPlacar.pesoJuri}/{ativo.configPlacar.pesoInfantil}
            </span>
          </div>
          {avisoModulo && (
            <p role="status" className="text-[11px] text-amber-200">
              {avisoModulo}
            </p>
          )}
        </Secao>
      )}

      <Secao titulo="Relógio">
        <p className="text-xs tabular-nums text-zinc-300">
          {formatarDataHora(agora, fuso)}:{String(Math.floor((agora / SEGUNDO) % 60)).padStart(2, "0")}
          {pausado && " · pausado"}
        </p>
        <div className="flex flex-wrap gap-1">
          <button type="button" className={CLASSE_BOTAO} onClick={() => relogio.avancar(15 * MINUTO)}>
            +15 min
          </button>
          <button type="button" className={CLASSE_BOTAO} onClick={() => relogio.avancar(HORA)}>
            +1 h
          </button>
          <button type="button" className={CLASSE_BOTAO} onClick={retaFinal} disabled={!evento?.janelaFim}>
            Reta final
          </button>
          <button
            type="button"
            className={CLASSE_BOTAO}
            onClick={() => evento?.janelaFim && relogio.irPara(paraMs(evento.janelaFim))}
            disabled={!evento?.janelaFim}
          >
            Fim da janela
          </button>
          <button type="button" className={CLASSE_BOTAO} onClick={() => (pausado ? relogio.retomar() : relogio.pausar())}>
            {pausado ? "Retomar" : "Pausar"}
          </button>
          <button type="button" className={CLASSE_BOTAO} onClick={() => relogio.reiniciar()}>
            Voltar a T0
          </button>
        </div>
      </Secao>

      <Secao titulo="Rede e falhas">
        <Opcoes
          rotulo="Latência"
          opcoes={LATENCIAS.map((l) => [l, `${l} ms`] as [EstadoDev["latenciaMs"], string])}
          valor={dev.latenciaMs}
          aoEscolher={definirLatencia}
        />
        <label className="flex items-center gap-1 text-xs">
          <input type="checkbox" checked={dev.simularErroRede} onChange={(e) => definirErroRede(e.target.checked)} />
          Erro de rede (persistente)
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Falha no próximo envio
          <select
            className={CLASSE_SELECT}
            value={dev.falhaProxima}
            onChange={(e) => definirFalhaProxima(e.target.value as ModoFalha)}
          >
            {MODOS_FALHA.map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </Secao>

      <Secao titulo="Cenários">
        <div className="flex gap-1">
          <select aria-label="Cenário" className={CLASSE_SELECT} value={cenarioId} onChange={(e) => setCenarioId(e.target.value)}>
            {cenarios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button type="button" className={CLASSE_BOTAO} onClick={() => evento && aplicarCenario(cenarioId, evento.id)}>
            Aplicar
          </button>
        </div>
        <p className="text-[11px] text-zinc-400">{cenarios.find((c) => c.id === cenarioId)?.descricao}</p>
        <button
          type="button"
          onClick={() => resetarMock()}
          className="self-start rounded-md bg-red-900 px-2 py-1 text-xs font-semibold text-red-100 hover:bg-red-800"
        >
          Resetar mock
        </button>
      </Secao>
    </>
  );
}
