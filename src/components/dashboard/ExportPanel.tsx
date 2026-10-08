"use client";

import { Download, Lock } from "lucide-react";
import { useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { Cartao } from "@/components/ui/Cartao";
import { DialogoConfirmacao } from "@/components/ui/DialogoConfirmacao";
import { useToast } from "@/components/ui/Toast";
import { ARQUIVOS_EXPORTACAO, type ArquivoExportacao, type DisponibilidadeArquivo } from "@/dominio/exportacao";
import { baixarCsv, montarCsv } from "@/lib/csv";
import { prepararExportacao } from "@/servicos/exportacao";
import { TituloBloco } from "./KpiCard";

// Etapa 7 (D16, seção 5.10): o mesmo painel nas duas abas. Cada download passa por prepararExportacao
// (que audita) e é montado aqui, em manipulador de evento. "Baixar tudo" baixa em sequência.

const AVISO_JURADOS = "Este arquivo contém votos identificados. A exportação será registrada na auditoria.";
const INTERVALO_MS = 600;

export function ExportPanel({
  eventoId,
  disponibilidade,
  aoExportar,
}: {
  eventoId: string;
  disponibilidade: DisponibilidadeArquivo[];
  aoExportar?: () => void;
}) {
  const toast = useToast();
  const [baixando, setBaixando] = useState<ArquivoExportacao | "TUDO" | null>(null);
  const [confirmar, setConfirmar] = useState<ArquivoExportacao | "TUDO" | null>(null);
  const disponiveis = disponibilidade.filter((d) => d.disponivel).map((d) => d.id);

  async function baixar(arquivo: ArquivoExportacao): Promise<boolean> {
    const r = await prepararExportacao(eventoId, arquivo);
    if (!r.ok) {
      toast(r.erro.mensagem, "erro");
      return false;
    }
    baixarCsv(r.dados.nome, montarCsv(r.dados.cabecalho, r.dados.linhas));
    return true;
  }

  async function executar(alvo: ArquivoExportacao | "TUDO") {
    setConfirmar(null);
    setBaixando(alvo);
    if (alvo === "TUDO") {
      let ok = 0;
      for (const arquivo of disponiveis) {
        if (await baixar(arquivo)) ok++;
        await new Promise((resolver) => setTimeout(resolver, INTERVALO_MS));
      }
      toast(`${ok} de ${disponiveis.length} arquivos baixados`, ok === disponiveis.length ? "sucesso" : "erro");
    } else if (await baixar(alvo)) {
      toast("Arquivo baixado", "sucesso");
    }
    setBaixando(null);
    aoExportar?.();
  }

  const pedir = (alvo: ArquivoExportacao | "TUDO") => {
    const temJurados = alvo === "jurados" || (alvo === "TUDO" && disponiveis.includes("jurados"));
    if (temJurados) setConfirmar(alvo);
    else void executar(alvo);
  };

  return (
    <Cartao className="flex flex-col gap-4">
      <TituloBloco
        acao={
          disponiveis.length > 1 && (
            <Botao variante="contorno" tamanho="pequeno" icone={<Download aria-hidden className="size-4" />} carregando={baixando === "TUDO"} disabled={baixando !== null} onClick={() => pedir("TUDO")}>
              Baixar tudo
            </Botao>
          )
        }
      >
        Exportar dados
      </TituloBloco>
      {disponiveis.length > 1 && (
        <p className="text-sm text-tema-texto-suave">
          &quot;Baixar tudo&quot; baixa um arquivo por vez; o navegador pode pedir permissão para vários downloads.
        </p>
      )}
      <ul className="flex flex-col divide-y divide-tema-borda">
        {disponibilidade.map((d) => {
          const meta = ARQUIVOS_EXPORTACAO.find((a) => a.id === d.id)!;
          return (
            <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold">{meta.titulo}</p>
                <p className="text-sm text-tema-texto-suave">{meta.descricao}</p>
                {!d.disponivel && d.motivo && (
                  <p className="mt-1 inline-flex items-center gap-1 text-sm text-tema-texto-suave">
                    <Lock aria-hidden className="size-4" /> {d.motivo}
                  </p>
                )}
              </div>
              <Botao
                variante="contorno"
                tamanho="pequeno"
                icone={<Download aria-hidden className="size-4" />}
                disabled={!d.disponivel || baixando !== null}
                carregando={baixando === d.id}
                onClick={() => pedir(d.id)}
                aria-label={`Baixar ${meta.titulo}`}
              >
                Baixar
              </Botao>
            </li>
          );
        })}
      </ul>
      <DialogoConfirmacao
        aberto={confirmar !== null}
        aoFechar={() => setConfirmar(null)}
        aoConfirmar={() => (confirmar ? executar(confirmar) : undefined)}
        titulo={confirmar === "TUDO" ? "Baixar todos os arquivos?" : "Baixar os votos do júri?"}
        consequencia={AVISO_JURADOS}
        rotuloConfirmar="Baixar"
        perigo={false}
      />
    </Cartao>
  );
}
