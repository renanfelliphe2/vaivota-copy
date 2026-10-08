"use client";

import { ImageOff, Upload } from "lucide-react";
import { useId, useState } from "react";
import { validarArquivoImagem } from "@/dominio/validacoesConfig";
import { ImagemCandidato } from "@/components/candidato/ImagemCandidato";
import { Botao } from "@/components/ui/Botao";
import { Select } from "@/components/ui/Campo";
import { cx } from "@/lib/classes";

export type SeletorImagemProps = {
  titulo: string;
  valor: string | null;
  /** Remover só é permitido em rascunho (D12). */
  podeRemover: boolean;
  disabled?: boolean;
  erro?: string | null;
  aoMudar: (url: string | null) => void;
};

/**
 * Etapa 6 (D12): enviar arquivo (`blob:` criado no manipulador), usar um exemplo (`placeholder:1..8`) ou
 * remover. A revogação do `blob:` descartado é de quem guarda o rascunho (nunca o salvo).
 */
export function SeletorImagem({ titulo, valor, podeRemover, disabled, erro, aoMudar }: SeletorImagemProps) {
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const id = useId();
  const mensagem = erroArquivo ?? erro ?? null;
  const exemplo = valor?.startsWith("placeholder:") ? valor : "";

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={mensagem ? `${id}-erro` : undefined}>
      <legend className="text-sm font-semibold">Imagem</legend>
      <div className="w-48 overflow-hidden rounded-xl border border-tema-borda">
        <ImagemCandidato titulo={titulo || "Sem título"} imagemUrl={valor} />
      </div>
      {!valor && <p className="text-sm font-medium text-tema-aviso">Sem imagem: obrigatória para colocar na votação.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cx(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold hover:bg-tema-superficie has-focus-visible:outline-3 has-focus-visible:outline-tema-foco",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <Upload aria-hidden className="size-4" />
          Enviar arquivo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={disabled}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (!arquivo) return;
              const problema = validarArquivoImagem(arquivo);
              setErroArquivo(problema);
              if (!problema) aoMudar(URL.createObjectURL(arquivo));
            }}
          />
        </label>
        <Select
          aria-label="Usar uma imagem de exemplo"
          className="w-auto"
          value={exemplo}
          disabled={disabled}
          onChange={(e) => {
            setErroArquivo(null);
            if (e.target.value) aoMudar(e.target.value);
          }}
        >
          <option value="">Usar exemplo…</option>
          {Array.from({ length: 8 }, (_, i) => (
            <option key={i} value={`placeholder:${i + 1}`}>
              Exemplo {i + 1}
            </option>
          ))}
        </Select>
        {podeRemover && valor && (
          <Botao variante="fantasma" tamanho="pequeno" disabled={disabled} onClick={() => aoMudar(null)} icone={<ImageOff aria-hidden className="size-4" />}>
            Remover imagem
          </Botao>
        )}
      </div>
      <p className="text-sm text-tema-texto-suave">PNG, JPG, WebP ou SVG, até 2 MB. O arquivo fica só nesta aba (protótipo).</p>
      {mensagem && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-tema-erro">
          {mensagem}
        </p>
      )}
    </fieldset>
  );
}
