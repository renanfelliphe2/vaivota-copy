"use client";

import { KeyRound, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Cartao } from "@/components/ui/Cartao";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { ehRotaInterna } from "@/dominio/acesso";
import {
  CODIGO_LOGIN_PROTOTIPO,
  SENHA_MIN,
  limparCodigoLogin,
  validarCodigoLogin,
  validarConfirmacaoSenha,
  validarEmail,
  validarSenha,
} from "@/lib/validarAcesso";
import { descartarLoginPendente, reenviarCodigo, redefinirSenha, solicitarRecuperacao } from "@/servicos/auth";
import { useUi } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { CampoSenha } from "./CampoSenha";

type Erros = Partial<Record<"codigo" | "senha" | "confirmacaoSenha", string>>;

/**
 * "Esqueci minha senha" (08/10/2026): passo 1 pede o e-mail e "envia" o código; passo 2 pede o código e a
 * senha nova e já entra. O passo vem de `ui.loginPendente` deste evento (sobrevive à navegação, não ao F5).
 */
export function RecuperarSenha({ de }: { de?: string }) {
  const ativo = useEventoAtivo();
  const ui = useUi();
  const pendente = ui.loginPendente && ui.loginPendente.eventoId === ativo?.evento.id ? ui.loginPendente : null;
  if (!ativo) return null;
  return pendente ? <PassoCodigo email={pendente.email} de={de ?? pendente.de} /> : <PassoEmail de={de} />;
}

function PassoEmail({ de }: { de?: string }) {
  const ativo = useEventoAtivo()!;
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const voltar = `/e/${ativo.slug}?acesso=entrar${ehRotaInterna(de) ? `&de=${encodeURIComponent(de)}` : ""}`;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const erroEmail = validarEmail(email);
    setErro(erroEmail);
    setErroGeral(null);
    if (erroEmail) return;
    setEnviando(true);
    const r = await solicitarRecuperacao(ativo.evento.id, email, de);
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.campos?.email) setErro(r.erro.campos.email);
      else setErroGeral(r.erro.mensagem);
    }
    // Com sucesso, `ui.loginPendente` muda e o componente mostra o passo do código.
  };

  return (
    <Cartao className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <KeyRound aria-hidden className="size-9 text-tema-primaria-texto" />
        <h1 className="text-2xl font-bold">Esqueci minha senha</h1>
        <p className="text-tema-texto-suave">Informe o e-mail da sua conta. Enviaremos um código de 6 números para você criar uma senha nova.</p>
      </div>
      {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo id={`${id}-email`} rotulo="E-mail" erro={erro}>
          <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Campo>
        <Botao type="submit" larguraTotal carregando={enviando}>
          Enviar código
        </Botao>
      </form>
      <Botao variante="fantasma" tamanho="pequeno" className="self-start" onClick={() => router.push(voltar)}>
        Voltar para entrar
      </Botao>
    </Cartao>
  );
}

function PassoCodigo({ email, de }: { email: string; de?: string }) {
  const ativo = useEventoAtivo()!;
  const ui = useUi();
  const agora = useAgora();
  const router = useRouter();
  const anunciar = useAnunciar();
  const id = useId();
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const bloqueio = ui.bloqueioLoginCodigo;
  const bloqueado = bloqueio.ateMs !== null && bloqueio.ateMs > agora;
  const cooldown = ui.reenvioVerificacaoAteMs !== null && ui.reenvioVerificacaoAteMs > agora;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || bloqueado) return;
    const novos: Erros = {};
    const c = validarCodigoLogin(codigo);
    const s = validarSenha(senha);
    const r2 = s ? null : validarConfirmacaoSenha(senha, confirmacaoSenha);
    if (c) novos.codigo = c;
    if (s) novos.senha = s;
    if (r2) novos.confirmacaoSenha = r2;
    setErros(novos);
    setErroGeral(null);
    if (Object.keys(novos).length > 0) return;
    setEnviando(true);
    const r = await redefinirSenha(ativo.evento.id, { codigo, senha, confirmacaoSenha, de });
    if (!r.ok) {
      setEnviando(false);
      if (r.erro.campos) setErros(r.erro.campos as Erros);
      else if (r.erro.codigo === "CREDENCIAIS_INVALIDAS" || r.erro.codigo === "LIMITE_TENTATIVAS") setErros({ codigo: r.erro.mensagem });
      else setErroGeral(r.erro.mensagem);
      return;
    }
    anunciar("Senha alterada. Você já está conectado.");
    router.push(r.dados.destino);
  };

  const reenviar = async () => {
    setReenviando(true);
    setErroGeral(null);
    const r = await reenviarCodigo(ativo.evento.id);
    setReenviando(false);
    if (r.ok) anunciar("Enviamos um novo código.");
    else setErroGeral(r.erro.mensagem);
  };

  return (
    <Cartao className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <MailCheck aria-hidden className="size-9 text-tema-primaria-texto" />
        <h1 className="text-2xl font-bold">Crie uma senha nova</h1>
        <p className="text-tema-texto-suave">
          Digite o código enviado para <strong className="break-all text-tema-texto">{email}</strong> e escolha a senha nova.
        </p>
      </div>
      <Alerta variante="informacao" titulo="Protótipo" role={null}>
        Protótipo: use {CODIGO_LOGIN_PROTOTIPO}
      </Alerta>
      {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo
          id={`${id}-codigo`}
          rotulo="Código de 6 números"
          erro={bloqueado ? null : erros.codigo}
          dica={
            bloqueado ? (
              <span>
                Muitas tentativas. Tente novamente em{" "}
                <ContagemRegressiva alvoMs={bloqueio.ateMs!} rotulo="Liberado em" textoZerado="instantes" />.
              </span>
            ) : undefined
          }
        >
          <Input
            value={codigo}
            onChange={(e) => setCodigo(limparCodigoLogin(e.target.value))}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            disabled={bloqueado}
            className="font-mono text-xl tracking-[0.4em]"
          />
        </Campo>
        <CampoSenha
          id={`${id}-senha`}
          rotulo="Senha nova"
          valor={senha}
          aoMudar={setSenha}
          erro={erros.senha}
          dica={`Pelo menos ${SENHA_MIN} caracteres.`}
          autoComplete="new-password"
        />
        <CampoSenha
          id={`${id}-confirmacao`}
          rotulo="Repita a senha nova"
          valor={confirmacaoSenha}
          aoMudar={setConfirmacaoSenha}
          erro={erros.confirmacaoSenha}
          autoComplete="new-password"
        />
        <Botao type="submit" larguraTotal carregando={enviando} disabled={bloqueado}>
          Salvar senha e entrar
        </Botao>
      </form>
      <div className="flex flex-col gap-2 border-t border-tema-borda pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2" aria-live="polite">
          <Botao variante="fantasma" tamanho="pequeno" onClick={() => void reenviar()} disabled={cooldown} carregando={reenviando}>
            Reenviar código
          </Botao>
          {cooldown && (
            <span className="text-sm text-tema-texto-suave">
              em{" "}
              <ContagemRegressiva alvoMs={ui.reenvioVerificacaoAteMs!} rotulo="Reenvio liberado em" textoZerado="instantes" />
            </span>
          )}
        </div>
        <Botao variante="fantasma" tamanho="pequeno" onClick={() => descartarLoginPendente()}>
          Usar outro e-mail
        </Botao>
      </div>
    </Cartao>
  );
}
