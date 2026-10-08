"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { registrarRelatorioGerado } from "@/servicos/relatorio";

// Etapa 7 (5.11, D17): registra RELATORIO_GERADO e só então imprime. Falha mostra o erro e não imprime.

export function BarraAcoesRelatorio({ eventoId, base }: { eventoId: string; base: string }) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function imprimir() {
    setCarregando(true);
    setErro(null);
    const r = await registrarRelatorioGerado(eventoId);
    setCarregando(false);
    if (!r.ok) return setErro(r.erro.mensagem);
    window.print();
  }

  return (
    <div data-print="ocultar" className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Botao icone={<Printer aria-hidden className="size-4" />} carregando={carregando} onClick={() => void imprimir()}>
          Imprimir / Salvar como PDF
        </Botao>
        <Botao href={`${base}?aba=resultado`} variante="contorno" icone={<ArrowLeft aria-hidden className="size-4" />}>
          Voltar ao painel
        </Botao>
      </div>
      {erro && <Alerta variante="erro">{erro}</Alerta>}
    </div>
  );
}
