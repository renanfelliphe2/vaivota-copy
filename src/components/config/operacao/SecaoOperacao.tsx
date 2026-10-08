"use client";

import { ChartColumn, DoorClosed, DoorOpen, Flag, Power } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { checklistTemBloqueio, type ItemChecklist } from "@/dominio/checklistAtivacao";
import type { FaseConfig, Travas } from "@/dominio/travas";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { paraMs } from "@/lib/tempo";
import type { Resultado } from "@/servicos/resultado";
import { abrirUrna, ativarEvento, concluirEvento, encerrarUrna } from "@/servicos/operacao";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { ChecklistAtivacao } from "../ChecklistAtivacao";
import { useServico } from "../useServico";
import { LinhaDoTempoEstado } from "./LinhaDoTempoEstado";

type AcaoOperacao = {
  rotulo: string;
  icone: typeof Power;
  titulo: string;
  exigeChecklist: boolean;
  perigo: boolean;
  confirmarDigitando: boolean;
  sucesso: string;
};

const ACOES: Partial<Record<FaseConfig, AcaoOperacao>> = {
  RASCUNHO: {
    rotulo: "Ativar evento",
    icone: Power,
    titulo: "Ativar o evento?",
    exigeChecklist: true,
    perigo: false,
    confirmarDigitando: false,
    sucesso: "Evento ativado",
  },
  ATIVO_NAO_INICIADA: {
    rotulo: "Abrir urna",
    icone: DoorOpen,
    titulo: "Abrir a urna?",
    exigeChecklist: true,
    perigo: false,
    confirmarDigitando: false,
    sucesso: "Urna aberta",
  },
  URNA_ABERTA: {
    rotulo: "Encerrar urna",
    icone: DoorClosed,
    titulo: "Encerrar a votação agora?",
    exigeChecklist: false,
    perigo: true,
    confirmarDigitando: false,
    sucesso: "Urna encerrada",
  },
  URNA_ENCERRADA: {
    rotulo: "Concluir evento",
    icone: Flag,
    titulo: "Concluir o evento?",
    exigeChecklist: false,
    perigo: true,
    confirmarDigitando: true,
    sucesso: "Evento concluído",
  },
};

/** Seção Operação (Etapa 6, CP8): conduz de Rascunho a Concluído. As transições já auditam (D20). */
export function SecaoOperacao({ travas, checklist }: { travas: Travas; checklist: ItemChecklist[] }) {
  const ativo = useEventoAtivo();
  const agora = useAgora();
  const servico = useServico();
  const [confirmando, setConfirmando] = useState(false);
  if (!ativo) return null;
  const { evento, slug } = ativo;
  const base = `/e/${slug}/admin/configuracao`;
  const acao = ACOES[travas.fase] ?? null;
  const bloqueado = Boolean(acao?.exigeChecklist && checklistTemBloqueio(checklist));
  const antesDoInicio = travas.fase === "ATIVO_NAO_INICIADA" && evento.janelaInicio !== null && agora < paraMs(evento.janelaInicio);

  const consequencia: Partial<Record<FaseConfig, React.ReactNode>> = {
    RASCUNHO: (
      <p>
        O evento passa a aparecer para o público e o endereço <code>/e/{slug}</code> deixa de poder mudar. A urna continua fechada até
        você abri-la.
      </p>
    ),
    ATIVO_NAO_INICIADA: (
      <div className="flex flex-col gap-2">
        <p>A votação começa na hora. Itens na votação, campos extras e pesos do placar ficam travados.</p>
        {antesDoInicio && <p className="font-semibold">Atenção: o horário de início da janela ainda não chegou.</p>}
      </div>
    ),
    URNA_ABERTA: (
      <div className="flex flex-col gap-2">
        <p className="font-semibold">Efeito imediato: ninguém mais consegue votar, inclusive quem estiver confirmando agora.</p>
        <p>O resultado oficial é congelado neste momento. Não é possível reabrir a urna.</p>
      </div>
    ),
    URNA_ENCERRADA: <p>A configuração inteira fica somente em leitura. Esta ação não pode ser desfeita.</p>,
  };

  async function confirmar() {
    if (!acao) return;
    const chamadas: Partial<Record<FaseConfig, (nome: string) => Promise<Resultado<null>>>> = {
      RASCUNHO: () => ativarEvento(evento.id),
      ATIVO_NAO_INICIADA: () => abrirUrna(evento.id),
      URNA_ABERTA: () => encerrarUrna(evento.id),
      URNA_ENCERRADA: (nome) => concluirEvento(evento.id, nome),
    };
    const r = await servico.executar(() => chamadas[travas.fase]!(evento.nome), acao.sucesso);
    if (r.ok) setConfirmando(false);
  }

  return (
    <section aria-labelledby="titulo-secao" className="flex flex-col gap-5">
      <h2 id="titulo-secao" tabIndex={-1} className="text-2xl font-bold">
        Operação
      </h2>
      <LinhaDoTempoEstado estado={evento.estado} estadoUrna={evento.estadoUrna} />

      {travas.incoerente && (
        <Alerta variante="aviso" titulo="Ações desabilitadas">
          Combinação criada pela toolbar. Use a toolbar para voltar a um estado válido.
        </Alerta>
      )}

      {travas.fase === "CONCLUIDO" && (
        <Alerta variante="sucesso" titulo="Evento concluído">
          <p>A configuração está em leitura. Os dados e a exportação ficam no painel.</p>
          <Link href={`/e/${slug}/admin`} className="mt-2 inline-flex min-h-11 items-center gap-1.5 font-semibold text-tema-primaria-texto underline underline-offset-4">
            <ChartColumn aria-hidden className="size-4" />
            Ir para o painel
          </Link>
        </Alerta>
      )}

      {(travas.fase === "RASCUNHO" || travas.fase === "ATIVO_NAO_INICIADA") && (
        <div className="flex flex-col gap-3 rounded-2xl border border-tema-borda p-4">
          <h3 className="text-lg font-bold">Checklist de ativação</h3>
          <ChecklistAtivacao itens={checklist} base={base} completo />
        </div>
      )}

      {acao && !travas.incoerente && (
        <div className="flex flex-col items-start gap-2">
          <Botao
            variante={acao.perigo ? "perigo" : "primaria"}
            tamanho="grande"
            disabled={bloqueado}
            onClick={() => setConfirmando(true)}
            icone={<acao.icone aria-hidden className="size-5" />}
            aria-describedby={bloqueado ? "operacao-bloqueio" : undefined}
          >
            {acao.rotulo}
          </Botao>
          {bloqueado && (
            <p id="operacao-bloqueio" className="text-sm font-medium text-tema-erro">
              Resolva as pendências do checklist para continuar.
            </p>
          )}
        </div>
      )}

      {acao && (
        <DialogoConfirmacao
          key={travas.fase}
          aberto={confirmando}
          aoFechar={() => setConfirmando(false)}
          aoConfirmar={confirmar}
          carregando={servico.carregando}
          titulo={acao.titulo}
          consequencia={consequencia[travas.fase]}
          rotuloConfirmar={acao.rotulo}
          perigo={acao.perigo}
          confirmarDigitando={acao.confirmarDigitando ? evento.nome : undefined}
        />
      )}
    </section>
  );
}
