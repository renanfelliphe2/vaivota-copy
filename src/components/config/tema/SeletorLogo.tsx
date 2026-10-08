"use client";

import { ImageOff, Undo2, Upload } from "lucide-react";
import { useState } from "react";
import { validarArquivoImagem } from "@/dominio/validacoesConfig";
import { LogoEvento } from "@/components/evento/LogoEvento";
import { Botao } from "@/components/ui/Botao";

/** Logo: envio local (`blob:` criado no manipulador), voltar ao salvo ou remover (mostra o nome em texto). */
export function SeletorLogo({
  nome,
  valor,
  salvo,
  disabled,
  aoMudar,
}: {
  nome: string;
  valor: string | null;
  salvo: string | null;
  disabled: boolean;
  aoMudar: (url: string | null) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">Logo</legend>
      <div className="flex min-h-16 items-center rounded-xl border border-tema-borda bg-tema-superficie px-4 py-2">
        <LogoEvento nome={nome} logoUrl={valor} className="h-10" />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-tema-texto-suave px-4 text-sm font-semibold hover:bg-tema-superficie has-focus-visible:outline-3 has-focus-visible:outline-tema-foco has-disabled:pointer-events-none has-disabled:opacity-60">
          <Upload aria-hidden className="size-4" />
          Enviar logo
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
              setErro(problema);
              if (!problema) aoMudar(URL.createObjectURL(arquivo));
            }}
          />
        </label>
        {valor !== salvo && (
          <Botao variante="fantasma" tamanho="pequeno" disabled={disabled} onClick={() => aoMudar(salvo)} icone={<Undo2 aria-hidden className="size-4" />}>
            Voltar ao salvo
          </Botao>
        )}
        {valor && (
          <Botao variante="fantasma" tamanho="pequeno" disabled={disabled} onClick={() => aoMudar(null)} icone={<ImageOff aria-hidden className="size-4" />}>
            Remover logo
          </Botao>
        )}
      </div>
      <p className="text-sm text-tema-texto-suave">PNG, JPG, WebP ou SVG, até 2 MB. Sem logo, o nome aparece em texto.</p>
      {erro && (
        <p role="alert" className="text-sm font-medium text-tema-erro">
          {erro}
        </p>
      )}
    </fieldset>
  );
}
