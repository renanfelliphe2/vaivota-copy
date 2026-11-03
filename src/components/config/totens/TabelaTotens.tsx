"use client";

import { CircleCheck, CirclePause, CircleSlash, KeyRound, Pause, Pencil, Play } from "lucide-react";
import { useState } from "react";
import type { DispositivoListado } from "@/dominio/totem";
import type { EstadoDispositivo } from "@/dominio/tipos";
import { Botao } from "@/components/ui/Botao";
import { Input } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { formatarNumero } from "@/lib/formatar";
import { formatarDataHora, paraMs } from "@/lib/tempo";

const SELOS: Record<EstadoDispositivo, { texto: string; variante: "sucesso" | "aviso" | "erro"; icone: typeof CircleCheck }> = {
  ATIVO: { texto: "Ativo", variante: "sucesso", icone: CircleCheck },
  PAUSADO: { texto: "Pausado", variante: "aviso", icone: CirclePause },
  REVOGADO: { texto: "Revogado", variante: "erro", icone: CircleSlash },
};

/**
 * Lista de totens (Base/VotoInfantil.md §4): nome, estado, último uso e votos. Pausar, retomar, renomear, trocar o PIN e revogar.
 * Revogado é definitivo e fica só para consulta; os votos dele continuam contando.
 */
export function TabelaTotens({
  totens,
  fuso,
  podeGerir,
  aoRenomear,
  aoPausar,
  aoReativar,
  aoTrocarPin,
  aoRevogar,
}: {
  totens: DispositivoListado[];
  fuso: string;
  podeGerir: boolean;
  aoRenomear: (id: string, nome: string) => Promise<boolean>;
  aoPausar: (totem: DispositivoListado) => void;
  aoReativar: (totem: DispositivoListado) => void;
  aoTrocarPin: (totem: DispositivoListado) => void;
  aoRevogar: (totem: DispositivoListado) => void;
}) {
  const [editando, setEditando] = useState<{ id: string; nome: string } | null>(null);

  return (
    <ul className="flex flex-col gap-2">
      {totens.map((t) => {
        const selo = SELOS[t.estado];
        const emEdicao = editando?.id === t.id;
        const revogado = t.estado === "REVOGADO";
        return (
          <li key={t.id} className="grid gap-3 rounded-xl border border-tema-borda bg-tema-superficie p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 flex-col gap-1">
              {emEdicao ? (
                <form
                  className="flex flex-wrap gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (await aoRenomear(t.id, editando.nome)) setEditando(null);
                  }}
                >
                  <Input aria-label="Nome do totem" value={editando.nome} onChange={(e) => setEditando({ id: t.id, nome: e.target.value })} maxLength={40} autoFocus className="max-w-xs" />
                  <Botao type="submit" tamanho="pequeno">
                    Salvar
                  </Botao>
                  <Botao variante="fantasma" tamanho="pequeno" onClick={() => setEditando(null)}>
                    Cancelar
                  </Botao>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t.nome}</span>
                  <Selo variante={selo.variante} icone={selo.icone}>
                    {selo.texto}
                  </Selo>
                  {podeGerir && (
                    <Botao
                      variante="fantasma"
                      tamanho="pequeno"
                      aria-label={`Renomear ${t.nome}`}
                      onClick={() => setEditando({ id: t.id, nome: t.nome })}
                      icone={<Pencil aria-hidden className="size-4" />}
                    >
                      Renomear
                    </Botao>
                  )}
                </div>
              )}
              <p className="text-sm text-tema-texto-suave">
                Último uso: {t.ultimoUsoEm ? formatarDataHora(paraMs(t.ultimoUsoEm), fuso) : "nunca usado"} · <span className="tabular-nums">{formatarNumero(t.votos)}</span>{" "}
                {t.votos === 1 ? "voto" : "votos"}
                {!t.temPin && !revogado && " · sem PIN"}
              </p>
            </div>
            {podeGerir && !revogado && (
              <div className="flex flex-wrap gap-2">
                {t.estado === "ATIVO" ? (
                  <Botao variante="contorno" tamanho="pequeno" aria-label={`Pausar ${t.nome}`} onClick={() => aoPausar(t)} icone={<Pause aria-hidden className="size-4" />}>
                    Pausar
                  </Botao>
                ) : (
                  <Botao variante="contorno" tamanho="pequeno" aria-label={`Retomar ${t.nome}`} onClick={() => aoReativar(t)} icone={<Play aria-hidden className="size-4" />}>
                    Retomar
                  </Botao>
                )}
                <Botao variante="contorno" tamanho="pequeno" aria-label={`Trocar o PIN de ${t.nome}`} onClick={() => aoTrocarPin(t)} icone={<KeyRound aria-hidden className="size-4" />}>
                  PIN
                </Botao>
                <Botao variante="perigo" tamanho="pequeno" aria-label={`Revogar ${t.nome}`} onClick={() => aoRevogar(t)} icone={<CircleSlash aria-hidden className="size-4" />}>
                  Revogar
                </Botao>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
