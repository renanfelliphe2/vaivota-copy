"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { rotaRecuperarSenha } from "@/dominio/destinoAcesso";
import { validarEmail } from "@/lib/validarAcesso";
import { entrar } from "@/servicos/auth";
import { useEventoAtivo } from "@/store/seletores/evento";
import { BotaoGoogle } from "./BotaoGoogle";
import { CampoSenha } from "./CampoSenha";

/** Login por e-mail e senha, ou Google (08/10/2026). "Esqueci minha senha" leva à recuperação por código. */
export function FormularioLogin({ de, aoConcluir }: { de?: string; aoConcluir?: () => void }) {
  const ativo = useEventoAtivo();
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroEmail, setErroEmail] = useState<string | null>(null);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!ativo) return null;
  const metodo = ativo.evento.metodoIdentificacao;
  const comEmail = metodo !== "SOMENTE_GOOGLE";
  const comGoogle = metodo !== "SOMENTE_EMAIL";

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const erroE = validarEmail(email);
    const erroS = senha ? null : "Informe a senha.";
    setErroEmail(erroE);
    setErroSenha(erroS);
    setErroGeral(null);
    if (erroE || erroS) return;
    setEnviando(true);
    const r = await entrar(ativo.evento.id, email, senha, de);
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.campos?.email || r.erro.campos?.senha) {
        setErroEmail(r.erro.campos.email ?? null);
        setErroSenha(r.erro.campos.senha ?? null);
      } else setErroGeral(r.erro.mensagem);
      setSenha("");
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
          <Campo id={`${id}-email`} rotulo="E-mail" erro={erroEmail}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && setErroEmail(validarEmail(email))}
            />
          </Campo>
          <div className="flex flex-col gap-1">
            <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} erro={erroSenha} autoComplete="current-password" />
            <Link
              href={rotaRecuperarSenha(ativo.slug, de)}
              onClick={() => aoConcluir?.()}
              className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-tema-primaria-texto underline underline-offset-2 hover:no-underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <Botao type="submit" larguraTotal carregando={enviando}>
            Entrar
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
