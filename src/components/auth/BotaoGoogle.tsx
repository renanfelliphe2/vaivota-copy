"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { entrarComGoogle, listarContasGoogle } from "@/servicos/auth";
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

/** Google fake (D8): seletor com três contas, todas com e-mail verificado. */
export function BotaoGoogle({ de, desabilitado, dicaId, aoConcluir }: BotaoGoogleProps) {
  const ativo = useEventoAtivo();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const contas = listarContasGoogle();

  const escolher = async (contaId: string) => {
    if (!ativo || enviando) return;
    setEnviando(contaId);
    setErro(null);
    const r = await entrarComGoogle(ativo.evento.id, contaId, de);
    setEnviando(null);
    if (!r.ok) {
      setErro(r.erro.mensagem);
      return;
    }
    setAberto(false);
    aoConcluir?.();
    router.push(r.dados.destino);
  };

  return (
    <>
      <Botao
        variante="contorno"
        larguraTotal
        icone={<MarcaG />}
        disabled={desabilitado}
        aria-describedby={dicaId}
        onClick={() => setAberto(true)}
      >
        Entrar com Google
      </Botao>
      <Dialogo
        aberto={aberto}
        aoFechar={() => !enviando && setAberto(false)}
        titulo="Escolha uma conta"
        descricao="Protótipo: seletor de conta do Google simulado."
      >
        <div className="flex flex-col gap-3">
          {erro && <Alerta variante="erro">{erro}</Alerta>}
          <ul className="flex flex-col gap-2">
            {contas.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void escolher(c.id)}
                  disabled={enviando !== null}
                  aria-busy={enviando === c.id || undefined}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-tema-borda px-4 py-2 text-left hover:bg-tema-superficie disabled:opacity-60"
                >
                  <span
                    aria-hidden
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-tema-primaria font-bold text-tema-sobre-primaria"
                  >
                    {c.nome.charAt(0)}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-semibold">{c.nome}</span>
                    <span className="text-sm text-tema-texto-suave">{c.email}</span>
                  </span>
                  {enviando === c.id && <span className="ml-auto text-sm text-tema-texto-suave">Entrando…</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Dialogo>
    </>
  );
}
