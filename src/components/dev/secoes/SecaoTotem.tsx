"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { EstadoDispositivo } from "@/dominio/tipos";
import { definirToolbarModo } from "@/store/acoes";
import { PIN_TOTEM_SEED, forcarEstadoDispositivo, parearTotem } from "@/store/acoesTotem";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useDispositivos, useUiTotem, useVotosInfantisPorDispositivo } from "@/store/seletores/totem";

// Totem (rev. 4, A7): faz o papel do pareamento (este aparelho = um totem do evento), força o estado do totem
// e abre o quiosque. Visual neutro (components/dev).

const CLASSE_SELECT = "w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100";
const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50";

const ESTADOS: [EstadoDispositivo, string][] = [
  ["ATIVO", "Ativo"],
  ["PAUSADO", "Pausado"],
  ["REVOGADO", "Revogado"],
];

export function SecaoTotem() {
  const ativo = useEventoAtivo();
  const caminho = usePathname();
  const { dispositivoId } = useUiTotem();
  const dispositivos = useDispositivos(ativo?.evento.id ?? "");
  const votos = useVotosInfantisPorDispositivo(ativo?.evento.id ?? "");
  if (!ativo) return <p className="text-[11px] text-zinc-400">Sem evento ativo.</p>;

  const { evento, slug } = ativo;
  const pareado = dispositivos.find((d) => d.id === dispositivoId) ?? null;
  const noTotem = caminho === `/e/${slug}/totem`;
  // Sem pareamento escolhido, "Abrir totem" pareia com o primeiro totem ativo do evento.
  const sugerido = pareado ?? dispositivos.find((d) => d.estado === "ATIVO") ?? dispositivos[0] ?? null;

  if (dispositivos.length === 0) {
    return <p className="text-[11px] text-zinc-400">Este evento não tem totens no seed (só o Festival tem).</p>;
  }

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <label className="flex flex-col gap-1">
        Este aparelho é o
        <select aria-label="Totem pareado" className={CLASSE_SELECT} value={pareado?.id ?? ""} onChange={(e) => parearTotem(e.target.value || null)}>
          <option value="">Não pareado</option>
          {dispositivos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome} · {d.estado.toLowerCase()} · {votos.get(d.id) ?? 0} votos
            </option>
          ))}
        </select>
      </label>

      {pareado && (
        <div role="group" aria-label={`Estado do ${pareado.nome}`} className="flex flex-wrap gap-1">
          {ESTADOS.map(([estado, texto]) => (
            <button
              key={estado}
              type="button"
              aria-pressed={pareado.estado === estado}
              onClick={() => forcarEstadoDispositivo(pareado.id, estado)}
              className={
                pareado.estado === estado
                  ? "rounded-md bg-amber-300 px-2 py-1 text-xs font-semibold text-zinc-950"
                  : "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
              }
            >
              {texto}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {noTotem ? (
          <span className="text-[11px] text-zinc-400">Você está no totem.</span>
        ) : (
          <Link
            href={`/e/${slug}/totem`}
            onClick={() => {
              if (!pareado && sugerido) parearTotem(sugerido.id);
            }}
            className={`${CLASSE_BOTAO} font-semibold text-amber-300`}
          >
            Abrir totem →
          </Link>
        )}
        {noTotem && (
          <button type="button" className={CLASSE_BOTAO} onClick={() => definirToolbarModo("AUTO")}>
            Esconder toolbar
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-400">
        PIN de saída: <span className="font-mono text-zinc-200">{PIN_TOTEM_SEED}</span> (Revogado não tem PIN).
        {!evento.moduloInfantil && " Módulo infantil desligado: o totem mostra o aviso."}
        {evento.estadoUrna !== "ABERTA" && " Urna fechada: abra em Urna para votar."}
        {" "}No totem, a toolbar some; Alt+D traz de volta.
      </p>
    </div>
  );
}
