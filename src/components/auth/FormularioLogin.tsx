"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { validarEmail } from "@/lib/validarAcesso";
import { entrar } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BotaoGoogle } from "./BotaoGoogle";

/** Login sem senha (rev. 4, A5): e-mail → "Enviar código" → tela de código, ou Google. */
export function FormularioLogin({ de, aoConcluir }: { de?: string; aoConcluir?: () => void }) {
  const ativo = useEventoAtivo();
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!ativo) return null;
  const metodo = ativo.evento.metodoIdentificacao;
  const comEmail = metodo !== "SOMENTE_GOOGLE";
  const comGoogle = metodo !== "SOMENTE_EMAIL";

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const erro = validarEmail(email);
    setErroEmail(erro);
    setErroGeral(null);
    if (erro) return;
    setEnviando(true);
    const r = await entrar(ativo.evento.id, email, de);
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.campos?.email) setErroEmail(r.erro.campos.email);
      else setErroGeral(r.erro.mensagem);
      return;
    }
    aoConcluir?.();
    router.push(r.dados.destino);
  };

  return (
    <div className="flex flex-col gap-4">
      {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
      {comEmail && (
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <Campo id={`${id}-email`} rotulo="E-mail" erro={erroEmail} dica="Enviaremos um código de 6 números para entrar.">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && setErroEmail(validarEmail(email))}
            />
          </Campo>
          <Botao type="submit" larguraTotal carregando={enviando}>
            Enviar código
          </Botao>
        </form>
      )}
      {comEmail && comGoogle && (
        <div className="flex items-center gap-3 text-sm text-tema-texto-suave" aria-hidden>
          <span className="h-px flex-1 bg-tema-borda" />
          ou
          <span className="h-px flex-1 bg-tema-borda" />
        </div>
      )}
      {comGoogle && <BotaoGoogle de={de} aoConcluir={aoConcluir} />}
    </div>
  );
}
