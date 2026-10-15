"use client";

import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { entrarComGoogle } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";

export type BotaoGoogleProps = {
  de?: string;
  desabilitado?: boolean;
  /** id do texto que explica o desabilitado (aria-describedby). */
  dicaId?: string;
  aoConcluir?: () => void;
};

function MarcaG() {
  return (
    <span aria-hidden className="inline-flex size-5 items-center justify-center rounded-full border border-current text-xs font-bold">
      G
    </span>
  );
}

/**
 * Entrar com Google (Better Auth): pede o endereço do consentimento e leva o navegador até lá. A volta cai em
 * /e/[slug]/continuar, que cria a participação e segue para o destino certo.
 */
export function BotaoGoogle({ de, desabilitado, dicaId, aoConcluir }: BotaoGoogleProps) {
  const ativo = useEventoAtivo();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const entrar = async () => {
    if (!ativo || enviando) return;
    setEnviando(true);
    setErro(null);
    const r = await entrarComGoogle(ativo.evento.id, de);
    if (!r.ok) {
      setEnviando(false);
      setErro(r.erro.mensagem);
      return;
    }
    aoConcluir?.();
    // Navegação completa (saída para o Google): o estado do navegador é refeito na volta.
    window.location.assign(r.dados.url);
  };

  return (
    <div className="flex flex-col gap-2">
      {erro && <Alerta variante="erro">{erro}</Alerta>}
      <Botao
        variante="contorno"
        larguraTotal
        icone={<MarcaG />}
        disabled={desabilitado}
        carregando={enviando}
        aria-describedby={dicaId}
        onClick={() => void entrar()}
      >
        Entrar com Google
      </Botao>
    </div>
  );
}
