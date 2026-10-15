"use client";

import { ImageOff, Upload } from "lucide-react";
import { useId, useState } from "react";
import { validarArquivoImagem } from "@/dominio/validacoesConfig";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Botao } from "@/components/ui/Botao";
import { cx } from "@/lib/classes";
import { enviarImagemCandidato } from "@/servicos/candidatosAdmin";
import { useEventoAtivo } from "@/store/seletores/evento";

export type SeletorImagemProps = {
  titulo: string;
  valor: string | null;
  /** Remover só é permitido em rascunho (a imagem é obrigatória na votação). */
  podeRemover: boolean;
  disabled?: boolean;
  erro?: string | null;
  aoMudar: (url: string | null) => void;
};

/**
 * ST2: envia o arquivo ao servidor assim que é escolhido (PNG, JPG ou WebP, até 2 MB; o servidor confere tipo e tamanho
 * de novo, pelo conteúdo) e guarda a URL pública que voltou. Mostra a prévia da imagem já enviada.
 */
export function SeletorImagem({ titulo, valor, podeRemover, disabled, erro, aoMudar }: SeletorImagemProps) {
  const ativo = useEventoAtivo();
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const id = useId();
  const mensagem = erroArquivo ?? erro ?? null;

  async function enviar(arquivo: File) {
    if (!ativo) return;
    const problema = validarArquivoImagem(arquivo);
    setErroArquivo(problema);
    if (problema) return;
    setEnviando(true);
    const r = await enviarImagemCandidato(ativo.evento.id, arquivo);
    setEnviando(false);
    if (!r.ok) {
      setErroArquivo(r.erro.campos?.imagemUrl ?? r.erro.mensagem);
      return;
    }
    aoMudar(r.dados.url);
  }

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={mensagem ? `${id}-erro` : undefined} aria-busy={enviando || undefined}>
      <legend className="text-sm font-semibold">Imagem</legend>
      <div className="w-48 overflow-hidden rounded-xl border border-tema-borda">
        <ImagemCandidato titulo={titulo || "Sem título"} imagemUrl={valor} />
      </div>
      {!valor && <p className="text-sm font-medium text-tema-aviso">Sem imagem: obrigatória para colocar na votação.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold hover:bg-tema-superficie has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
            (disabled || enviando) && "pointer-events-none opacity-60",
          )}
        >
          <Upload aria-hidden className="size-4" />
          {enviando ? "Enviando…" : valor ? "Trocar imagem" : "Enviar imagem"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled || enviando}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) void enviar(arquivo);
            }}
          />
        </label>
        {podeRemover && valor && (
          <Botao variante="fantasma" tamanho="pequeno" disabled={disabled || enviando} onClick={() => aoMudar(null)} icone={<ImageOff aria-hidden className="size-4" />}>
            Remover imagem
          </Botao>
        )}
      </div>
      <p className="text-sm text-tema-texto-suave">PNG, JPG ou WebP, até 2 MB. Use uma imagem horizontal (proporção 4:3).</p>
      {mensagem && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-tema-erro">
          {mensagem}
        </p>
      )}
    </fieldset>
  );
}
