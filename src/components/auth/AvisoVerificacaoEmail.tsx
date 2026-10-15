"use client";

import { CircleCheck, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { useAnunciar } from "@/components/a11y/LiveRegion";
import { Alerta } from "@/components/ui/Alerta";
import { Botao } from "@/components/ui/Botao";
import { Campo, Input } from "@/components/ui/Campo";
import { Cartao } from "@/components/ui/Cartao";
import { Carregando } from "@/components/ui/Carregando";
import { ContagemRegressiva } from "@/components/ui/ContagemRegressiva";
import { ehRotaInterna } from "@/dominio/acesso";
import { limparCodigoLogin, validarCodigoLogin } from "@/lib/validarAcesso";
import { confirmarCodigo, descartarLoginPendente, reenviarCodigo } from "@/servicos/auth";
import { sair } from "@/servicos/sessao";
import { useUi } from "@/store/seletores/dev";
import { useEventoAtivo } from "@/store/seletores/evento";
import { useAgora } from "@/store/seletores/relogio";
import { useSessao } from "@/store/seletores/sessao";

/**
 * Confirmação do e-mail por código (ST1): quem acabou de criar a conta (ou tentou entrar sem ter confirmado) digita o
 * código de 6 números enviado por e-mail; ao acertar, a sessão abre. O e-mail vem de `ui.loginPendente`. Sem e-mail
 * pendente, volta à entrada; logado e verificado vai para o `?de=` interno ou para a entrada.
 */
export function AvisoVerificacaoEmail({ de }: { de?: string }) {
  const ativo = useEventoAtivo();
  const sessao = useSessao();
  const ui = useUi();
  const agora = useAgora();
  const router = useRouter();
  const anunciar = useAnunciar();
  const id = useId();
  const [codigo, setCodigo] = useState("");
  const [erroCampo, setErroCampo] = useState<string | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [concluido, setConcluido] = useState<string | null>(null);

  const slug = ativo?.slug ?? "";
  const pendente = ui.loginPendente && ui.loginPendente.eventoId === ativo?.evento.id && ui.loginPendente.tipo !== "recuperacao" ? ui.loginPendente : null;
  const email = pendente?.email ?? (sessao.logado && !sessao.emailVerificado ? sessao.usuario!.email : null);
  const destinoDe = de;
  const ocupado = enviando || concluido !== null;
  const redirecionar = ocupado
    ? null
    : sessao.logado && sessao.emailVerificado
      ? ehRotaInterna(destinoDe)
        ? destinoDe
        : `/e/${slug}`
      : !email
        ? `/e/${slug}`
        : null;

  useEffect(() => {
    if (redirecionar) router.replace(redirecionar);
  }, [redirecionar, router]);

  if (!ativo) return null;
  if (redirecionar) return <Carregando texto="Redirecionando…" className="justify-center py-12" />;

  if (concluido) {
    return (
      <Cartao className="flex flex-col items-start gap-4">
        <CircleCheck aria-hidden className="size-10 text-tema-sucesso" />
        <h1 className="text-2xl font-bold">Conta confirmada!</h1>
        <p className="text-tema-texto-suave">Seu e-mail foi verificado e você já está conectado.</p>
        <Botao href={concluido}>Continuar</Botao>
      </Cartao>
    );
  }

  const bloqueio = ui.bloqueioLoginCodigo;
  const bloqueado = bloqueio.ateMs !== null && bloqueio.ateMs > agora;
  const cooldown = ui.reenvioVerificacaoAteMs !== null && ui.reenvioVerificacaoAteMs > agora;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || bloqueado) return;
    const erro = validarCodigoLogin(codigo);
    setErroCampo(erro);
    setErroGeral(null);
    if (erro) return;
    setEnviando(true);
    const r = await confirmarCodigo(ativo.evento.id, codigo, destinoDe);
    if (!r.ok) {
      setEnviando(false);
      if (r.erro.campos?.codigo) setErroCampo(r.erro.campos.codigo);
      else if (r.erro.codigo === "CREDENCIAIS_INVALIDAS" || r.erro.codigo === "LIMITE_TENTATIVAS") setErroCampo(r.erro.mensagem);
      else setErroGeral(r.erro.mensagem);
      return;
    }
    if (r.dados.contaConfirmada) {
      setConcluido(r.dados.destino);
      anunciar("Conta confirmada.");
      return;
    }
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

  const usarOutroEmail = async () => {
    setEnviando(true); // evita o redirecionamento automático enquanto sai
    descartarLoginPendente();
    if (sessao.logado) await sair();
    router.push(`/e/${slug}?acesso=entrar${ehRotaInterna(destinoDe) ? `&de=${encodeURIComponent(destinoDe)}` : ""}`);
  };

  return (
    <Cartao className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <MailCheck aria-hidden className="size-9 text-tema-primaria-texto" />
        <h1 className="text-2xl font-bold">Confirme seu e-mail</h1>
        <p className="text-tema-texto-suave">
          Digite o código enviado para <strong className="break-all text-tema-texto">{email}</strong>.
        </p>
      </div>
      {erroGeral && <Alerta variante="erro">{erroGeral}</Alerta>}
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <Campo
          id={`${id}-codigo`}
          rotulo="Código de 6 números"
          erro={bloqueado ? null : erroCampo}
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
        <Botao type="submit" larguraTotal carregando={enviando} disabled={bloqueado}>
          Confirmar
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
        <Botao variante="fantasma" tamanho="pequeno" onClick={() => void usarOutroEmail()}>
          Usar outro e-mail
        </Botao>
      </div>
    </Cartao>
  );
}
