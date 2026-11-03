"use client";

import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { Dialogo } from "@/components/ui/Dialogo";
import { useToast } from "@/components/ui/Toast";
import type { CodigoPareamentoGerado } from "@/dominio/totem";
import { formatarDataHora, paraMs } from "@/lib/tempo";

export type CodigoParaMostrar = CodigoPareamentoGerado & {
  /** Endereço da página de pareamento no tablet (com a origem do navegador do admin). */
  url: string;
};

/**
 * Mostra o código de pareamento UMA vez (Base/VotoInfantil.md §4: curto, de uso único e com validade). O código legível vive só
 * no estado local deste diálogo (nunca no store, no console nem na auditoria) e some ao fechar. O QR leva à página de pareamento
 * do tablet; o código é digitado lá.
 */
export function CodigoPareamentoDialog({ codigo, fuso, aoFechar }: { codigo: CodigoParaMostrar | null; fuso: string; aoFechar: () => void }) {
  const toast = useToast();

  async function copiar() {
    if (!codigo) return;
    try {
      if (!navigator.clipboard) throw new Error("sem clipboard");
      await navigator.clipboard.writeText(codigo.codigo);
      toast("Código copiado.", "sucesso");
    } catch {
      toast("Não foi possível copiar. Anote o código na tela.", "erro");
    }
  }

  return (
    <Dialogo
      aberto={codigo !== null}
      aoFechar={aoFechar}
      titulo={codigo ? `Parear: ${codigo.nome}` : "Parear totem"}
      rodape={
        <>
          <Botao variante="contorno" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao onClick={() => void copiar()} icone={<Copy aria-hidden className="size-4" />}>
            Copiar código
          </Botao>
        </>
      }
    >
      {codigo && (
        <div className="flex flex-col gap-4">
          <Alerta variante="aviso">Depois de fechar, não será possível ver o código novamente. Se precisar, gere outro.</Alerta>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
            <li>
              No tablet, abra <span className="break-all font-mono">{codigo.url.replace(/^https?:\/\//, "")}</span> ou leia o QR Code.
            </li>
            <li>Digite o código abaixo, uma vez. O tablet vira o totem e passa a votar sem login.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-tema-borda bg-tema-superficie p-4">
            <code aria-label={`Código de pareamento ${codigo.codigo}`} className="font-mono text-3xl font-bold tracking-widest">
              {codigo.codigo}
            </code>
            <p className="text-sm text-tema-texto-suave">
              Vale até {formatarDataHora(paraMs(codigo.validadeAte), fuso)} (
              <ContagemRegressiva alvoMs={paraMs(codigo.validadeAte)} rotulo="Vence em" textoZerado="vencido" />) e só funciona uma vez.
            </p>
            <div className="rounded-xl bg-white p-3 text-black">
              <QRCodeSVG value={codigo.url} size={168} level="M" marginSize={1} aria-label="QR Code da página de pareamento" role="img" />
            </div>
          </div>
        </div>
      )}
    </Dialogo>
  );
}
