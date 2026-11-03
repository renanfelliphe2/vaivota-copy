"use client";

import Link from "next/link";
import { useState } from "react";
import { resumirConvites } from "@/dominio/convites";
import type { Travas } from "@/dominio/travas";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Carregando } from "@/components/ui/Carregando";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { Selo } from "@/components/ui/Selo";
import { useConsulta } from "@/lib/useConsulta";
import { alternarModuloJuri } from "@/servicos/configJuri";
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
  const [desligando, setDesligando] = useState(false);
  const servico = useServico();
  if (!ativo) return null;
  const { evento, configPlacar } = ativo;

  const juriLigado = evento.moduloJuri;
  const podeModulo = travas.permite("PLACAR");
  // Desligar também depende do dado: com convite resgatado o módulo fica ligado (MODULO_JURI_DESLIGAR).
  const podeDesligar = podeModulo && travas.permite("MODULO_JURI_DESLIGAR");
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
      <BannerTrava travas={travas} acoes={["PLACAR", "JURI_AVALIACAO", "CONVITES_GERAR", "CONVITES_REVOGAR", "CONVITES_RENOMEAR"]} />

      <div className="flex flex-col gap-3 rounded-xl border border-tema-borda bg-tema-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold">Votação do júri</h3>
            <p className="text-sm text-tema-texto-suave">
              Jurados entram com um código de convite e votam identificados. O placar &quot;Escolha dos Jurados&quot; entra na fórmula final com o peso do júri.
            </p>
          </div>
          <Selo variante={juriLigado ? "sucesso" : "neutro"}>{juriLigado ? "Ligada" : "Desligada"}</Selo>
        </div>
        {travas.fase !== "CONCLUIDO" && (
          <div className="flex flex-col items-start gap-2">
            <DicaTrava motivo={juriLigado ? (podeDesligar ? null : travas.motivo(podeModulo ? "MODULO_JURI_DESLIGAR" : "PLACAR")) : podeModulo ? null : travas.motivo("PLACAR")} />
            {juriLigado ? (
              <Botao variante="contorno" disabled={!podeDesligar} onClick={() => setDesligando(true)}>
                Desligar votação do júri
              </Botao>
            ) : (
              <Botao disabled={!podeModulo} carregando={servico.carregando} onClick={() => void servico.executar(() => alternarModuloJuri(evento.id, true), "Votação do júri ligada")}>
                Ligar votação do júri
              </Botao>
            )}
          </div>
        )}
        {juriLigado && configPlacar.pesoJuri === 0 && (
          <Alerta variante="aviso">
            O peso do júri está em 0%: os votos dos jurados não contam na fórmula final. Defina o peso na seção{" "}
            <Link href="?secao=placar" scroll={false} className="font-semibold underline underline-offset-4">
              Placar
            </Link>
            .
          </Alerta>
        )}
        {!juriLigado && <Alerta variante="informacao">Votação do júri desligada: convites só em leitura.</Alerta>}
      </div>

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
      <DialogoConfirmacao
        aberto={desligando}
        aoFechar={() => setDesligando(false)}
        titulo="Desligar a votação do júri?"
        consequencia="O peso do júri volta a 0% e o resto se redistribui. Só é possível desligar se nenhum convite foi resgatado e o júri ainda não votou."
        rotuloConfirmar="Desligar"
        carregando={servico.carregando}
        aoConfirmar={async () => {
          const r = await servico.executar(() => alternarModuloJuri(evento.id, false), "Votação do júri desligada");
          if (r.ok) setDesligando(false);
        }}
      />
      <CodigosGeradosDialog codigos={codigos} eventoId={eventoId} slug={ativo.slug} fuso={evento.fusoHorario} aoFechar={() => setCodigos(null)} />
    </section>
  );
}
