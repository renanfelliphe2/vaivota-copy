"use client";

import { Ban, CircleCheck, Clock, Pencil, UserCheck } from "lucide-react";
import { useState } from "react";
import type { EstadoExibidoConvite } from "@/dominio/convites";
import { Botao } from "@/components/ui/Botao";
import { Input, Select } from "@/components/ui/Campo";
import { Selo } from "@/components/ui/Selo";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import type { ConviteListado } from "@/servicos/convites";

const SELOS: Record<EstadoExibidoConvite, { texto: string; variante: "sucesso" | "info" | "erro" | "aviso"; icone: typeof Ban }> = {
  DISPONIVEL: { texto: "Disponível", variante: "sucesso", icone: CircleCheck },
  USADO: { texto: "Usado", variante: "info", icone: UserCheck },
  REVOGADO: { texto: "Revogado", variante: "erro", icone: Ban },
  EXPIRADO: { texto: "Expirado", variante: "aviso", icone: Clock },
};

/** Etapa 6 (seção 5.4): lista de cartões (vira tabela visual a partir de md). Rótulo editável, revogar só disponível/expirado. */
export function TabelaConvites({
  convites,
  fuso,
  podeRenomear,
  podeRevogar,
  aoRenomear,
  aoRevogar,
}: {
  convites: ConviteListado[];
  fuso: string;
  podeRenomear: boolean;
  podeRevogar: boolean;
  aoRenomear: (id: string, rotulo: string) => Promise<boolean>;
  aoRevogar: (convite: ConviteListado) => void;
}) {
  const [filtro, setFiltro] = useState<EstadoExibidoConvite | "TODOS">("TODOS");
  const [editando, setEditando] = useState<{ id: string; rotulo: string } | null>(null);
  const visiveis = filtro === "TODOS" ? convites : convites.filter((c) => c.estado === filtro);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 self-start text-sm">
        <span className="font-semibold">Mostrar</span>
        <Select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="w-auto">
          <option value="TODOS">Todos</option>
          {Object.entries(SELOS).map(([v, s]) => (
            <option key={v} value={v}>
              {s.texto}
            </option>
          ))}
        </Select>
      </label>
      <ul className="flex flex-col gap-2">
        {visiveis.map((c) => {
          const selo = SELOS[c.estado];
          const emEdicao = editando?.id === c.id;
          return (
            <li key={c.id} className="grid gap-2 rounded-xl border border-tema-borda bg-tema-superficie p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div className="min-w-0">
                {emEdicao ? (
                  <form
                    className="flex gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (await aoRenomear(c.id, editando.rotulo)) setEditando(null);
                    }}
                  >
                    <Input aria-label="Rótulo do convite" value={editando.rotulo} onChange={(e) => setEditando({ id: c.id, rotulo: e.target.value })} maxLength={40} autoFocus />
                    <Botao type="submit" tamanho="pequeno">
                      Salvar
                    </Botao>
                    <Botao variante="fantasma" tamanho="pequeno" onClick={() => setEditando(null)}>
                      Cancelar
                    </Botao>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{c.rotulo ?? "Sem rótulo"}</span>
                    {podeRenomear && (
                      <Botao variante="fantasma" tamanho="pequeno" aria-label={`Renomear ${c.rotulo ?? "convite sem rótulo"}`} onClick={() => setEditando({ id: c.id, rotulo: c.rotulo ?? "" })} icone={<Pencil aria-hidden className="size-4" />}>
                        Renomear
                      </Botao>
                    )}
                  </div>
                )}
              </div>
              <Selo variante={selo.variante} icone={selo.icone}>
                {selo.texto}
              </Selo>
              <div className="text-sm text-tema-texto-suave">
                <p>Validade: {c.validadeAte ? formatarDataHora(paraMs(c.validadeAte), fuso) : "Sem validade"}</p>
                {c.resgatadoPor && (
                  <p>
                    Resgatado por {c.resgatadoPor}
                    {c.resgatadoEm && ` em ${formatarDataHora(paraMs(c.resgatadoEm), fuso)}`}
                  </p>
                )}
              </div>
              <div>
                {podeRevogar && (c.estado === "DISPONIVEL" || c.estado === "EXPIRADO") && (
                  <Botao variante="contorno" tamanho="pequeno" onClick={() => aoRevogar(c)} icone={<Ban aria-hidden className="size-4" />}>
                    Revogar
                  </Botao>
                )}
              </div>
            </li>
          );
        })}
        {visiveis.length === 0 && <li className="rounded-xl border border-dashed border-tema-borda p-6 text-center text-tema-texto-suave">Nenhum convite neste filtro.</li>}
      </ul>
    </div>
  );
}
