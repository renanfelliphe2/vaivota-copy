"use client";

import { CircleCheck, Clock } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { useToast } from "@/components/ui/Toast";
import type { OperacaoDados } from "@/dominio/painel";
import { TituloBloco } from "./KpiCard";

// Etapa 7 (5.5, D8, C18): quem votou, sem escolha e sem número de alterações. Rótulo do convite por
// padrão; "Mostrar nomes" é estado local (volta a ocultar ao sair da tela).

export function JuradosCard({ dados }: { dados: OperacaoDados }) {
  const [mostrarNomes, setMostrarNomes] = useState(false);
  const [textoManual, setTextoManual] = useState<string | null>(null);
  const toast = useToast();
  const { jurados } = dados;
  const votaram = jurados.filter((j) => j.votou).length;
  const pendentes = jurados.filter((j) => !j.votou);

  async function copiarPendentes() {
    const texto = pendentes.map((j) => j.nome).join("\n");
    try {
      if (!navigator.clipboard) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(texto);
      setTextoManual(null);
      toast(`${pendentes.length} nomes copiados`, "sucesso");
    } catch {
      setTextoManual(texto);
    }
  }

  return (
    <Cartao className="flex flex-col gap-4">
      <TituloBloco
        acao={
          <div className="flex flex-wrap gap-2">
            <Botao variante="contorno" tamanho="pequeno" aria-pressed={mostrarNomes} onClick={() => setMostrarNomes((v) => !v)}>
              {mostrarNomes ? "Ocultar nomes" : "Mostrar nomes"}
            </Botao>
            <Botao variante="contorno" tamanho="pequeno" disabled={pendentes.length === 0} onClick={() => void copiarPendentes()}>
              Copiar pendentes
            </Botao>
          </div>
        }
      >
        Jurados
      </TituloBloco>
      <p className="text-sm">
        <strong className="tabular-nums">
          {votaram} de {jurados.length}
        </strong>{" "}
        votaram. A escolha de cada jurado só aparece na aba Resultado, depois do encerramento.
      </p>
      {jurados.length === 0 ? (
        <p className="text-sm text-tema-texto-suave">Nenhum jurado com convite resgatado.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {jurados.map((j, i) => (
            <li key={`${j.rotulo}-${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-tema-borda bg-tema-fundo px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{j.rotulo ?? "Convite sem rótulo"}</span>
                {mostrarNomes && <span className="block truncate text-sm text-tema-texto-suave">{j.nome}</span>}
              </span>
              {j.votou ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-tema-sucesso">
                  <CircleCheck aria-hidden className="size-4" /> Votou
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-tema-aviso">
                  <Clock aria-hidden className="size-4" /> Pendente
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {textoManual !== null && (
        <label className="flex flex-col gap-1 text-sm">
          Não foi possível copiar automaticamente. Selecione o texto e copie:
          <textarea readOnly value={textoManual} rows={Math.min(6, pendentes.length + 1)} className="rounded-xl border border-tema-borda bg-tema-fundo p-2" />
        </label>
      )}
    </Cartao>
  );
}
