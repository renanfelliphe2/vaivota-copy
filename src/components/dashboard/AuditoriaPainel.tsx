"use client";

import { useId, useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Carregando } from "@/components/ui/Carregando";
import { Cartao } from "@/components/ui/Cartao";
import { GRUPOS_AUDITORIA, ROTULO_GRUPO_AUDITORIA, type GrupoAuditoria } from "@/dominio/auditoria";
import type { ItemAuditoria, OperacaoDados } from "@/dominio/painel";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import { useConsulta } from "@/lib/useConsulta";
import { listarAuditoria } from "@/servicos/dashboard";
import { TituloBloco } from "./KpiCard";

// Etapa 7 (5.5, 5.9): resumo e lista da auditoria. Sem escolha de voto, código de convite nem nome de jurado.

function Lista({ itens, fuso }: { itens: ItemAuditoria[]; fuso: string }) {
  if (itens.length === 0) return <p className="text-sm text-tema-texto-suave">Nenhuma entrada neste grupo.</p>;
  return (
    <div className="max-h-96 overflow-auto rounded-xl border border-tema-borda">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">Entradas de auditoria, mais recentes primeiro</caption>
        <thead className="sticky top-0 bg-tema-superficie">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Quando</th>
            <th scope="col" className="px-3 py-2 font-semibold">Tipo</th>
            <th scope="col" className="px-3 py-2 font-semibold">Descrição</th>
            <th scope="col" className="px-3 py-2 font-semibold">Quem</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id} className="border-t border-tema-borda">
              <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatarDataHora(paraMs(i.criadoEm), fuso)}</td>
              <td className="px-3 py-2">{ROTULO_GRUPO_AUDITORIA[i.grupo]}</td>
              <td className="px-3 py-2">{i.descricao}</td>
              <td className="px-3 py-2">{i.ator}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditoriaPainel({ dados, fuso }: { dados: OperacaoDados; fuso: string }) {
  const [grupo, setGrupo] = useState<GrupoAuditoria | "TODOS">("TODOS");
  const idFiltro = useId();
  const { resumo, itens } = dados.auditoria;
  const filtrada = useConsulta(() => listarAuditoria(dados.eventoId, { grupo: grupo === "TODOS" ? undefined : grupo }), {
    ativo: grupo !== "TODOS",
    chave: `${dados.eventoId}:${grupo}:${dados.geradoEm}`,
  });
  const gruposComEntradas = GRUPOS_AUDITORIA.filter((g) => resumo.porGrupo[g] > 0);

  return (
    <Cartao className="flex flex-col gap-4">
      <TituloBloco>Auditoria</TituloBloco>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-xl border border-tema-borda bg-tema-fundo p-3">
          <dt className="text-tema-texto-suave">Bloqueios por tentativas</dt>
          <dd className="text-2xl font-bold tabular-nums">{resumo.bloqueiosRateLimit}</dd>
        </div>
        <div className="rounded-xl border border-tema-borda bg-tema-fundo p-3">
          <dt className="text-tema-texto-suave">Alterações de voto do júri</dt>
          <dd className="text-2xl font-bold tabular-nums">{resumo.alteracoesVotoJuri}</dd>
        </div>
        <div className="col-span-2 rounded-xl border border-tema-borda bg-tema-fundo p-3">
          <dt className="text-tema-texto-suave">Por grupo</dt>
          <dd className="flex flex-wrap gap-x-3 gap-y-1">
            {gruposComEntradas.map((g) => (
              <span key={g}>
                {ROTULO_GRUPO_AUDITORIA[g]}: <strong className="tabular-nums">{resumo.porGrupo[g]}</strong>
              </span>
            ))}
          </dd>
        </div>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={idFiltro} className="text-sm font-semibold">
          Filtrar por grupo
        </label>
        <select
          id={idFiltro}
          value={grupo}
          onChange={(e) => setGrupo(e.target.value as GrupoAuditoria | "TODOS")}
          className="min-h-11 rounded-xl border border-tema-borda bg-tema-fundo px-3 text-sm"
        >
          <option value="TODOS">Todos (mais recentes)</option>
          {GRUPOS_AUDITORIA.map((g) => (
            <option key={g} value={g}>
              {ROTULO_GRUPO_AUDITORIA[g]}
            </option>
          ))}
        </select>
      </div>
      {grupo === "TODOS" ? (
        <Lista itens={itens} fuso={fuso} />
      ) : filtrada.dados ? (
        <Lista itens={filtrada.dados} fuso={fuso} />
      ) : filtrada.erro ? (
        <Alerta variante="erro">{filtrada.erro.mensagem}</Alerta>
      ) : (
        <Carregando />
      )}
    </Cartao>
  );
}
