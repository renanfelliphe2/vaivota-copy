"use client";

import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { validarGeracaoConvites } from "@/dominio/validacoesConfig";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { instanteParaLocal, localParaInstante } from "@/lib/fusoHorario";
import { paraMs } from "@/lib/tempo";
import { gerarConvites, type CodigoGerado } from "@/servicos/convites";
import { useAgora } from "@/store/seletores/relogio";
import { useServico } from "../useServico";

/** Etapa 6 (CP5): quantidade 1–50, rótulo base opcional, validade padrão = fim da janela (opcional). */
export function GerarConvitesForm({
  eventoId,
  fuso,
  janelaFim,
  disabled,
  aoGerar,
}: {
  eventoId: string;
  fuso: string;
  janelaFim: string | null;
  disabled: boolean;
  aoGerar: (codigos: CodigoGerado[]) => void;
}) {
  const agora = useAgora();
  const padrao = janelaFim && paraMs(janelaFim) > agora ? instanteParaLocal(janelaFim, fuso) : "";
  const [quantidade, setQuantidade] = useState("5");
  const [rotuloBase, setRotuloBase] = useState("Jurado");
  const [validade, setValidade] = useState(padrao);
  const [tentou, setTentou] = useState(false);
  const servico = useServico();

  const validadeAte = validade ? localParaInstante(validade, fuso) : null;
  const erros = {
    ...validarGeracaoConvites({ quantidade: Number(quantidade), rotuloBase, validadeAteMs: validadeAte ? paraMs(validadeAte) : null, agoraMs: agora }),
    ...(servico.erro?.campos ?? {}),
  };
  const mostrar = (c: string) => (tentou ? (erros[c] ?? null) : null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setTentou(true);
    if (Object.keys(erros).length) return;
    const r = await servico.executar(() => gerarConvites(eventoId, { quantidade: Number(quantidade), rotuloBase, validadeAte }), null);
    if (r.ok) {
      setTentou(false);
      aoGerar(r.dados.codigos);
    }
  }

  return (
    <form onSubmit={enviar} noValidate aria-busy={servico.carregando || undefined} className="flex flex-col gap-4 rounded-2xl border border-tema-borda p-4">
      <h3 className="text-lg font-bold">Gerar convites</h3>
      <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-3">
        <Campo id="conv-qtd" rotulo="Quantidade" obrigatorio erro={mostrar("quantidade")} dica="De 1 a 50.">
          <Input type="number" min={1} max={50} inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
        </Campo>
        <Campo id="conv-rotulo" rotulo="Rótulo base" erro={mostrar("rotuloBase")} dica='Vira "Jurado 4", "Jurado 5"…'>
          <Input value={rotuloBase} onChange={(e) => setRotuloBase(e.target.value)} maxLength={40} />
        </Campo>
        <Campo id="conv-validade" rotulo="Validade" erro={mostrar("validadeAte")} dica="Vazio = sem validade.">
          <Input type="datetime-local" value={validade} onChange={(e) => setValidade(e.target.value)} />
        </Campo>
      </fieldset>
      {!disabled && (
        <Botao type="submit" className="self-start" carregando={servico.carregando} icone={<KeyRound aria-hidden className="size-4" />}>
          Gerar
        </Botao>
      )}
    </form>
  );
}
