"use client";

import { useState } from "react";
import { resumirConvites } from "@/dominio/convites";
import type { Travas } from "@/dominio/travas";
import { Alerta } from "@/components/ui/Alerta";
import { Carregando } from "@/components/ui/Carregando";
import { useConsulta } from "@/lib/useConsulta";
import { listarConvites, renomearConvite, revogarConvite, type CodigoGerado, type ConviteListado } from "@/servicos/convites";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { BannerTrava } from "../BannerTrava";
import { DicaTrava } from "../DicaTrava";
import { useServico } from "../useServico";
import { CodigosGeradosDialog } from "./CodigosGeradosDialog";
import { FormAvaliacaoJuri } from "./FormAvaliacaoJuri";
import { GerarConvitesForm } from "./GerarConvitesForm";
import { RevogarConviteDialog } from "./RevogarConviteDialog";
import { TabelaConvites } from "./TabelaConvites";

/**
 * Seção Júri (Etapa 6, CP5). A lista é lida por serviço (sem hash, D10) e recarregada depois de cada mutação.
 * 08/10/2026: forma de votação do júri e critérios de avaliação no topo (FormAvaliacaoJuri).
 */
export function SecaoJuri({ travas }: { travas: Travas }) {
  const ativo = useEventoAtivo();
  const agora = useAgora();
  const eventoId = ativo?.evento.id ?? "";
  const consulta = useConsulta(() => listarConvites(eventoId), { chave: eventoId, ativo: Boolean(eventoId) });
  const [codigos, setCodigos] = useState<CodigoGerado[] | null>(null);
  const [revogando, setRevogando] = useState<ConviteListado | null>(null);
  const servico = useServico();
  if (!ativo) return null;
  const { evento } = ativo;

  const juriLigado = evento.moduloJuri;
  const motivoDesligado = "Módulo júri desligado: convites só em leitura.";
  const podeGerar = juriLigado && travas.permite("CONVITES_GERAR");
  const podeRevogar = juriLigado && travas.permite("CONVITES_REVOGAR");
  const podeRenomear = travas.permite("CONVITES_RENOMEAR");
  const convites = consulta.dados ?? [];
  // Mesmas funções da aba Operação do Dashboard (Etapa 7): os números batem por construção.
  // A listagem traz o estado já exibido; volta ao estado do banco (expirado = disponível) para rederivar no relógio atual.
  const resumo = resumirConvites(
    convites.map((c) => ({ estado: c.estado === "EXPIRADO" ? "DISPONIVEL" : c.estado, validadeAte: c.validadeAte })),
    agora,
  );

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Júri
      </h2>
      <BannerTrava travas={travas} acoes={["JURI_AVALIACAO", "CONVITES_GERAR", "CONVITES_REVOGAR", "CONVITES_RENOMEAR"]} />
      {!juriLigado && <Alerta variante="informacao">{motivoDesligado}</Alerta>}

      {juriLigado && (
        <FormAvaliacaoJuri
          // Remonta quando o salvo muda (pelo admin ou pela toolbar).
          key={`${ativo.configPlacar.modoVotoJuri}:${ativo.criteriosJuri.map((c) => `${c.id}=${c.nome}`).join("|")}`}
          eventoId={eventoId}
          modo={ativo.configPlacar.modoVotoJuri}
          criterios={ativo.criteriosJuri}
          travas={travas}
        />
      )}

      <h3 className="text-lg font-bold">Convites de jurado</h3>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Disponíveis", resumo.disponiveis],
            ["Usados", resumo.usados],
            ["Revogados", resumo.revogados],
            ["Expirados", resumo.expirados],
          ] as const
        ).map(([rotulo, n]) => (
          <div key={rotulo} className="rounded-xl border border-tema-borda bg-tema-superficie p-3">
            <dt className="text-sm text-tema-texto-suave">{rotulo}</dt>
            <dd className="text-2xl font-bold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      {juriLigado && travas.fase !== "CONCLUIDO" && (
        <>
          <DicaTrava motivo={podeGerar ? null : travas.motivo("CONVITES_GERAR")} />
          <GerarConvitesForm
            eventoId={eventoId}
            fuso={evento.fusoHorario}
            janelaFim={evento.janelaFim}
            disabled={!podeGerar}
            aoGerar={(novos) => {
              setCodigos(novos);
              consulta.recarregar();
            }}
          />
        </>
      )}

      <h4 className="font-bold">Lista de convites</h4>
      {consulta.carregando && !consulta.dados ? (
        <Carregando />
      ) : consulta.erro && !consulta.dados ? (
        <Alerta variante="erro">{consulta.erro.mensagem}</Alerta>
      ) : convites.length === 0 ? (
        <p className="rounded-xl border border-dashed border-tema-borda p-6 text-tema-texto-suave">
          Nenhum convite ainda. Cada jurado precisa de um código para resgatar o papel de jurado.
        </p>
      ) : (
        <TabelaConvites
          convites={convites}
          fuso={evento.fusoHorario}
          podeRenomear={podeRenomear}
          podeRevogar={podeRevogar}
          aoRenomear={async (id, rotulo) => {
            const r = await servico.executar(() => renomearConvite(eventoId, id, rotulo));
            if (r.ok) consulta.recarregar();
            return r.ok;
          }}
          aoRevogar={setRevogando}
        />
      )}

      <RevogarConviteDialog
        rotulo={revogando?.rotulo ?? null}
        aberto={revogando !== null}
        carregando={servico.carregando}
        aoFechar={() => setRevogando(null)}
        aoConfirmar={async (opcoes) => {
          if (!revogando) return;
          const r = await servico.executar(() => revogarConvite(eventoId, revogando.id, opcoes), "Convite revogado");
          if (!r.ok) return;
          setRevogando(null);
          consulta.recarregar();
          if (r.dados.substituto) setCodigos([r.dados.substituto]);
        }}
      />
      <CodigosGeradosDialog codigos={codigos} eventoId={eventoId} slug={ativo.slug} fuso={evento.fusoHorario} aoFechar={() => setCodigos(null)} />
    </section>
  );
}
