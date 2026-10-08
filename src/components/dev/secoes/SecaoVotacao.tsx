"use client";

import { useState } from "react";
import { MODOS_VOTO_JURI, ROTULO_MODO_JURI } from "@/dominio/avaliacaoJuri";
import { definirModoVotoJuri } from "@/store/acoes";
import { resetarMeuVoto } from "@/store/acoesVotacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { votarJuri, votarPopular } from "@/servicos/votacao";

// Etapa 5 (D15): só o que é novo. "Resetar meu voto" e "Enviar direto" (chama o serviço sem a tela).
// 08/10/2026: "Modo do júri" troca a forma de votação do júri para a demonstração (ignora a trava da urna aberta).
// Visual neutro (components/dev). O resultado aparece na própria seção (a toolbar fica fora do Toast).

const CLASSE_SELECT = "w-full rounded-md border border-zinc-600 bg-zinc-900 px-2 py-1 text-xs text-zinc-100";
const CLASSE_BOTAO = "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800 disabled:opacity-50";

export function SecaoVotacao() {
  const ativo = useEventoAtivo();
  const [servico, setServico] = useState<"POPULAR" | "JURI">("POPULAR");
  const [candidatoId, setCandidatoId] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!ativo) return <p className="text-[11px] text-zinc-400">Sem evento ativo.</p>;
  const eventoId = ativo.evento.id;
  const alvo = candidatoId || ativo.candidatos[0]?.id || "";

  async function enviarDireto() {
    if (!alvo) return;
    setEnviando(true);
    setMensagem(null);
    const r = servico === "POPULAR" ? await votarPopular({ eventoId, candidatoId: alvo }) : await votarJuri({ eventoId, candidatoId: alvo });
    setEnviando(false);
    setMensagem(r.ok ? `ok: ${r.dados.resultado}` : `erro: ${r.erro.codigo}`);
  }

  const modoJuri = ativo.configPlacar.modoVotoJuri;

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {ativo.evento.moduloJuri && (
        <div className="flex flex-col gap-1">
          <span className="text-zinc-300">Modo do júri</span>
          <div role="group" aria-label="Modo do júri" className="flex flex-wrap gap-1">
            {MODOS_VOTO_JURI.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={modoJuri === m}
                onClick={() => {
                  definirModoVotoJuri(eventoId, m);
                  setMensagem(`Júri: ${ROTULO_MODO_JURI[m].toLowerCase()}`);
                }}
                className={
                  modoJuri === m
                    ? "rounded-md bg-amber-300 px-2 py-1 text-xs font-semibold text-zinc-950"
                    : "rounded-md border border-zinc-600 px-2 py-1 text-xs hover:bg-zinc-800"
                }
              >
                {ROTULO_MODO_JURI[m]}
              </button>
            ))}
          </div>
          {modoJuri !== "VOTO_UNICO" && (
            <p className="text-[11px] text-zinc-400">Critérios: {ativo.criteriosJuri.map((c) => c.nome).join(", ")}. Edite em Configuração › Júri.</p>
          )}
        </div>
      )}
      <button type="button" className={`${CLASSE_BOTAO} self-start`} onClick={() => setMensagem(resetarMeuVoto(eventoId))}>
        Resetar meu voto
      </button>
      <div className="flex gap-1">
        <select aria-label="Serviço" className={CLASSE_SELECT} value={servico} onChange={(e) => setServico(e.target.value as "POPULAR" | "JURI")}>
          <option value="POPULAR">votarPopular</option>
          <option value="JURI">votarJuri</option>
        </select>
        <select aria-label="Candidato" className={CLASSE_SELECT} value={alvo} onChange={(e) => setCandidatoId(e.target.value)}>
          {ativo.candidatos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id}
              {!c.publicado ? " (rascunho)" : c.desqualificado ? " (desqualificado)" : ""}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className={`${CLASSE_BOTAO} self-start`} disabled={enviando || !alvo} onClick={() => void enviarDireto()}>
        {enviando ? "Enviando…" : "Enviar direto (teste do serviço)"}
      </button>
      {mensagem && (
        <p role="status" className="text-[11px] text-amber-200">
          {mensagem}
        </p>
      )}
    </div>
  );
}
