"use client";

import { useState } from "react";
import { conferirApuracao } from "@/dominio/apuracaoAutoteste";
import { verificarInvariantes } from "@/dominio/invariantes";
import type { Grupo } from "@/dominio/tipos";
import { adicionarVotosSimulados, alternarParcialAoVivo, definirRitmoSimulador, definirSimularVotos } from "@/store/acoesDashboard";
import { useStore } from "@/store/AppProvider";
import { useDev, useLerEstado } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useUrnaAberta } from "@/store/seletores/resultado";
import { INTERVALOS_SIMULADOR_MS, MAX_VOTOS_POR_CICLO } from "@/store/simularVotos";

// Etapa 7 (seção 5.12): simulador, votos em lote, parcial por candidato e autoteste da apuração.
// 08/10/2026: o simulador escolhe os tipos de voto (público, júri, infantil) e o ritmo de cada um.

const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50";
const CLASSE_CAMPO = "rounded-md border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-100";
const LOTES = [10, 50, 200];
const GRUPOS: { grupo: Grupo; rotulo: string }[] = [
  { grupo: "POPULAR", rotulo: "Público" },
  { grupo: "JURI", rotulo: "Júri" },
  { grupo: "INFANTIL", rotulo: "Infantil" },
];

function rotuloIntervalo(ms: number): string {
  const s = ms / 1000;
  return s === 1 ? "1 segundo" : `${String(s).replace(".", ",")} segundos`;
}

export function SecaoDashboard() {
  const ativo = useEventoAtivo();
  const dev = useDev();
  const lerEstado = useLerEstado();
  const urnaAberta = useUrnaAberta(ativo?.evento.id ?? "");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const eventoAtivoId = ativo?.evento.id;
  const temTotemAtivo = useStore((e) => e.banco.dispositivos.some((d) => d.eventoId === eventoAtivoId && d.estado === "ATIVO"));
  if (!ativo) return <p className="text-[11px] text-zinc-400">Sem evento ativo.</p>;
  const eventoId = ativo.evento.id;

  const conferir = () => {
    const apuracao = conferirApuracao();
    const invariantes = verificarInvariantes(lerEstado());
    const linhas = [
      apuracao.length === 0 ? "Apuração: ok" : `Apuração: ${apuracao.join(" | ")}`,
      invariantes.length === 0 ? "Invariantes: ok" : `Invariantes: ${invariantes.join(" | ")}`,
    ];
    setMensagem(linhas.join("\n"));
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={dev.simularVotosEntrando} onChange={(e) => definirSimularVotos(e.target.checked)} />
        Simular votos entrando {urnaAberta ? "" : "(só com a urna aberta)"}
      </label>
      <div className="flex flex-col gap-1 pl-4">
        {GRUPOS.map(({ grupo, rotulo }) => {
          const ritmo = dev.simuladorVotos[grupo];
          const semModulo = (grupo === "JURI" && !ativo.evento.moduloJuri) || (grupo === "INFANTIL" && !ativo.evento.moduloInfantil);
          return (
            <div key={grupo} className="flex flex-wrap items-center gap-1">
              <label className="flex w-16 items-center gap-1">
                <input type="checkbox" checked={ritmo.ligado} onChange={(e) => definirRitmoSimulador(grupo, { ligado: e.target.checked })} />
                {rotulo}
              </label>
              <input
                type="number"
                aria-label={`Votos de ${rotulo.toLowerCase()} por vez`}
                min={1}
                max={MAX_VOTOS_POR_CICLO}
                value={ritmo.votos}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value));
                  if (Number.isFinite(n)) definirRitmoSimulador(grupo, { votos: Math.max(1, Math.min(MAX_VOTOS_POR_CICLO, n)) });
                }}
                className={`${CLASSE_CAMPO} w-12`}
              />
              <span className="text-zinc-400">{ritmo.votos === 1 ? "voto" : "votos"} a cada</span>
              <select
                aria-label={`Intervalo de ${rotulo.toLowerCase()}`}
                value={ritmo.intervaloMs}
                onChange={(e) => definirRitmoSimulador(grupo, { intervaloMs: Number(e.target.value) })}
                className={CLASSE_CAMPO}
              >
                {INTERVALOS_SIMULADOR_MS.map((ms) => (
                  <option key={ms} value={ms}>
                    {rotuloIntervalo(ms)}
                  </option>
                ))}
              </select>
              {semModulo && <span className="text-[11px] text-zinc-500">(módulo desligado)</span>}
            </div>
          );
        })}
        {dev.simuladorVotos.INFANTIL.ligado && ativo.evento.moduloInfantil && !temTotemAtivo && (
          <p className="text-[11px] text-zinc-500">Infantil: nenhum totem ativo no evento.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-zinc-400">Adicionar votos agora:</span>
        {LOTES.map((n) => (
          <button
            key={n}
            type="button"
            className={CLASSE_BOTAO}
            disabled={!urnaAberta}
            onClick={() => setMensagem(adicionarVotosSimulados(eventoId, n) ? `+${n} votos` : "Urna não está aberta")}
          >
            +{n}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={ativo.configApresentacao.parcialAoVivo} onChange={() => alternarParcialAoVivo(eventoId)} />
        Mostrar parcial por candidato
      </label>
      <button type="button" className={`${CLASSE_BOTAO} self-start`} onClick={conferir}>
        Conferir apuração
      </button>
      {mensagem && (
        <p role="status" className="whitespace-pre-wrap text-[11px] text-amber-200">
          {mensagem}
        </p>
      )}
    </div>
  );
}
