"use client";

import { useState } from "react";
import { conferirApuracao } from "@/dominio/apuracaoAutoteste";
import { conferirFixturesFestival, conferirMotor, conferirRoteiro } from "@/dominio/apresentacao/autotestes";
import { verificarInvariantes } from "@/dominio/invariantes";
import type { ConfigApresentacao, EstadoApp } from "@/dominio/tipos";
import { definirToolbarModo } from "@/store/acoes";
import { limparApresentacao } from "@/store/acoesApresentacao";
import { obterAmbiente } from "@/store/ambiente";
import { useDev, useLerEstado } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";

// Etapa 8 (seção 5.12): só o que é novo (o simulador e o parcial ficam na seção Dashboard).

const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800";
/** O mesmo placeholder do seed do Festival. */
const LINK_VALIDO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ";
const LINK_INVALIDO = "https://exemplo.com/nao-e-video";

function alterarConfig(eventoId: string, mudanca: Partial<ConfigApresentacao>): void {
  obterAmbiente().store.atualizar((e: EstadoApp) => ({
    ...e,
    banco: { ...e.banco, configsApresentacao: e.banco.configsApresentacao.map((c) => (c.eventoId === eventoId ? { ...c, ...mudanca } : c)) },
  }));
}

function definirSimularTrailerFalha(ligado: boolean): void {
  obterAmbiente().store.atualizar((e) => ({ ...e, dev: { ...e.dev, simularTrailerFalha: ligado } }));
}

export function SecaoApresentacao() {
  const ativo = useEventoAtivo();
  const dev = useDev();
  const lerEstado = useLerEstado();
  const [mensagem, setMensagem] = useState<string | null>(null);
  if (!ativo) return <p className="text-[11px] text-zinc-400">Sem evento ativo.</p>;
  const eventoId = ativo.evento.id;
  const config = ativo.configApresentacao;
  const link = config.trailerUrl === null ? "AUSENTE" : config.trailerUrl === LINK_INVALIDO ? "INVALIDO" : "VALIDO";

  const conferir = () => {
    const grupos: [string, string[]][] = [
      ["Roteiro", conferirRoteiro()],
      ["Motor", conferirMotor()],
      ["Fixtures do Festival", conferirFixturesFestival()],
      ["Apuração", conferirApuracao()],
      ["Invariantes", verificarInvariantes(lerEstado())],
    ];
    setMensagem(grupos.map(([n, e]) => (e.length === 0 ? `${n}: ok` : `${n}: ${e.join(" | ")}`)).join("\n"));
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <label className="flex items-center gap-1">
        Toolbar no palco
        <select
          className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1"
          value={dev.toolbarModo === "FORCADA" ? "FORCADA" : "AUTO"}
          onChange={(e) => definirToolbarModo(e.target.value as "AUTO" | "FORCADA")}
        >
          <option value="AUTO">AUTO (some no palco)</option>
          <option value="FORCADA">FORCADA (sempre visível)</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        Link do trailer
        <select
          className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1"
          value={link}
          onChange={(e) =>
            alterarConfig(eventoId, { trailerUrl: e.target.value === "VALIDO" ? LINK_VALIDO : e.target.value === "INVALIDO" ? LINK_INVALIDO : null })
          }
        >
          <option value="VALIDO">Válido</option>
          <option value="INVALIDO">Inválido</option>
          <option value="AUSENTE">Ausente</option>
        </select>
      </label>
      {(
        [
          ["usarTrailerGerado", "Usar trailer gerado"],
          ["incluirCandidatosTrailer", "Incluir candidatos no trailer"],
          ["classificacaoCompleta", "Mostrar classificação completa"],
        ] as const
      ).map(([campo, rotulo]) => (
        <label key={campo} className="flex items-center gap-1">
          <input type="checkbox" checked={config[campo]} onChange={(e) => alterarConfig(eventoId, { [campo]: e.target.checked })} />
          {rotulo}
        </label>
      ))}
      <label className="flex items-center gap-1">
        Avanço padrão
        <select
          className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1"
          value={config.modoAvanco}
          onChange={(e) => alterarConfig(eventoId, { modoAvanco: e.target.value as ConfigApresentacao["modoAvanco"] })}
        >
          <option value="AUTOMATICO">Automático</option>
          <option value="MANUAL">Manual</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        Limiar da reta final
        <select
          className="rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1"
          value={config.limiarRetaFinalSegundos}
          onChange={(e) => alterarConfig(eventoId, { limiarRetaFinalSegundos: Number(e.target.value) })}
        >
          {[300, 120, 30].map((s) => (
            <option key={s} value={s}>
              {s} s
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={dev.simularTrailerFalha} onChange={(e) => definirSimularTrailerFalha(e.target.checked)} />
        Simular falha do trailer
      </label>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={CLASSE_BOTAO} onClick={() => limparApresentacao()}>
          Resetar apresentação
        </button>
        <button type="button" className={CLASSE_BOTAO} onClick={conferir}>
          Conferir roteiro e motor
        </button>
      </div>
      {mensagem && (
        <p role="status" className="whitespace-pre-wrap text-[11px] text-amber-200">
          {mensagem}
        </p>
      )}
    </div>
  );
}
