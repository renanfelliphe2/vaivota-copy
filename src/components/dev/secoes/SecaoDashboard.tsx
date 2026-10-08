"use client";

import { useState } from "react";
import { conferirApuracao } from "@/dominio/apuracaoAutoteste";
import { verificarInvariantes } from "@/dominio/invariantes";
import { adicionarVotosSimulados, alternarParcialAoVivo, definirSimularVotos } from "@/store/acoesDashboard";
import { useDev, useLerEstado } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useUrnaAberta } from "@/store/seletores/resultado";

// Etapa 7 (seção 5.12): simulador, votos em lote, parcial por candidato e autoteste da apuração.

const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50";
const LOTES = [10, 50, 200];

export function SecaoDashboard() {
  const ativo = useEventoAtivo();
  const dev = useDev();
  const lerEstado = useLerEstado();
  const urnaAberta = useUrnaAberta(ativo?.evento.id ?? "");
  const [mensagem, setMensagem] = useState<string | null>(null);
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
