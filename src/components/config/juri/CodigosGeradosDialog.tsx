"use client";

import { Copy, Download } from "lucide-react";
import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { useToast } from "@/components/ui/Toast";
import { baixarCsv, montarCsv } from "@/lib/csv";
import { formatarDataHora, paraMs } from "@/lib/tempo";
import type { CodigoGerado } from "@/servicos/convites";
import { registrarExportacaoConvites } from "@/servicos/convites";
import { useAgora } from "@/store/seletores/relogio";

/**
 * Etapa 6 (seção 5.4): mostra os códigos uma única vez. Os códigos legíveis vivem só no estado local
 * deste diálogo (nunca no store, no console nem na auditoria) e somem ao fechar.
 */
export function CodigosGeradosDialog({
  codigos,
  eventoId,
  slug,
  fuso,
  aoFechar,
}: {
  codigos: CodigoGerado[] | null;
  eventoId: string;
  slug: string;
  fuso: string;
  aoFechar: () => void;
}) {
  const [guardou, setGuardou] = useState(false);
  const [confirmarFechar, setConfirmarFechar] = useState(false);
  const [manual, setManual] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const toast = useToast();
  const agora = useAgora();
  const aberto = codigos !== null;
  const lista = codigos ?? [];
  const textoValidade = (v: string | null) => (v ? formatarDataHora(paraMs(v), fuso) : "Sem validade");
  const texto = lista.map((c) => `${c.rotulo ?? "Sem rótulo"}: ${c.codigo} (${textoValidade(c.validadeAte)})`).join("\n");

  function fechar() {
    if (!guardou) return setConfirmarFechar(true);
    sair();
  }

  function sair() {
    setGuardou(false);
    setManual(false);
    setConfirmarFechar(false);
    aoFechar();
  }

  async function copiar() {
    try {
      if (!navigator.clipboard) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(texto);
      setGuardou(true);
      toast("Códigos copiados.", "sucesso");
    } catch {
      setManual(true);
      setGuardou(true);
      toast("Não foi possível copiar. Selecione e copie manualmente.", "erro");
    }
  }

  async function baixar() {
    setBaixando(true);
    const r = await registrarExportacaoConvites(eventoId, lista.length);
    setBaixando(false);
    if (!r.ok) {
      toast(r.erro.mensagem, "erro");
      return;
    }
    const dia = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" })
      .format(new Date(agora))
      .replace(/-/g, "");
    baixarCsv(
      `convites-${slug}-${dia}.csv`,
      montarCsv(
        ["rotulo", "codigo", "validade"],
        lista.map((c) => [c.rotulo ?? "", c.codigo, c.validadeAte ?? ""]),
      ),
    );
    setGuardou(true);
  }

  return (
    <>
      <Dialogo
        aberto={aberto}
        aoFechar={fechar}
        titulo={lista.length === 1 ? "Código gerado" : `${lista.length} códigos gerados`}
        rodape={
          <>
            <Botao variante="contorno" onClick={fechar}>
              Fechar
            </Botao>
            <Botao variante="contorno" onClick={() => void baixar()} carregando={baixando} icone={<Download aria-hidden className="size-4" />}>
              Baixar CSV
            </Botao>
            <Botao onClick={() => void copiar()} icone={<Copy aria-hidden className="size-4" />}>
              Copiar tudo
            </Botao>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Alerta variante="aviso">Depois de fechar, não será possível ver os códigos novamente.</Alerta>
          <ul className="flex flex-col divide-y divide-tema-borda">
            {lista.map((c) => (
              <li key={c.codigo} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-sm">{c.rotulo ?? "Sem rótulo"}</span>
                <code className="font-mono text-lg font-bold tracking-wider">{c.codigo}</code>
                <span className="w-full text-xs text-tema-texto-suave">Validade: {textoValidade(c.validadeAte)}</span>
              </li>
            ))}
          </ul>
          {manual && (
            <textarea
              readOnly
              aria-label="Códigos para copiar"
              value={texto}
              className="min-h-32 w-full rounded-lg border border-tema-texto-suave bg-tema-fundo p-2 font-mono text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      </Dialogo>
      <DialogoConfirmacao
        aberto={confirmarFechar}
        aoFechar={() => setConfirmarFechar(false)}
        aoConfirmar={sair}
        titulo="Fechar sem guardar os códigos?"
        consequencia="Você ainda não copiou nem baixou os códigos. Depois de fechar, eles não poderão ser vistos de novo."
        rotuloConfirmar="Fechar mesmo assim"
        rotuloCancelar="Voltar aos códigos"
      />
    </>
  );
}
