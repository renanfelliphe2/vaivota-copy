"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  EXIGEM_VOTOS,
  normalizarOpcoesReset,
  OPCOES_RESET,
  OPCOES_RESET_VAZIAS,
  votosObrigatorios,
  type ChaveReset,
  type OpcoesReset,
} from "@/dominio/resetEvento";
import { Botao } from "@/components/ui/Botao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { resetarEvento } from "@/servicos/operacao";
import { useServico } from "../useServico";

/**
 * Demanda E1 (25/11/2026): resetar o evento, em qualquer estado. Volta para rascunho com a urna não iniciada; a configuração fica.
 * O admin marca o que zerar; contas do público, jurados e totens marcam os votos junto (sem os votos, não dá para apagá-los).
 */
export function ResetEvento({ eventoId, nomeEvento }: { eventoId: string; nomeEvento: string }) {
  const servico = useServico();
  const [aberto, setAberto] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcoesReset>(OPCOES_RESET_VAZIAS);
  const efetivas = normalizarOpcoesReset(opcoes);
  const votosPresos = votosObrigatorios(opcoes);

  function fechar() {
    setAberto(false);
    setOpcoes(OPCOES_RESET_VAZIAS);
  }

  function alternar(chave: ChaveReset) {
    setOpcoes((atual) => ({ ...atual, [chave]: !atual[chave] }));
  }

  async function confirmar() {
    const r = await servico.executar(() => resetarEvento(eventoId, nomeEvento, efetivas), "Evento resetado para rascunho");
    if (r.ok) fechar();
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-3 rounded-2xl border border-tema-erro/40 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">Resetar o evento</h3>
        <p className="text-sm text-tema-texto-suave">
          Volta o evento para rascunho, com a urna não iniciada, em qualquer estado (inclusive concluído). Itens, categorias, campos,
          tema, parceiros, apresentação, pesos e janela continuam como estão.
        </p>
      </div>
      <Botao variante="contorno" onClick={() => setAberto(true)} icone={<RotateCcw aria-hidden className="size-5" />}>
        Resetar evento
      </Botao>

      <DialogoConfirmacao
        aberto={aberto}
        aoFechar={fechar}
        aoConfirmar={confirmar}
        carregando={servico.carregando}
        titulo="Resetar o evento?"
        rotuloConfirmar="Resetar evento"
        perigo
        confirmarDigitando={nomeEvento}
        consequencia={
          <div className="flex flex-col gap-3">
            <p>O evento volta para rascunho e sai do ar para o público até ser ativado de novo. A configuração fica.</p>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 font-semibold">O que zerar</legend>
              {OPCOES_RESET.map((o) => {
                const preso = o.chave === "votos" && votosPresos;
                return (
                  <label key={o.chave} className="flex cursor-pointer items-start gap-3 has-disabled:cursor-not-allowed">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-tema-primaria"
                      checked={efetivas[o.chave]}
                      disabled={preso || servico.carregando}
                      onChange={() => alternar(o.chave)}
                      aria-describedby={`reset-${o.chave}-descricao`}
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold">{o.rotulo}</span>
                      <span id={`reset-${o.chave}-descricao`} className="text-tema-texto-suave">
                        {o.descricao}
                        {preso && " Marcado porque é preciso apagar os votos para apagar o que você escolheu abaixo."}
                        {EXIGEM_VOTOS.includes(o.chave) && " Marca os votos junto."}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <p className="font-semibold">O que for zerado não volta. O reset fica registrado na auditoria, que nunca é apagada.</p>
          </div>
        }
      />
    </div>
  );
}
